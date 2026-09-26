-- SINE FINE development setup
-- Target: Sinefine-recovery (yxcslznzesgunsxpetrf)
-- Generated from the two repository migrations below; run in the development project SQL Editor.
-- Runs as one transaction. Existing records are not deleted.
-- No API keys or database passwords belong in this file.
begin;

-- Source: migrations/202609070001_cloud_connections.sql
create table if not exists public.fate_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9_]{3,32}$'),
  recovery_hash text not null check (length(recovery_hash) = 64),
  created_at timestamptz not null default now()
);
create table if not exists public.fate_connections (
  user_id uuid primary key references public.fate_accounts(user_id) on delete cascade,
  encrypted_key text not null check (length(encrypted_key) between 20 and 1024),
  model text not null check (model ~ '^[a-zA-Z0-9._:/-]{1,100}$'),
  updated_at timestamptz not null default now()
);
create table if not exists public.fate_request_limits (
  scope text not null,
  identity_hash text not null,
  bucket bigint not null,
  count integer not null,
  expires_at timestamptz not null,
  primary key (scope, identity_hash, bucket)
);
alter table public.fate_accounts enable row level security;
alter table public.fate_connections enable row level security;
alter table public.fate_request_limits enable row level security;
revoke all on public.fate_accounts, public.fate_connections, public.fate_request_limits from anon, authenticated;
grant select, insert, update, delete on public.fate_accounts, public.fate_connections, public.fate_request_limits to service_role;
-- No browser role can retrieve even encrypted credentials. The application verifies
-- the Supabase session, then the server restricts every operation to that user ID.
create or replace function public.fate_take_quota(p_scope text, p_identity text, p_seconds integer, p_limit integer)
returns boolean language plpgsql security invoker set search_path = public as $$
declare current_bucket bigint; total integer;
begin
  if p_seconds < 1 or p_limit < 1 then return false; end if;
  current_bucket := floor(extract(epoch from now()) / p_seconds);
  delete from public.fate_request_limits where expires_at < now() - interval '1 day';
  insert into public.fate_request_limits(scope, identity_hash, bucket, count, expires_at)
  values(p_scope, p_identity, current_bucket, 1, to_timestamp((current_bucket + 1) * p_seconds))
  on conflict(scope, identity_hash, bucket) do update set count = fate_request_limits.count + 1
  returning count into total;
  return total <= p_limit;
end;
$$;
revoke all on function public.fate_take_quota(text,text,integer,integer) from public, anon, authenticated;
grant execute on function public.fate_take_quota(text,text,integer,integer) to service_role;

-- Source: migrations/202609260001_game_saves.sql
create table if not exists public.fate_game_saves (
  user_id uuid primary key references public.fate_accounts(user_id) on delete cascade,
  backup jsonb not null check ((
    jsonb_typeof(backup) = 'object'
    and backup ->> 'format' = 'sine-fine/fate-backup'
    and backup ->> 'version' = '1'
    and jsonb_typeof(backup -> 'save') = 'object'
    -- The API caps the actual request at 5 MiB. JSONB adds whitespace when cast
    -- to text, so this storage defense allows normalization overhead.
    and octet_length(backup::text) <= 8388608
  ) is true),
  revision integer not null default 1 check (revision >= 1),
  updated_at timestamptz not null default clock_timestamp()
);

alter table public.fate_game_saves enable row level security;
revoke all on public.fate_game_saves from public, anon, authenticated;
grant select, insert, update, delete on public.fate_game_saves to service_role;

-- Only the server role can call this function. The application derives p_user_id
-- from cloudIdentity(), never from request data. A null expected revision means
-- "create only if empty"; all later writes compare the exact reviewed revision.
create or replace function public.fate_write_game_save(
  p_user_id uuid,
  p_expected_revision integer,
  p_backup jsonb
)
returns table (backup jsonb, revision integer, updated_at timestamptz)
language plpgsql security invoker set search_path = public as $$
begin
  if p_expected_revision is null then
    return query
      insert into public.fate_game_saves(user_id, backup, revision, updated_at)
      values(p_user_id, p_backup, 1, clock_timestamp())
      on conflict(user_id) do nothing
      returning fate_game_saves.backup, fate_game_saves.revision, fate_game_saves.updated_at;
  elsif p_expected_revision >= 1 then
    return query
      update public.fate_game_saves as saved
      set backup = p_backup, revision = saved.revision + 1, updated_at = clock_timestamp()
      where saved.user_id = p_user_id and saved.revision = p_expected_revision
      returning saved.backup, saved.revision, saved.updated_at;
  end if;
end;
$$;

revoke all on function public.fate_write_game_save(uuid,integer,jsonb) from public, anon, authenticated;
grant execute on function public.fate_write_game_save(uuid,integer,jsonb) to service_role;

commit;

select table_name from information_schema.tables
where table_schema = 'public'
  and table_name in ('fate_accounts', 'fate_connections', 'fate_request_limits', 'fate_game_saves')
order by table_name;
