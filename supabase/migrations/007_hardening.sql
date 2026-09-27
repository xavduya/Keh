-- ============================================================
-- Migration 007 — Hardening & sign-up tweaks
--
-- Apply after 001–005. (The dev seed moved to supabase/seed.sql
-- and is no longer a migration.)
--
-- 1. Data API grants        — newer Supabase projects don't expose
--                             SQL-created tables automatically.
-- 2. OAuth token columns    — hidden from signed-in users.
-- 3. search_path pinning    — for SECURITY DEFINER functions.
-- 4. Cross-business checks  — campaigns/posts may only reference
--                             the owner's own products.
-- 5. handle_new_user()      — names the starter business from
--                             sign-up metadata.
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. Grants — RLS still decides which rows each user can touch
-- ─────────────────────────────────────────────────────────────
grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant all on all tables in schema public to service_role;

-- ─────────────────────────────────────────────────────────────
-- 2. social_accounts: never expose OAuth tokens to the browser.
--    Tokens are written/read by server code with the secret key.
--    App code must select explicit columns (not *) from this table.
-- ─────────────────────────────────────────────────────────────
revoke select, insert, update on social_accounts from authenticated;

grant select (
  id, business_id, platform, account_name, account_id, connected,
  requires_manual_publish, token_expires_at, last_synced_at,
  created_at, updated_at
) on social_accounts to authenticated;

grant insert (
  business_id, platform, account_name, connected, requires_manual_publish
) on social_accounts to authenticated;

grant update (
  account_name, connected, requires_manual_publish
) on social_accounts to authenticated;

-- ─────────────────────────────────────────────────────────────
-- 3. Pin search_path on SECURITY DEFINER functions
-- ─────────────────────────────────────────────────────────────
alter function get_user_business_ids()   set search_path = public;
alter function increment_campaign_count() set search_path = public;
alter function derive_campaign_status()   set search_path = public;

-- RLS policies call this as the signed-in user, so authenticated keeps EXECUTE.
revoke execute on function get_user_business_ids() from public, anon;
grant execute on function get_user_business_ids() to authenticated, service_role;

-- ─────────────────────────────────────────────────────────────
-- 4. Campaigns and posts may only reference the owner's products
-- ─────────────────────────────────────────────────────────────
drop policy "campaigns: owner can insert" on campaigns;
drop policy "campaigns: owner can update" on campaigns;

create policy "campaigns: owner can insert"
  on campaigns for insert
  with check (
    business_id in (select get_user_business_ids())
    and product_id in (
      select id from products where business_id in (select get_user_business_ids())
    )
  );

create policy "campaigns: owner can update"
  on campaigns for update
  using (business_id in (select get_user_business_ids()))
  with check (
    business_id in (select get_user_business_ids())
    and product_id in (
      select id from products where business_id in (select get_user_business_ids())
    )
  );

drop policy "social_posts: owner can insert" on social_posts;
drop policy "social_posts: owner can update" on social_posts;

create policy "social_posts: owner can insert"
  on social_posts for insert
  with check (
    campaign_id in (
      select id from campaigns where business_id in (select get_user_business_ids())
    )
    and product_id in (
      select id from products where business_id in (select get_user_business_ids())
    )
  );

create policy "social_posts: owner can update"
  on social_posts for update
  using (
    campaign_id in (
      select id from campaigns where business_id in (select get_user_business_ids())
    )
  )
  with check (
    campaign_id in (
      select id from campaigns where business_id in (select get_user_business_ids())
    )
    and product_id in (
      select id from products where business_id in (select get_user_business_ids())
    )
  );

-- ─────────────────────────────────────────────────────────────
-- 5. handle_new_user — use the business name entered at sign-up
-- ─────────────────────────────────────────────────────────────
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_business_id uuid;
begin
  insert into profiles (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.raw_user_meta_data->>'avatar_url'
  );

  insert into businesses (owner_id, name, preferred_language)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data->>'business_name'), ''), 'My Business'),
    'ENGLISH'
  )
  returning id into new_business_id;

  insert into brand_profiles (business_id)
  values (new_business_id);

  insert into subscriptions (
    business_id, plan, price_per_month, ai_campaigns_limit, scheduled_posts_limit
  ) values (
    new_business_id, 'FREE', 0, 5, 10
  );

  return new;
end;
$$;
