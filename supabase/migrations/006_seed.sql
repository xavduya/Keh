-- ============================================================
-- Migration 006 — Development seed data
--
-- Inserts sample data for a demo user so developers can run
-- the app locally and see a populated dashboard immediately.
--
-- ⚠  DO NOT run this in production.
--    Apply only to your local / staging Supabase instance.
--
-- The UUID values are fixed so re-running this file is safe
-- (will fail on duplicate key rather than double-inserting).
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- Fixed UUIDs for the seed data
-- ─────────────────────────────────────────────────────────────
-- User:     00000000-0000-0000-0000-000000000001
-- Business: 00000000-0000-0000-0000-000000000010
-- Products: 00000000-0000-0000-0000-000000000021 / 22 / 23
-- Campaigns:00000000-0000-0000-0000-000000000031..35
-- Posts:    00000000-0000-0000-0000-000000000041..48

-- ── Profile ──────────────────────────────────────────────────
-- Note: In a real Supabase project the user must be created via
-- the Auth admin API first. This inserts a matching profile row.
insert into profiles (id, full_name)
values ('00000000-0000-0000-0000-000000000001', 'Juan Dela Cruz')
on conflict (id) do nothing;

-- ── Business ─────────────────────────────────────────────────
insert into businesses (
  id, owner_id, name, description, industry,
  location, target_audience, preferred_language,
  phone, operating_hours, delivery, payment,
  audience_age_group, audience_interests
) values (
  '00000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000001',
  'Juan''s Café',
  'Your neighborhood café for good coffee and great conversations.',
  'Café & restaurant',
  'Cebu City',
  'College students and young professionals',
  'TAGLISH',
  '+63 917 000 1234',
  '8:00 AM – 9:00 PM',
  'Pickup, GrabFood',
  'Cash, GCash',
  '18–35',
  'Coffee, studying, local food'
)
on conflict (id) do nothing;

-- ── Brand profile ─────────────────────────────────────────────
insert into brand_profiles (
  business_id, tone, preferred_language,
  brand_colors, default_cta
) values (
  '00000000-0000-0000-0000-000000000010',
  'FRIENDLY',
  'TAGLISH',
  '["#5849da"]',
  'MESSAGE_US'
)
on conflict (business_id) do nothing;

-- ── Subscription (Starter plan) ───────────────────────────────
insert into subscriptions (
  business_id, plan, price_per_month, currency,
  ai_campaigns_used, ai_campaigns_limit,
  scheduled_posts_used, scheduled_posts_limit,
  renews_at, usage_resets_at
) values (
  '00000000-0000-0000-0000-000000000010',
  'STARTER',
  399,
  'PHP',
  32, 50,
  41, 60,
  '2026-10-01 00:00:00+00',
  '2026-10-01 00:00:00+00'
)
on conflict (business_id) do nothing;

-- ── Products ─────────────────────────────────────────────────
insert into products (id, business_id, name, description, price, category, image_url, availability, ai_notes, campaign_count) values
  (
    '00000000-0000-0000-0000-000000000021',
    '00000000-0000-0000-0000-000000000010',
    'Matcha Latte',
    'Creamy Japanese matcha with fresh milk, served over ice.',
    150,
    'Drinks',
    'https://images.unsplash.com/photo-1749280447307-31a68eb38673?auto=format&fit=crop&w=800&q=85',
    'ACTIVE',
    'Our student favorite. Show preparation and the price.',
    8
  ),
  (
    '00000000-0000-0000-0000-000000000022',
    '00000000-0000-0000-0000-000000000010',
    'Spanish Latte',
    'Espresso, milk, and a little sweetness.',
    140,
    'Drinks',
    'https://images.unsplash.com/photo-1684548856346-041e1a90d630?auto=format&fit=crop&w=800&q=85',
    'ACTIVE',
    null,
    5
  ),
  (
    '00000000-0000-0000-0000-000000000023',
    '00000000-0000-0000-0000-000000000010',
    'Butter Croissant',
    'Flaky, buttery, and freshly baked.',
    95,
    'Pastries',
    'https://images.unsplash.com/photo-1725545901708-27d59e5c4226?auto=format&fit=crop&w=800&q=85',
    'ACTIVE',
    null,
    3
  )
on conflict (id) do nothing;

