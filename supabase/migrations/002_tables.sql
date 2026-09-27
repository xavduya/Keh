-- ============================================================
-- Migration 002 — Tables
--
-- Creates every table in dependency order so foreign key
-- references are always satisfied at creation time.
--
-- Naming conventions:
--   • Table names are snake_case plural
--   • Primary keys are uuid with gen_random_uuid() default
--   • created_at / updated_at on every mutable table
--   • Foreign keys have ON DELETE semantics documented inline
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- profiles
--
-- Extends auth.users (managed by Supabase Auth).
-- Stores display name and avatar — the only user-visible
-- profile data we need beyond what Auth provides.
-- ─────────────────────────────────────────────────────────────
create table profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text        not null default '',
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table profiles is
  'One row per authenticated user. Linked to auth.users via the same UUID.';

-- ─────────────────────────────────────────────────────────────
-- businesses
--
-- A business is owned by exactly one user (owner_id).
-- One user can own multiple businesses (e.g. Growth plan).
-- ─────────────────────────────────────────────────────────────
create table businesses (
  id                  uuid        primary key default gen_random_uuid(),
  owner_id            uuid        not null references profiles (id) on delete cascade,
  name                text        not null,
  description         text        not null default '',
  industry            text        not null default '',
  location            text        not null default '',
  target_audience     text        not null default '',
  preferred_language  language    not null default 'ENGLISH',
  phone               text        not null default '',
  website             text        not null default '',
  operating_hours     text        not null default '',
  delivery            text,
  payment             text,
  audience_age_group  text,
  audience_interests  text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

comment on table businesses is
  'A business profile owned by a user. All other data belongs to a business.';

-- ─────────────────────────────────────────────────────────────
-- brand_profiles
--
-- One-to-one with businesses. Stores the AI content
-- generation configuration for the business.
-- ─────────────────────────────────────────────────────────────
create table brand_profiles (
  id                  uuid        primary key default gen_random_uuid(),
  business_id         uuid        not null unique references businesses (id) on delete cascade,
  tone                tone        not null default 'FRIENDLY',
  preferred_language  language    not null default 'ENGLISH',
  -- brand_colors stored as a JSON array of hex strings, e.g. ["#5849da"]
  brand_colors        jsonb       not null default '[]',
  logo_url            text,
  brand_image_url     text,
  default_cta         default_cta not null default 'MESSAGE_US',
  brand_guidelines    text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

comment on table brand_profiles is
  'Brand voice and identity settings. Used by the AI to generate on-brand content.';

-- ─────────────────────────────────────────────────────────────
-- subscriptions
--
-- One row per business. Tracks the current plan and usage
-- counters that reset monthly.
-- ─────────────────────────────────────────────────────────────
create table subscriptions (
  id                      uuid              primary key default gen_random_uuid(),
  business_id             uuid              not null unique references businesses (id) on delete cascade,
  plan                    subscription_plan not null default 'FREE',
  price_per_month         numeric(10, 2)    not null default 0,
  currency                text              not null default 'PHP',
  renews_at               timestamptz       not null default (now() + interval '1 month'),
  -- Usage counters — reset by a scheduled job at renews_at
  ai_campaigns_used       integer           not null default 0,
  ai_campaigns_limit      integer           not null default 5,
  scheduled_posts_used    integer           not null default 0,
  scheduled_posts_limit   integer           not null default 10,
  usage_resets_at         timestamptz       not null default (now() + interval '1 month'),
  -- Stripe billing (populated in Phase — payments)
  stripe_customer_id      text,
  stripe_subscription_id  text,
  created_at              timestamptz       not null default now(),
  updated_at              timestamptz       not null default now()
);

comment on table subscriptions is
  'Subscription plan and monthly usage counters for a business.';

-- ─────────────────────────────────────────────────────────────
-- products
--
-- Products and services offered by a business.
-- Referenced by campaigns to tie content to a specific item.
-- ─────────────────────────────────────────────────────────────
create table products (
  id            uuid         primary key default gen_random_uuid(),
  business_id   uuid         not null references businesses (id) on delete cascade,
  name          text         not null,
  description   text         not null default '',
  price         numeric(10, 2) not null default 0,
  promo_price   numeric(10, 2),
  category      text         not null default '',
  image_url     text         not null default '',
  product_url   text,
  availability  availability not null default 'ACTIVE',
  ai_notes      text,
  -- Denormalised counter; kept in sync by a trigger on campaigns
  campaign_count integer     not null default 0,
  created_at    timestamptz  not null default now(),
  updated_at    timestamptz  not null default now()
);

comment on table products is
  'Products and services. Linked to campaigns to personalise AI-generated content.';

-- ─────────────────────────────────────────────────────────────
-- social_accounts
--
-- OAuth connections to social media platforms.
-- Stores encrypted tokens in access_token / refresh_token.
-- ─────────────────────────────────────────────────────────────
create table social_accounts (
  id                      uuid     primary key default gen_random_uuid(),
  business_id             uuid     not null references businesses (id) on delete cascade,
  platform                platform not null,
  account_name            text     not null default '',
  -- External platform account/page ID
  account_id              text,
  connected               boolean  not null default false,
  requires_manual_publish boolean  not null default false,
  -- Encrypted OAuth tokens — use Supabase Vault in production
  access_token            text,
  refresh_token           text,
  token_expires_at        timestamptz,
  last_synced_at          timestamptz,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  -- One account per platform per business
  unique (business_id, platform)
);

comment on table social_accounts is
  'OAuth connections to social platforms. Access tokens must be encrypted at rest.';

-- ─────────────────────────────────────────────────────────────
-- campaigns
--
-- A campaign is the owner's business intent: what to promote
-- and why. It generates one social_post per selected platform.
-- ─────────────────────────────────────────────────────────────
create table campaigns (
  id           uuid          primary key default gen_random_uuid(),
  business_id  uuid          not null references businesses (id) on delete cascade,
  product_id   uuid          not null references products (id) on delete restrict,
  goal         campaign_goal not null,
  promotion    text,
  duration     text,
  instructions text,
  -- Derived from the worst-case status of its social_posts
  status       post_status   not null default 'DRAFT',
  created_at   timestamptz   not null default now(),
  updated_at   timestamptz   not null default now()
);

comment on table campaigns is
  'The business owner''s campaign intent. Parent of all social_posts for that campaign.';

-- ─────────────────────────────────────────────────────────────
-- social_posts
--
-- One row per platform per campaign. This is the unit that
-- gets scheduled, published, and measured.
-- ─────────────────────────────────────────────────────────────
create table social_posts (
  id               uuid        primary key default gen_random_uuid(),
  campaign_id      uuid        not null references campaigns (id) on delete cascade,
  -- Denormalised from campaign for query convenience
  product_id       uuid        not null references products (id) on delete restrict,
  platform         platform    not null,
  title            text        not null default '',
  caption          text        not null default '',
  media_url        text,
  scheduled_at     timestamptz not null,
  published_at     timestamptz,
  status           post_status not null default 'DRAFT',
  -- Returned by the platform API after successful publish
  external_post_id text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

comment on table social_posts is
  'One post per platform per campaign. The publishable unit of content.';

-- ─────────────────────────────────────────────────────────────
-- post_metrics
--
-- Performance data collected from the platform API after publish.
-- Multiple rows per post are allowed (collected at different times).
-- ─────────────────────────────────────────────────────────────
create table post_metrics (
  id            uuid    primary key default gen_random_uuid(),
  post_id       uuid    not null references social_posts (id) on delete cascade,
  reach         integer not null default 0,
  impressions   integer not null default 0,
  views         integer not null default 0,
  likes         integer not null default 0,
  comments      integer not null default 0,
  shares        integer not null default 0,
  saves         integer not null default 0,
  clicks        integer not null default 0,
  -- TikTok / Reels watch time in seconds
  watch_time    integer,
  collected_at  timestamptz not null default now()
);

comment on table post_metrics is
  'Platform performance metrics for a published post. Used by the analytics pipeline.';

-- ─────────────────────────────────────────────────────────────
-- ai_recommendations
--
-- AI-generated suggestions for the business owner.
-- Created by the analytics pipeline after metric collection.
-- ─────────────────────────────────────────────────────────────
create table ai_recommendations (
  id            uuid                   primary key default gen_random_uuid(),
  business_id   uuid                   not null references businesses (id) on delete cascade,
  type          recommendation_type    not null,
  title         text                   not null,
  explanation   text                   not null,
  -- 0.0–1.0 confidence score from the AI
  confidence    numeric(4, 3),
  source        recommendation_source  not null,
  action_label  text,
  action_goal   campaign_goal,
  -- Soft-delete: dismissed recommendations are hidden, not deleted
  dismissed_at  timestamptz,
  created_at    timestamptz            not null default now()
);

comment on table ai_recommendations is
  'AI-generated marketing recommendations. Dismissed rows are soft-deleted.';
