-- ============================================================
-- Migration 014 — plan usage for edited campaigns
--
-- consume_campaign_quota (010) counts one campaign plus its
-- scheduled posts. Editing a campaign isn't a new campaign, but
-- it can schedule more posts (a draft being scheduled, or a
-- platform added), so this counts only those extra posts against
-- the monthly scheduled-post limit. Same rollover and locking as
-- 010. Returns allowed=false with reason 'scheduled_posts' when
-- the limit would be exceeded.
-- ============================================================

create or replace function consume_scheduled_posts(p_business_id uuid, p_count int)
returns table (allowed boolean, reason text)
language plpgsql
security definer
set search_path = public
as $$
declare
  sub   subscriptions%rowtype;
  extra int := greatest(coalesce(p_count, 0), 0);
begin
  if p_business_id is null or p_business_id not in (select get_user_business_ids()) then
    return query select false, 'not_owner';
    return;
  end if;

  select * into sub from subscriptions where business_id = p_business_id for update;
  if not found then
    return query select false, 'no_subscription';
    return;
  end if;

  if sub.usage_resets_at <= now() then
    while sub.usage_resets_at <= now() loop
      sub.usage_resets_at := sub.usage_resets_at + interval '1 month';
    end loop;
    sub.ai_campaigns_used := 0;
    sub.scheduled_posts_used := 0;
  end if;

  if extra > 0 and sub.scheduled_posts_used + extra > sub.scheduled_posts_limit then
    update subscriptions
      set ai_campaigns_used = sub.ai_campaigns_used,
          scheduled_posts_used = sub.scheduled_posts_used,
          usage_resets_at = sub.usage_resets_at
      where id = sub.id;
    return query select false, 'scheduled_posts';
    return;
  end if;

  update subscriptions
    set ai_campaigns_used = sub.ai_campaigns_used,
        scheduled_posts_used = sub.scheduled_posts_used + extra,
        usage_resets_at = sub.usage_resets_at
    where id = sub.id;

  return query select true, 'ok';
end;
$$;

revoke execute on function consume_scheduled_posts(uuid, int) from public, anon;
grant execute on function consume_scheduled_posts(uuid, int) to authenticated, service_role;
