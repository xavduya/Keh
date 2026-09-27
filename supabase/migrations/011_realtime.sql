-- ============================================================
-- Migration 011 — Realtime updates
--
-- Adds the tables the app displays to Supabase's realtime
-- publication, so an open browser tab hears about changes made
-- elsewhere (another person on the same account, another tab,
-- the demo-data script) and refreshes itself.
--
-- Realtime applies each table's RLS policies: a signed-in user
-- only receives changes to rows they can already read.
--
-- Only tables not already in the publication are added, so this
-- is safe to run more than once.
-- ============================================================

do $$
declare
  t text;
begin
  foreach t in array array[
    'businesses',
    'brand_profiles',
    'subscriptions',
    'products',
    'campaigns',
    'social_posts',
    'post_metrics'
  ]
  loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end;
$$;
