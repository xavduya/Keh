-- ============================================================
-- Migration 004 — Row Level Security (RLS)
--
-- Every table has RLS enabled and at least one policy.
-- The general rule is:
--
--   "A user can only read and write data that belongs to
--    a business they own."
--
-- The ownership chain is always:
--   auth.uid() → profiles.id → businesses.owner_id → <table>.business_id
--
-- Helper function get_user_business_ids() is defined at the
-- top so every policy can reuse it without a subquery.
-- ============================================================

-- ── Enable RLS on every table ────────────────────────────────
alter table profiles             enable row level security;
alter table businesses           enable row level security;
alter table brand_profiles       enable row level security;
alter table subscriptions        enable row level security;
alter table products             enable row level security;
alter table social_accounts      enable row level security;
alter table campaigns            enable row level security;
alter table social_posts         enable row level security;
alter table post_metrics         enable row level security;
alter table ai_recommendations   enable row level security;

-- ── Helper: returns the set of business IDs the current user owns ──
-- Defined as a SECURITY DEFINER function so it runs with elevated
-- privileges and can always read the businesses table.
create or replace function get_user_business_ids()
returns setof uuid
language sql
security definer
stable
as $$
  select id from businesses where owner_id = auth.uid()
$$;

-- ────────────────────────────────────────────────────────────
-- profiles
-- A user can only read and update their own profile row.
-- Insert is handled by the handle_new_user() trigger (005).
-- ────────────────────────────────────────────────────────────
create policy "profiles: owner can select"
  on profiles for select
  using (id = auth.uid());

create policy "profiles: owner can update"
  on profiles for update
  using (id = auth.uid());

-- ────────────────────────────────────────────────────────────
-- businesses
-- ────────────────────────────────────────────────────────────
create policy "businesses: owner can select"
  on businesses for select
  using (owner_id = auth.uid());

create policy "businesses: owner can insert"
  on businesses for insert
  with check (owner_id = auth.uid());

create policy "businesses: owner can update"
  on businesses for update
  using (owner_id = auth.uid());

create policy "businesses: owner can delete"
  on businesses for delete
  using (owner_id = auth.uid());

-- ────────────────────────────────────────────────────────────
-- brand_profiles
-- ────────────────────────────────────────────────────────────
create policy "brand_profiles: owner can select"
  on brand_profiles for select
  using (business_id in (select get_user_business_ids()));

create policy "brand_profiles: owner can insert"
  on brand_profiles for insert
  with check (business_id in (select get_user_business_ids()));

create policy "brand_profiles: owner can update"
  on brand_profiles for update
  using (business_id in (select get_user_business_ids()));

-- ────────────────────────────────────────────────────────────
-- subscriptions
-- ────────────────────────────────────────────────────────────
create policy "subscriptions: owner can select"
  on subscriptions for select
  using (business_id in (select get_user_business_ids()));

-- Insert/update is done by server-side code (admin client) only.
-- No user-facing insert/update policies for subscriptions.

-- ────────────────────────────────────────────────────────────
-- products
-- ────────────────────────────────────────────────────────────
create policy "products: owner can select"
  on products for select
  using (business_id in (select get_user_business_ids()));

create policy "products: owner can insert"
  on products for insert
  with check (business_id in (select get_user_business_ids()));

create policy "products: owner can update"
  on products for update
  using (business_id in (select get_user_business_ids()));

create policy "products: owner can delete"
  on products for delete
  using (business_id in (select get_user_business_ids()));

-- ────────────────────────────────────────────────────────────
-- social_accounts
-- ────────────────────────────────────────────────────────────
create policy "social_accounts: owner can select"
  on social_accounts for select
  using (business_id in (select get_user_business_ids()));

create policy "social_accounts: owner can insert"
  on social_accounts for insert
  with check (business_id in (select get_user_business_ids()));

create policy "social_accounts: owner can update"
  on social_accounts for update
  using (business_id in (select get_user_business_ids()));

create policy "social_accounts: owner can delete"
  on social_accounts for delete
  using (business_id in (select get_user_business_ids()));

-- ────────────────────────────────────────────────────────────
-- campaigns
-- ────────────────────────────────────────────────────────────
create policy "campaigns: owner can select"
  on campaigns for select
  using (business_id in (select get_user_business_ids()));

create policy "campaigns: owner can insert"
  on campaigns for insert
  with check (business_id in (select get_user_business_ids()));

create policy "campaigns: owner can update"
  on campaigns for update
  using (business_id in (select get_user_business_ids()));

create policy "campaigns: owner can delete"
  on campaigns for delete
  using (business_id in (select get_user_business_ids()));

-- ────────────────────────────────────────────────────────────
-- social_posts
-- Ownership is resolved through campaigns.
-- ────────────────────────────────────────────────────────────
create policy "social_posts: owner can select"
  on social_posts for select
  using (
    campaign_id in (
      select id from campaigns
      where business_id in (select get_user_business_ids())
    )
  );

create policy "social_posts: owner can insert"
  on social_posts for insert
  with check (
    campaign_id in (
      select id from campaigns
      where business_id in (select get_user_business_ids())
    )
  );

create policy "social_posts: owner can update"
  on social_posts for update
  using (
    campaign_id in (
      select id from campaigns
      where business_id in (select get_user_business_ids())
    )
  );

create policy "social_posts: owner can delete"
  on social_posts for delete
  using (
    campaign_id in (
      select id from campaigns
      where business_id in (select get_user_business_ids())
    )
  );

-- ────────────────────────────────────────────────────────────
-- post_metrics
-- Read-only for the owner. Writes come from the server-side
-- metrics-collection background job (admin client).
-- ────────────────────────────────────────────────────────────
create policy "post_metrics: owner can select"
  on post_metrics for select
  using (
    post_id in (
      select sp.id from social_posts sp
      join campaigns c on c.id = sp.campaign_id
      where c.business_id in (select get_user_business_ids())
    )
  );

-- ────────────────────────────────────────────────────────────
-- ai_recommendations
-- Read-only for the owner (update only to dismiss).
-- Insert comes from the AI pipeline (admin client).
-- ────────────────────────────────────────────────────────────
create policy "ai_recommendations: owner can select"
  on ai_recommendations for select
  using (business_id in (select get_user_business_ids()));

-- Owners can dismiss a recommendation (set dismissed_at)
create policy "ai_recommendations: owner can dismiss"
  on ai_recommendations for update
  using (business_id in (select get_user_business_ids()))
  with check (business_id in (select get_user_business_ids()));
