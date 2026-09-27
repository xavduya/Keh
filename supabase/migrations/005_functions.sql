-- ============================================================
-- Migration 005 — Functions & Triggers
--
-- 1. handle_new_user()         — auto-creates a profile row and
--                                a starter business + brand profile
--                                when a user signs up via Supabase Auth.
--
-- 2. set_updated_at()          — keeps updated_at current on every
--                                UPDATE across all mutable tables.
--
-- 3. increment_campaign_count()— keeps products.campaign_count in
--                                sync when campaigns are created
--                                or deleted.
--
-- 4. derive_campaign_status()  — updates campaigns.status to match
--                                the worst-case status of its posts.
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. handle_new_user
--
-- Fires AFTER INSERT on auth.users.
-- Creates the minimum set of rows a new user needs to see
-- a working (empty) dashboard immediately after sign-up.
-- ─────────────────────────────────────────────────────────────
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_business_id uuid;
  new_sub_id      uuid;
begin
  -- 1. Profile
  insert into profiles (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.raw_user_meta_data->>'avatar_url'
  );

  -- 2. Default business (owner can rename on the brand page)
  insert into businesses (owner_id, name, preferred_language)
  values (new.id, 'My Business', 'ENGLISH')
  returning id into new_business_id;

  -- 3. Brand profile for that business
  insert into brand_profiles (business_id)
  values (new_business_id);

  -- 4. Free-tier subscription
  insert into subscriptions (
    business_id,
    plan,
    price_per_month,
    ai_campaigns_limit,
    scheduled_posts_limit
  ) values (
    new_business_id,
    'FREE',
    0,
    5,
    10
  );

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ─────────────────────────────────────────────────────────────
-- 2. set_updated_at
--
-- Generic trigger function; attach to any table that has an
-- updated_at column. Called BEFORE UPDATE.
-- ─────────────────────────────────────────────────────────────
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Attach to every mutable table
create trigger trg_profiles_updated_at
  before update on profiles
  for each row execute function set_updated_at();

create trigger trg_businesses_updated_at
  before update on businesses
  for each row execute function set_updated_at();

create trigger trg_brand_profiles_updated_at
  before update on brand_profiles
  for each row execute function set_updated_at();

create trigger trg_subscriptions_updated_at
  before update on subscriptions
  for each row execute function set_updated_at();

create trigger trg_products_updated_at
  before update on products
  for each row execute function set_updated_at();

create trigger trg_social_accounts_updated_at
  before update on social_accounts
  for each row execute function set_updated_at();

create trigger trg_campaigns_updated_at
  before update on campaigns
  for each row execute function set_updated_at();

create trigger trg_social_posts_updated_at
  before update on social_posts
  for each row execute function set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- 3. increment_campaign_count
--
-- Keeps products.campaign_count accurate so the products page
-- can display "Appeared in N campaigns" without a subquery.
-- ─────────────────────────────────────────────────────────────
create or replace function increment_campaign_count()
returns trigger
language plpgsql
security definer
as $$
begin
  if (tg_op = 'INSERT') then
    update products
    set campaign_count = campaign_count + 1
    where id = new.product_id;

  elsif (tg_op = 'DELETE') then
    update products
    set campaign_count = greatest(campaign_count - 1, 0)
    where id = old.product_id;
  end if;

  return null;
end;
$$;

create trigger trg_campaigns_campaign_count
  after insert or delete on campaigns
  for each row execute function increment_campaign_count();

-- ─────────────────────────────────────────────────────────────
-- 4. derive_campaign_status
--
-- When any social_post's status changes, recomputes the parent
-- campaign's status using this priority order (worst-first):
--
--   FAILED > ACTION_REQUIRED > PUBLISHING > SCHEDULED >
--   PUBLISHED > DRAFT
--
-- This means a campaign is FAILED if any post failed,
-- ACTION_REQUIRED if any post needs manual action, etc.
-- ─────────────────────────────────────────────────────────────
create or replace function derive_campaign_status()
returns trigger
language plpgsql
security definer
as $$
declare
  derived_status post_status;
begin
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
  where campaign_id = new.campaign_id;

  update campaigns
  set status = derived_status
  where id = new.campaign_id;

  return new;
end;
$$;

create trigger trg_social_posts_derive_campaign_status
  after insert or update of status on social_posts
  for each row execute function derive_campaign_status();
