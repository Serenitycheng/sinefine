-- Run AFTER migrations/202609300001_background_life.sql.
-- First store two secrets in Supabase Vault (Dashboard > Integrations > Vault):
--   sinefine_app_url         https://YOUR-PRODUCTION-DOMAIN
--   sinefine_background_key  same value as Vercel FATE_BACKGROUND_CRON_SECRET
-- Do not put a DeepSeek key or service-role key in this schedule.
create extension if not exists pg_cron;
create extension if not exists pg_net;

do $$
begin
  if not exists(select 1 from vault.decrypted_secrets where name = 'sinefine_app_url')
    or not exists(select 1 from vault.decrypted_secrets where name = 'sinefine_background_key' and length(decrypted_secret) >= 32)
    then raise exception 'Create the two required Vault secrets first'; end if;
  perform cron.unschedule(jobid) from cron.job where jobname = 'sinefine-background-life';
end;
$$;

-- The lightweight SQL clock checks every minute; a user's life advances only
-- every 30 minutes. No HTTP request is made when no enabled world is due.
select cron.schedule('sinefine-background-life', '* * * * *', $job$
  select net.http_post(
    url := rtrim((select decrypted_secret from vault.decrypted_secrets where name = 'sinefine_app_url' limit 1), '/') || '/api/fate/background/tick',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'sinefine_background_key' limit 1)),
    body := '{}'::jsonb,
    timeout_milliseconds := 55000
  )
  where exists (
    select 1 from public.fate_background_sessions
    where enabled and next_run_at <= clock_timestamp()
      and (lease_until is null or lease_until < clock_timestamp())
  );
$job$);