-- ── Social accounts ───────────────────────────────────────────
insert into social_accounts (business_id, platform, account_name, connected, requires_manual_publish) values
  ('00000000-0000-0000-0000-000000000010', 'FACEBOOK',  'Juan''s Café', true,  false),
  ('00000000-0000-0000-0000-000000000010', 'INSTAGRAM', '@juanscafe',   true,  false),
  ('00000000-0000-0000-0000-000000000010', 'TIKTOK',    '@juanscafe',   true,  true)
on conflict (business_id, platform) do nothing;

-- ── Campaigns ────────────────────────────────────────────────
insert into campaigns (id, business_id, product_id, goal, promotion, duration, instructions, status) values
  ('00000000-0000-0000-0000-000000000031', '00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000022', 'PROMOTION',        '15% off', 'Friday – Sunday', 'Target college students.', 'PUBLISHED'),
  ('00000000-0000-0000-0000-000000000032', '00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000022', 'PROMOTE_PRODUCT',  null,      null,              null,                       'SCHEDULED'),
  ('00000000-0000-0000-0000-000000000033', '00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000021', 'KEEP_PAGE_ACTIVE', null,      null,              null,                       'ACTION_REQUIRED'),
  ('00000000-0000-0000-0000-000000000034', '00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000021', 'PROMOTE_PRODUCT',  null,      null,              'Friday evening push.',     'PUBLISHED'),
  ('00000000-0000-0000-0000-000000000035', '00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000022', 'PROMOTE_PRODUCT',  null,      null,              null,                       'DRAFT')
on conflict (id) do nothing;

-- ── Social posts ─────────────────────────────────────────────
insert into social_posts (id, campaign_id, product_id, platform, title, caption, scheduled_at, published_at, status) values
  -- Spanish Latte Promotion (Published)
  (
    '00000000-0000-0000-0000-000000000041',
    '00000000-0000-0000-0000-000000000031',
    '00000000-0000-0000-0000-000000000022',
    'FACEBOOK',
    'Spanish Latte Promotion',
    E'Study break? Deserve mo \'to! Treat yourself to our Spanish Latte for ₱140. 15% off Friday – Sunday!\n\nEspresso, milk, and a little sweetness.\nFind us at Juan\'s Café, Cebu City. Message Us and make your day a little sweeter.',
    '2026-09-26 02:00:00+00',
    '2026-09-26 02:00:00+00',
    'PUBLISHED'
  ),
  (
    '00000000-0000-0000-0000-000000000042',
    '00000000-0000-0000-0000-000000000031',
    '00000000-0000-0000-0000-000000000022',
    'INSTAGRAM',
    'Spanish Latte Promotion',
    E'Your daily dose of good vibes ☕✨\nSpanish Latte · ₱140 · 15% off Friday – Sunday!\n📍 Juan\'s Café, Cebu City\nMessage Us 💜\n#CebuCafe #SupportLocal #CafeBreak',
    '2026-09-26 02:00:00+00',
    '2026-09-26 02:00:00+00',
    'PUBLISHED'
  ),
  -- Weekend Bundle (Scheduled)
  (
    '00000000-0000-0000-0000-000000000043',
    '00000000-0000-0000-0000-000000000032',
    '00000000-0000-0000-0000-000000000022',
    'FACEBOOK',
    'Weekend Bundle',
    E'Your weekend starts here. Spanish Latte, ₱140.\n📍 Juan\'s Café, Cebu City. Message Us!',
    '2026-09-26 10:00:00+00',
    null,
    'SCHEDULED'
  ),
  (
    '00000000-0000-0000-0000-000000000044',
    '00000000-0000-0000-0000-000000000032',
    '00000000-0000-0000-0000-000000000022',
    'INSTAGRAM',
    'Weekend Bundle',
    E'Weekend vibes ☕\nSpanish Latte · ₱140\n📍 Juan\'s Café, Cebu City\n#CebuCafe #Weekend',
    '2026-09-26 10:00:00+00',
    null,
    'SCHEDULED'
  ),
  -- Behind the Scenes (Action Required – TikTok)
  (
    '00000000-0000-0000-0000-000000000045',
    '00000000-0000-0000-0000-000000000033',
    '00000000-0000-0000-0000-000000000021',
    'TIKTOK',
    'Behind the Scenes',
    E'POV: you found your new favorite study drink 👀\nMatcha Latte for ₱150.\n📍 Juan\'s Café, Cebu City\n#CebuCafe #StudyBreak #SupportLocal',
    '2026-09-27 09:00:00+00',
    null,
    'ACTION_REQUIRED'
  ),
  -- Matcha Friday (Published — high reach)
  (
    '00000000-0000-0000-0000-000000000046',
    '00000000-0000-0000-0000-000000000034',
    '00000000-0000-0000-0000-000000000021',
    'FACEBOOK',
    'Matcha Friday',
    E'Study break? Deserve mo \'to! Treat yourself to our Matcha Latte for ₱150.\n\nCreamy Japanese matcha with fresh milk, served over ice.\nFind us at Juan\'s Café, Cebu City. Message Us and make your day a little sweeter.',
    '2026-09-25 10:00:00+00',
    '2026-09-25 10:00:00+00',
    'PUBLISHED'
  ),
  (
    '00000000-0000-0000-0000-000000000047',
    '00000000-0000-0000-0000-000000000034',
    '00000000-0000-0000-0000-000000000021',
    'INSTAGRAM',
    'Matcha Friday',
    E'Your daily dose of good vibes ☕✨\nMatcha Latte · ₱150\n📍 Juan\'s Café, Cebu City\nMessage Us 💜\n#CebuCafe #Matcha #SupportLocal',
    '2026-09-25 10:00:00+00',
    '2026-09-25 10:00:00+00',
    'PUBLISHED'
  ),
  -- Midweek Coffee Break (Draft)
  (
    '00000000-0000-0000-0000-000000000048',
    '00000000-0000-0000-0000-000000000035',
    '00000000-0000-0000-0000-000000000022',
    'INSTAGRAM',
    'Your Midweek Coffee Break',
    E'Your daily dose of good vibes ☕✨\nSpanish Latte · ₱140\n📍 Juan\'s Café, Cebu City\nMessage Us 💜\n#CebuCafe #MidweekBreak',
    '2026-09-30 04:00:00+00',
    null,
    'DRAFT'
  )
