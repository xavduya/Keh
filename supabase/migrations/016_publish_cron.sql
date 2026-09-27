-- ============================================================
-- Migration 016 — scheduled publishing and metrics (pg_cron)
--
-- Every 5 minutes pg_cron calls POST <site>/api/cron/publish, and
-- every hour POST <site>/api/cron/metrics, through pg_net, with
-- `Authorization: Bearer <CRON_SECRET>`.
--
-- BEFORE running this file, store the two values in Vault (SQL
-- editor), using your deployed URL and the same CRON_SECRET as
-- the app's environment (at least 16 random characters):
--
--   select vault.create_secret('https://your-site.example', 'keh_site_url');
--   select vault.create_secret('<CRON_SECRET>', 'keh_cron_secret');
--
-- To change them later:
--   select vault.update_secret(id, '<new value>') from vault.secrets where name = 'keh_site_url';
--
-- Check runs:   select * from cron.job_run_details order by start_time desc limit 20;
-- HTTP replies: select * from net._http_response order by created desc limit 20;
-- Stop:         select cron.unschedule('keh-publish'); select cron.unschedule('keh-metrics');
-- ============================================================

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Calls one of the app's cron routes. SECURITY DEFINER so the job can
-- read the Vault secrets; only postgres (pg_cron) may run it.
create or replace function call_keh_cron(p_path text)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  site   text := (select decrypted_secret from vault.decrypted_secrets where name = 'keh_site_url');
  secret text := (select decrypted_secret from vault.decrypted_secrets where name = 'keh_cron_secret');
begin
  if site is null or secret is null then
    raise exception 'Set the keh_site_url and keh_cron_secret Vault secrets (see migration 016).';
  end if;
  return net.http_post(
    url := rtrim(site, '/') || p_path,
    headers := jsonb_build_object('Authorization', 'Bearer ' || secret, 'Content-Type', 'application/json'),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
end;
$$;

revoke execute on function call_keh_cron(text) from public, anon, authenticated;

-- Re-running this file replaces the jobs instead of adding duplicates.
select cron.schedule('keh-publish', '*/5 * * * *', $$ select call_keh_cron('/api/cron/publish'); $$);
select cron.schedule('keh-metrics', '17 * * * *', $$ select call_keh_cron('/api/cron/metrics'); $$);
