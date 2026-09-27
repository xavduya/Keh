-- ============================================================
-- Migration 015 — publishing and metrics collection
--
-- 1. social_posts.last_error — why a post failed, shown to the owner.
-- 2. claim_due_posts()   — atomically moves due SCHEDULED posts to
--    PUBLISHING and returns them, so two job runs can never publish
--    the same post twice (FOR UPDATE SKIP LOCKED).
-- 3. fail_stuck_posts()  — posts left in PUBLISHING by a crashed run
--    are marked FAILED rather than retried: the platform may already
--    have them, and a retry could post twice.
-- 4. posts_for_metrics() — published posts to collect insights for.
-- 5. derive_campaign_status now also runs on DELETE (fixes G15), so
--    removing a platform from a campaign updates its status.
--
-- 2–4 are for the publishing job (secret key / service_role) only.
-- ============================================================

alter table social_posts add column if not exists last_error text;

-- ─────────────────────────────────────────────────────────────
-- 2. Claim due posts
-- ─────────────────────────────────────────────────────────────
create or replace function claim_due_posts(p_limit int default 20, p_campaign_id uuid default null)
returns table (
  id               uuid,
  campaign_id      uuid,
  business_id      uuid,
  platform         platform,
  caption          text,
  media_url        text
)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
begin
  return query
  with due as (
    select sp.id
    from social_posts sp
    where sp.status = 'SCHEDULED'
      and sp.scheduled_at <= now()
      and (p_campaign_id is null or sp.campaign_id = p_campaign_id)
    order by sp.scheduled_at
    limit least(greatest(coalesce(p_limit, 20), 1), 100)
    for update skip locked
  ),
  claimed as (
    update social_posts sp
    set status = 'PUBLISHING', last_error = null
    from due
    where sp.id = due.id
    returning sp.id, sp.campaign_id, sp.platform, sp.caption, sp.media_url
  )
  select c.id, c.campaign_id, ca.business_id, c.platform, c.caption, c.media_url
  from claimed c
  join campaigns ca on ca.id = c.campaign_id;
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- 3. Fail posts stuck in PUBLISHING
-- ─────────────────────────────────────────────────────────────
create or replace function fail_stuck_posts(p_minutes int default 15)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  n int;
begin
  update social_posts
  set status = 'FAILED',
      last_error = 'Publishing was interrupted. Check your Page before rescheduling, in case it was already posted.'
  where status = 'PUBLISHING'
    and updated_at < now() - make_interval(mins => greatest(coalesce(p_minutes, 15), 5));
  get diagnostics n = row_count;
  return n;
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- 4. Posts to collect metrics for
-- ─────────────────────────────────────────────────────────────
create or replace function posts_for_metrics(p_days int default 30, p_limit int default 200)
returns table (
  id               uuid,
  business_id      uuid,
  platform         platform,
  external_post_id text
)
language sql
security definer
set search_path = public
as $$
  select sp.id, ca.business_id, sp.platform, sp.external_post_id
  from social_posts sp
  join campaigns ca on ca.id = sp.campaign_id
  where sp.status = 'PUBLISHED'
    and sp.external_post_id is not null
    and sp.platform in ('FACEBOOK', 'INSTAGRAM')
    and sp.published_at > now() - make_interval(days => least(greatest(coalesce(p_days, 30), 1), 90))
  order by sp.published_at desc
  limit least(greatest(coalesce(p_limit, 200), 1), 1000);
$$;

revoke execute on function claim_due_posts(int, uuid) from public, anon, authenticated;
revoke execute on function fail_stuck_posts(int) from public, anon, authenticated;
revoke execute on function posts_for_metrics(int, int) from public, anon, authenticated;
grant execute on function claim_due_posts(int, uuid) to service_role;
grant execute on function fail_stuck_posts(int) to service_role;
grant execute on function posts_for_metrics(int, int) to service_role;

-- ─────────────────────────────────────────────────────────────
-- 5. Campaign status also follows post deletes
-- ─────────────────────────────────────────────────────────────
create or replace function derive_campaign_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target uuid;
  derived_status post_status;
begin
  -- NEW is null for DELETE; OLD is null for INSERT.
  if tg_op = 'DELETE' then
    target := old.campaign_id;
  else
    target := new.campaign_id;
  end if;

  select
    case
      when bool_or(status = 'FAILED')           then 'FAILED'
      when bool_or(status = 'ACTION_REQUIRED')  then 'ACTION_REQUIRED'
      when bool_or(status = 'PUBLISHING')       then 'PUBLISHING'
      when bool_or(status = 'SCHEDULED')        then 'SCHEDULED'
      when bool_or(status = 'PUBLISHED')        then 'PUBLISHED'
      else                                           'DRAFT'
    end::post_status
  into derived_status
  from social_posts
  where campaign_id = target;

  -- No posts left (e.g. the campaign itself is being deleted): nothing to do.
  if derived_status is not null then
    update campaigns set status = derived_status where id = target;
  end if;

  return null; -- AFTER trigger: the return value is ignored
end;
$$;

drop trigger if exists trg_social_posts_derive_campaign_status on social_posts;
create trigger trg_social_posts_derive_campaign_status
  after insert or update of status or delete on social_posts
  for each row execute function derive_campaign_status();
