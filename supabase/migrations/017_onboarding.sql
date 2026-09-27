-- ============================================================
-- Migration 017 — onboarding
--
-- businesses.onboarded_at is set when the owner finishes (or skips)
-- the guided setup after sign-up. Until then the app sends them to
-- /onboarding. Businesses that existed before onboarding was built
-- are treated as set up.
-- ============================================================

alter table businesses add column if not exists onboarded_at timestamptz;

update businesses set onboarded_at = created_at where onboarded_at is null;

comment on column businesses.onboarded_at is
  'When the owner finished or skipped onboarding; null sends them to /onboarding.';
