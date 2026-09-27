-- ============================================================
-- Migration 003 — Indexes
--
-- Covers the access patterns used by:
--   • Dashboard queries (most recent posts, metrics)
--   • Calendar page (posts by date range)
--   • Analytics (metrics aggregation by business)
--   • Recommendation feed (latest per business)
--
-- Every foreign key column gets an index automatically via
-- the unique constraints above; only additional query-driven
-- indexes are listed here.
-- ============================================================

-- ── businesses ───────────────────────────────────────────────
-- Look up all businesses owned by a user
create index idx_businesses_owner_id
  on businesses (owner_id);

-- ── products ─────────────────────────────────────────────────
-- List active products for a business (the most common query)
create index idx_products_business_id_availability
  on products (business_id, availability);

-- ── campaigns ────────────────────────────────────────────────
-- All campaigns for a business, newest first
create index idx_campaigns_business_id_created_at
  on campaigns (business_id, created_at desc);

-- Campaigns by product (used when showing product campaign history)
create index idx_campaigns_product_id
  on campaigns (product_id);

-- ── social_posts ─────────────────────────────────────────────
-- Calendar query: posts in a date window for a campaign set
create index idx_social_posts_campaign_id_scheduled_at
  on social_posts (campaign_id, scheduled_at);

-- Status-based filtering (content library tabs)
create index idx_social_posts_status
  on social_posts (status);

-- Platform filtering in calendar / content library
create index idx_social_posts_platform
  on social_posts (platform);

-- Scheduled posts that need to be published (background job query)
create index idx_social_posts_scheduled_pending
  on social_posts (scheduled_at)
  where status = 'SCHEDULED';

-- ── post_metrics ─────────────────────────────────────────────
-- All metrics for a post, most recent first
create index idx_post_metrics_post_id_collected_at
  on post_metrics (post_id, collected_at desc);

-- ── ai_recommendations ───────────────────────────────────────
-- Active (non-dismissed) recommendations for a business
create index idx_ai_recommendations_business_id_active
  on ai_recommendations (business_id, created_at desc)
  where dismissed_at is null;

-- ── social_accounts ──────────────────────────────────────────
-- Connected accounts for a business (sidebar widget)
create index idx_social_accounts_business_id_connected
  on social_accounts (business_id, connected);