on conflict (id) do nothing;

-- ── Post metrics (sample reach for published posts) ───────────
insert into post_metrics (post_id, reach, impressions, views, likes, comments, shares, saves, clicks, collected_at) values
  ('00000000-0000-0000-0000-000000000041', 4200,  6100,  6100,  320,  45,  82,  61,  38,  '2026-09-26 12:00:00+00'),
  ('00000000-0000-0000-0000-000000000042',  0,     0,     0,    0,    0,   0,   0,   0,   '2026-09-26 12:00:00+00'),
  ('00000000-0000-0000-0000-000000000046', 8640, 12400, 12400,  780, 112, 205, 143,  91,  '2026-09-25 18:00:00+00'),
  ('00000000-0000-0000-0000-000000000047',  0,     0,     0,    0,    0,   0,   0,   0,   '2026-09-25 18:00:00+00')
on conflict do nothing;

-- ── AI Recommendations ────────────────────────────────────────
insert into ai_recommendations (business_id, type, title, explanation, confidence, source, action_label, action_goal) values
  (
    '00000000-0000-0000-0000-000000000010',
    'PRODUCT_SPOTLIGHT',
    'Give your Matcha Latte a little more spotlight.',
    'Your last two Matcha posts received 38% more engagement than your usual product posts. Let''s keep the momentum going.',
    0.82,
    'HISTORICAL_PERFORMANCE',
    'Create Recommended Campaign',
    'PROMOTE_PRODUCT'
  ),
  (
    '00000000-0000-0000-0000-000000000010',
    'CONTENT_FORMAT',
    'Take them behind the counter.',
    'Behind-the-scenes content is generating more comments than promotional graphics. Show the care that goes into every cup.',
    0.74,
    'HISTORICAL_PERFORMANCE',
    'Create one',
    'KEEP_PAGE_ACTIVE'
  ),
  (
    '00000000-0000-0000-0000-000000000010',
    'CAPTION_STYLE',
    'Let your prices do the talking.',
    'Posts displaying prices received 21% more interactions in the sample campaign comparison. A clear price makes ordering a little easier.',
    0.71,
    'HISTORICAL_PERFORMANCE',
    null,
    null
  ),
  (
    '00000000-0000-0000-0000-000000000010',
    'POSTING_TIME',
    'Friday evening is your sweet spot.',
    'Friday, 5–7 PM had the strongest engagement in your recent post history. Schedule your next campaign to land in that window.',
    0.68,
    'HISTORICAL_PERFORMANCE',
    null,
    null
  )
on conflict do nothing;
