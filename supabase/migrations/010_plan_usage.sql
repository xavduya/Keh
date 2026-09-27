-- ============================================================
-- Migration 010 — Plan usage counting
--
-- Every saved campaign uses one of the plan's monthly "AI
-- campaigns" (Keh writes every campaign), and every scheduled
-- post uses one of its monthly scheduled posts. Drafts use an AI
-- campaign but no scheduled posts.
--
-- Owners can't update their subscription row (no RLS policy for
-- it), so counting happens in these SECURITY DEFINER functions,
-- which check ownership themselves. Counters roll over at
-- usage_resets_at (monthly).
--
--   consume_campaign_quota(business, scheduled_posts)
--     → checks limits and counts one campaign atomically
--   release_campaign_quota(business, scheduled_posts)
--     → gives it back if saving the campaign then failed.
--       SERVICE ROLE ONLY: if owners could call it, they could
--       wind their own counters back and bypass the limits.
-- ============================================================

create or replace function consume_campaign_quota(p_business_id uuid, p_scheduled_posts int)
returns table (allowed boolean, reason text)
language plpgsql
security definer
set search_path = public
as $$
declare
  sub       subscriptions%rowtype;
  scheduled int := greatest(coalesce(p_scheduled_posts, 0), 0);
begin
  if p_business_id is null or p_business_id not in (select get_user_business_ids()) then
    return query select false, 'not_owner';
    return;
  end if;

  -- Lock the row so parallel saves can't both take the last slot.
  select * into sub from subscriptions where business_id = p_business_id for update;
  if not found then
    return query select false, 'no_subscription';
    return;
  end if;

  -- Roll the monthly counters over if the period has ended.
  if sub.usage_resets_at <= now() then
    while sub.usage_resets_at <= now() loop
      sub.usage_resets_at := sub.usage_resets_at + interval '1 month';
    end loop;
    sub.ai_campaigns_used := 0;
    sub.scheduled_posts_used := 0;
  end if;

  if sub.ai_campaigns_used >= sub.ai_campaigns_limit then
    update subscriptions
      set ai_campaigns_used = sub.ai_campaigns_used,
          scheduled_posts_used = sub.scheduled_posts_used,
          usage_resets_at = sub.usage_resets_at
      where id = sub.id;
    return query select false, 'ai_campaigns';
    return;
  end if;

  if scheduled > 0 and sub.scheduled_posts_used + scheduled > sub.scheduled_posts_limit then
    update subscriptions
      set ai_campaigns_used = sub.ai_campaigns_used,
          scheduled_posts_used = sub.scheduled_posts_used,
          usage_resets_at = sub.usage_resets_at
      where id = sub.id;
    return query select false, 'scheduled_posts';
    return;
  end if;

  update subscriptions
    set ai_campaigns_used = sub.ai_campaigns_used + 1,
        scheduled_posts_used = sub.scheduled_posts_used + scheduled,
        usage_resets_at = sub.usage_resets_at
    where id = sub.id;

  return query select true, 'ok';
end;
$$;

create or replace function release_campaign_quota(p_business_id uuid, p_scheduled_posts int)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update subscriptions
    set ai_campaigns_used = greatest(ai_campaigns_used - 1, 0),
        scheduled_posts_used = greatest(scheduled_posts_used - greatest(coalesce(p_scheduled_posts, 0), 0), 0)
    where business_id = p_business_id;
end;
$$;

revoke execute on function consume_campaign_quota(uuid, int) from public, anon;
revoke execute on function release_campaign_quota(uuid, int) from public, anon;
grant execute on function consume_campaign_quota(uuid, int) to authenticated, service_role;
revoke execute on function release_campaign_quota(uuid, int) from authenticated;
grant execute on function release_campaign_quota(uuid, int) to service_role;
