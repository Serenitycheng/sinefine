begin;
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
commit;
