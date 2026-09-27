-- ============================================================
-- Migration 001 — PostgreSQL enums
--
-- All enum types used across the schema are created here so
-- every subsequent migration can reference them cleanly.
--
-- Run order: this file must be applied FIRST.
-- ============================================================

-- Platform a social post can be published to
create type platform as enum (
  'FACEBOOK',
  'INSTAGRAM',
  'TIKTOK'
);

-- Lifecycle status of a campaign post
create type post_status as enum (
  'DRAFT',
  'SCHEDULED',
  'PUBLISHING',
  'PUBLISHED',
  'ACTION_REQUIRED',
  'FAILED'
);

-- Goal a business owner sets for a campaign
create type campaign_goal as enum (
  'PROMOTE_PRODUCT',
  'GET_MORE_ORDERS',
  'GET_STORE_VISITS',
  'ANNOUNCEMENT',
  'NEW_PRODUCT',
  'PROMOTION',
  'KEEP_PAGE_ACTIVE'
);

-- Whether a product is available for ordering
create type availability as enum (
  'ACTIVE',
  'UNAVAILABLE'
);

-- Brand tone of voice
create type tone as enum (
  'FRIENDLY',
  'PROFESSIONAL',
  'CASUAL',
  'ENERGETIC',
  'PREMIUM',
  'FUNNY',
  'INFORMATIVE'
);

-- Preferred caption/copy language
create type language as enum (
  'ENGLISH',
  'FILIPINO',
  'TAGLISH',
  'CEBUANO',
  'MIXED'
);

-- Default call-to-action shown at the end of captions
create type default_cta as enum (
  'MESSAGE_US',
  'VISIT_STORE',
  'ORDER_NOW',
  'BOOK_NOW',
  'LEARN_MORE'
);

-- Subscription tier
create type subscription_plan as enum (
  'FREE',
  'STARTER',
  'BUSINESS',
  'PRO'
);

-- What category of insight an AI recommendation belongs to
create type recommendation_type as enum (
  'CONTENT_FORMAT',
  'POSTING_TIME',
  'PRODUCT_SPOTLIGHT',
  'CAPTION_STYLE',
  'PLATFORM_FOCUS',
  'CAMPAIGN_IDEA'
);

-- Where the recommendation evidence came from
create type recommendation_source as enum (
  'GENERAL_BEST_PRACTICE',
  'BUSINESS_PROFILE',
  'HISTORICAL_PERFORMANCE',
  'AUDIENCE_DATA'
);
