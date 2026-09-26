begin;

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
