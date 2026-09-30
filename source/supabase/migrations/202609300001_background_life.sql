begin;

create table if not exists public.fate_background_sessions (
  user_id uuid primary key references public.fate_accounts(user_id) on delete cascade,
  enabled boolean not null default false,
  revision integer not null default 1 check (revision > 0),
  backup jsonb not null check ((jsonb_typeof(backup) = 'object' and backup->>'format' = 'sine-fine/fate-backup' and backup->>'version' = '1' and octet_length(backup::text) <= 8388608) is true),
  origin text not null check (origin ~ '^[a-f0-9]{64}$'),
  updated_at timestamptz not null default clock_timestamp(),
  next_run_at timestamptz not null default clock_timestamp() + interval '30 minutes',
  budget_day date not null default (clock_timestamp() at time zone 'Asia/Shanghai')::date,
  spent_micros bigint not null default 0 check (spent_micros between 0 and 5000000),
  tokens bigint not null default 0 check (tokens >= 0),
  rounds integer not null default 0 check (rounds >= 0),
  notice text not null default '' check (length(notice) <= 300),
  lease uuid,
  lease_until timestamptz,
  reserved_micros bigint not null default 0 check (reserved_micros between 0 and 5000000)
);
create index if not exists fate_background_due on public.fate_background_sessions(next_run_at) where enabled;
alter table public.fate_background_sessions enable row level security;
revoke all on public.fate_background_sessions from public, anon, authenticated;
grant select, insert, update, delete on public.fate_background_sessions to service_role;

-- Return a boolean only: never expose Vault values or the cron command. The
-- owner checks a schema that service_role cannot normally read directly.
create or replace function public.fate_background_ready()
returns boolean language plpgsql security definer set search_path = pg_catalog, public as $$
declare ready boolean;
begin
  if to_regclass('cron.job') is null then return false; end if;
  execute 'select exists(select 1 from cron.job where jobname = ''sinefine-background-life'' and active)' into ready;
  return ready;
end;
$$;
revoke all on function public.fate_background_ready() from public, anon, authenticated;
grant execute on function public.fate_background_ready() to service_role;

-- Settings use the revision read by the authenticated device. Restarting never
-- clears spending; disabling invalidates an in-flight worker's ability to save.
create or replace function public.fate_configure_background(p_user_id uuid, p_expected integer, p_enabled boolean, p_backup jsonb, p_origin text)
returns setof public.fate_background_sessions
language plpgsql security invoker set search_path = public as $$
begin
  if p_expected is null and p_enabled then
    return query insert into public.fate_background_sessions(user_id, enabled, backup, origin)
      values(p_user_id, true, p_backup, p_origin) on conflict(user_id) do nothing returning *;
  elsif p_expected >= 1 then
    return query update public.fate_background_sessions as s
      set enabled = p_enabled,
          backup = case when p_enabled then p_backup else s.backup end,
          origin = case when p_enabled then p_origin else s.origin end,
          revision = s.revision + 1, updated_at = clock_timestamp(),
          next_run_at = case when p_enabled then clock_timestamp() + interval '30 minutes' else s.next_run_at end,
          notice = case when p_enabled then '' else s.notice end,
          lease = null, lease_until = null, reserved_micros = 0
      where s.user_id = p_user_id and s.revision = p_expected
        and (not p_enabled or not s.enabled)
      returning s.*;
  end if;
end;
$$;

-- SKIP LOCKED and a durable lease make repeated/overlapping timer delivery safe.
create or replace function public.fate_claim_background()
returns setof public.fate_background_sessions
language sql security invoker set search_path = public as $$
  update public.fate_background_sessions as s
  set lease = gen_random_uuid(), lease_until = clock_timestamp() + interval '2 minutes',
      next_run_at = clock_timestamp() + interval '30 minutes', reserved_micros = 0
  where s.user_id = (
    select q.user_id from public.fate_background_sessions q
    where q.enabled and q.next_run_at <= clock_timestamp()
      and (q.lease_until is null or q.lease_until < clock_timestamp())
    order by q.next_run_at for update skip locked limit 1
  ) returning s.*;
$$;

-- Debit before sending any billable HTTP request. Uncertain failures keep the
-- reservation, even across restarts, disconnects, or lost worker leases.
create or replace function public.fate_reserve_background(p_user_id uuid, p_lease uuid, p_amount bigint)
returns boolean
language plpgsql security invoker set search_path = public as $$
declare s public.fate_background_sessions; today date := (clock_timestamp() at time zone 'Asia/Shanghai')::date;
begin
  if p_amount <= 0 or p_amount > 5000000 then return false; end if;
  select * into s from public.fate_background_sessions where user_id = p_user_id for update;
  if not found or not s.enabled or p_lease is null or s.lease_until is null or s.lease is distinct from p_lease or s.lease_until < clock_timestamp() or s.reserved_micros > 0 then return false; end if;
  if s.budget_day <> today then
    update public.fate_background_sessions set budget_day = today, spent_micros = 0 where user_id = p_user_id;
    s.spent_micros := 0;
  end if;
  if s.spent_micros + p_amount > 5000000 then return false; end if;
  update public.fate_background_sessions set spent_micros = s.spent_micros + p_amount, reserved_micros = p_amount where user_id = p_user_id;
  return true;
end;
$$;

create or replace function public.fate_finish_background(p_user_id uuid, p_lease uuid, p_backup jsonb, p_cost bigint, p_tokens bigint, p_notice text, p_budget boolean)
returns boolean
language plpgsql security invoker set search_path = public as $$
declare s public.fate_background_sessions;
begin
  select * into s from public.fate_background_sessions where user_id = p_user_id for update;
  if not found or not s.enabled or p_lease is null or s.lease_until is null or s.lease is distinct from p_lease or s.lease_until < clock_timestamp() then return false; end if;
  if p_cost < 0 or p_cost > s.reserved_micros or p_tokens < 0 or length(p_notice) > 300 then return false; end if;
  update public.fate_background_sessions
    set backup = coalesce(p_backup, s.backup), revision = s.revision + 1,
        updated_at = clock_timestamp(),
        spent_micros = s.spent_micros - s.reserved_micros + p_cost,
        tokens = s.tokens + p_tokens, rounds = s.rounds + case when p_backup is null then 0 else 1 end,
        enabled = p_notice = '' or p_budget,
        notice = p_notice,
        next_run_at = case when p_budget then (((clock_timestamp() at time zone 'Asia/Shanghai')::date + 1)::timestamp at time zone 'Asia/Shanghai') else s.next_run_at end,
        lease = null, lease_until = null, reserved_micros = 0
    where user_id = p_user_id;
  return true;
end;
$$;

revoke all on function public.fate_configure_background(uuid,integer,boolean,jsonb,text) from public, anon, authenticated;
revoke all on function public.fate_claim_background() from public, anon, authenticated;
revoke all on function public.fate_reserve_background(uuid,uuid,bigint) from public, anon, authenticated;
revoke all on function public.fate_finish_background(uuid,uuid,jsonb,bigint,bigint,text,boolean) from public, anon, authenticated;
grant execute on function public.fate_configure_background(uuid,integer,boolean,jsonb,text) to service_role;
grant execute on function public.fate_claim_background() to service_role;
grant execute on function public.fate_reserve_background(uuid,uuid,bigint) to service_role;
grant execute on function public.fate_finish_background(uuid,uuid,jsonb,bigint,bigint,text,boolean) to service_role;

commit;
