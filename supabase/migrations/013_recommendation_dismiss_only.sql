-- ============================================================
-- Migration 013 — owners can only dismiss recommendations
--
-- Migration 007 granted UPDATE on every table to `authenticated`,
-- so the "owner can dismiss" policy (004) let owners rewrite any
-- column of their recommendations (title, explanation, product…),
-- not just hide them. Limit the grant to dismissed_at; RLS still
-- limits which rows. Recommendations are written server-side with
-- the secret key (service_role), which is unaffected.
-- ============================================================

revoke update on ai_recommendations from authenticated;
grant update (dismissed_at) on ai_recommendations to authenticated;
