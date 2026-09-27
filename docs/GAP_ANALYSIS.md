# Keh — Gap Analysis & Roadmap

> **Date:** 2026-09-27 · **Commit audited:** `ae2231b` (main) · **Scope:** all of `src/`, `supabase/migrations/`, configs, `.env` (variable names only)
>
> Baseline at time of audit: `npm run build`, `npx tsc --noEmit`, and `npm run lint` all pass.

## TL;DR

Keh is a well-built **clickable prototype**: 11 pages, typed mock data and a solid database schema. The core promise doesn't work yet: an owner can't create a campaign that is saved and then shows up in the calendar or content library. No real data flows through the app, there's no login, and the wizard's last step does nothing.

A few things are **broken today**, even with mock data:

- The **Campaigns** link in the sidebar leads to a 404 page.
- Every scheduled time is shown **8 hours off**.
- On mobile, the sidebar **stays open** after you tap a link.

The biggest planning risk is **sequencing**. The current roadmap lists Phase 3b (mock-only interactions) next. Most of that work would be thrown away once Supabase is connected, so we recommend doing the real data work first.

**Recommended next task (updated 2026-09-27):** make the brand profile editable, then generate captions with AI. See [Progress](#progress-since-the-audit) and [What to do next](#what-to-do-next).

---

## Progress since the audit

> **Updated:** 2026-09-27 · branches `feat/login` and `feat/products` (not yet merged to `main`)

The core loop now works end to end on Supabase: **sign up → add a product → create a campaign → it appears in Campaigns, Calendar, Content and the Dashboard.**

| Gap | Status | What changed |
|---|---|---|
| G1 `/campaigns` 404 | ✅ Fixed | A teammate added the `/campaigns` list page (now on real data). |
| G2 Times 8 hours off | ✅ Fixed | `src/utils/datetime.ts` (Manila-time helpers) replaces ISO string slicing in the dashboard, calendar, content and campaigns pages. |
| G3 Env keys / clients | ✅ Fixed | `src/lib/env.ts` validates the env vars; the clients use the publishable/secret keys and are typed; `.env.example` added. |
| G4 Proxy | ✅ Fixed | Debug log removed; redirects signed-out users to `/login` and signed-in users away from the auth pages. |
| G5 Mobile drawer | ✅ Fixed | Closes on navigation and on Escape. |
| G6 Saving campaigns | ✅ Fixed | `saveCampaign` Server Action + `createCampaignWithPosts`; Schedule / Publish now / Save draft all save. No live publishing yet (see G24). |
| G7 Wizard correctness | 🟡 Mostly | Captions use the real business, brand tone/language/CTA and product, and regenerate when inputs change. Still template text, not AI. |
| G8 Validation | ✅ Fixed | Product, campaign, brand and auth forms are validated server-side with Zod; the brand form's field names now match the schema and database. |
| G9 Server pages | 🟡 Mostly | Dashboard, campaigns, wizard, calendar, content and products are server pages feeding client views. Analytics, assistant, brand, social accounts and subscription are still mock client pages. |
| G10 Demo identity | 🟡 Mostly | Real user and business everywhere in the shell and wizard. The dashboard's recommendation card and stat cards are still mock ("Matcha Latte"). |
| G11 Auth | ✅ Fixed | Email/password login, sign-up (with business name), sign-out, and the email-confirmation callback. No onboarding flow beyond sign-up. |
| G12 Products | ✅ Fixed | Add/edit with photo upload (Storage), availability badge, empty state. No delete yet. |
| Brand profile | ✅ Fixed | Business details, audience and brand voice save to Supabase (with logo and brand image upload); the wizard's captions use them. |
| G13 Supabase setup | 🟡 Partly | Seed moved out of `migrations/`; migrations 001–005 and 007 applied. Still no `supabase/config.toml` or generated types. |
| G14 DB security | 🟡 Partly | (a) `search_path` pinned, (b) cross-business product checks, (c) OAuth token columns hidden from users — all in migration 007. (d) RLS performance not done. |
| G16 Empty states / errors | 🟡 Partly | Real-data pages handle "no products / no posts". No `error.tsx` / `loading.tsx` yet; mock pages still crash-prone. |
| G15, G17–G24 | ⏳ Open | Unchanged. |

**New gaps found while building:**

- **Migrations weren't applied** to the Supabase project in `.env` when this work started, despite the earlier commit message. They are now (001–005, 007); 008 is pending.
- **Metrics:** real posts always have `reach = 0` until a metrics pipeline exists, so the dashboard stats and "Top Performing" filter can't be real yet.
- **No edit/delete** for campaigns or products.

---

## Original audit (2026-09-27, commit `ae2231b`)

Everything below describes the code **as audited**, before the fixes above. Use the Progress table for current status.

### How to read this document

- **Priority** means how urgent it is right now.
- **Importance** means how much it matters to the product overall.
- **Effort:** S = hours, M = a few days, L = a week or more.
- **Type** is one of: Broken · Missing · Incomplete · Mismatch · Poorly implemented · Tech debt · Nice-to-have.

---

## Where `CLAUDE.md` and the code disagree

| # | Docs say | Code shows |
|---|---|---|
| D1 | "Several pages" import `@/data/*` directly | **12 files** do: 8 pages plus 4 wizard files. Only `dashboard/page.tsx` and the dashboard layout go through services. |
| D2 | There is a key-name mismatch between `proxy.ts` and the clients | It's worse than that. `.env` defines `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and `SUPABASE_SECRET_KEY`. `lib/supabase/client.ts` and `server.ts` read `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY`, which **don't exist in `.env`**. Both clients will fail the first time they're used. |
| D3 | Environment variables include `SUPABASE_SERVICE_ROLE_KEY` | `.env` uses the newer key style: `SUPABASE_SECRET_KEY`, `SUPABASE_URL`, `SUPABASE_JWKS_URL`. |
| D4 | Roadmap: Phase 4 (data layer) is "Planned", Phase 5 (Supabase) is "In progress" | Phase 4 is meant to come before Phase 5. The Supabase schema is ahead of the service boundary it depends on. |
| D5 | The nav implies a Campaigns section | The nav links to `/campaigns`, but only `/campaigns/new` exists. |
| D6 | Platforms are `FACEBOOK \| INSTAGRAM \| TIKTOK` | `social-accounts/page.tsx` adds a "Google Business" card by pretending it's a Facebook account and matching cards to labels by position. Whether Google Business is in scope isn't documented. |
| D7 | The README project structure includes `src/hooks/` | That folder doesn't exist. |

---

## Gaps

### Broken today

#### G1 · The "Campaigns" sidebar link returns a 404
- **Type:** Broken
- **Evidence:** `src/constants/index.ts` sets `NAV_ITEMS` "campaigns" to `href: "/campaigns"`. There's no `app/(dashboard)/campaigns/page.tsx`, and the build output lists only `/campaigns/new`.
- **Expected:** A campaigns list, or at least a working link.
- **Impact:** A primary nav item is broken on every page.
- **Priority / Importance / Effort:** High / Medium / S
- **Dependencies:** none
- **Recommendation:** For now, point the link at `/campaigns/new`. Build a real list page once campaigns are saved (G6).

#### G2 · Every displayed time is in UTC but labelled as Manila time
- **Type:** Broken
- **Evidence:**
  - Mock posts store UTC, e.g. `"2026-09-26T02:00:00.000Z"`.
  - The UI just cuts the text: `scheduledAt.slice(11,16)` in the dashboard, content and calendar pages, and `startsWith(DEMO_DATE)` for grouping by day.
  - So a 10:00 AM Manila post shows as "2:00 AM", and the recommended 6 PM slot shows as "10:00 AM".
  - Posts between 16:00 and 24:00 UTC land on the wrong day.
  - `formatDate` and `toDateString` in `src/utils` use the server's local timezone.
- **Expected:** All times shown in `Asia/Manila`, as the UI promises in the footer, settings page and publish step.
- **Impact:** Wrong times today. Once Supabase returns real `timestamptz` values, every date and time in the app will be wrong.
- **Priority / Importance / Effort:** High / High / S–M
- **Dependencies:** none. Must land before Phase 5.
- **Recommendation:**
  - Add one timezone-aware date module (Intl with `timeZone: DEFAULT_TIMEZONE`).
  - It should handle display formatting, getting the Manila date for a timestamp, and converting the wizard's Manila date and time into a UTC ISO string.
  - Ban string slicing on timestamps.

#### G3 · The Supabase clients read environment variables that don't exist
- **Type:** Broken (not yet triggered)
- **Evidence:** See D2. `client.ts` and `server.ts` use `!` non-null assertions on variables that are undefined.
- **Impact:** The first real Supabase call will throw. This blocks all of Phase 5.
- **Priority / Importance / Effort:** Critical / Critical / S
- **Dependencies:** none
- **Recommendation:**
  - Standardise on the publishable and secret keys (the vendored `supabase-server` skill recommends them over the legacy anon and service-role keys).
  - Validate the variables once with Zod in a single `src/lib/env.ts`, so a missing key fails loudly at startup.
  - Pass the `Database` type to the clients.
  - Add a `.env.example`.

#### G4 · `proxy.ts` is fragile and runs on every request
- **Type:** Poorly implemented
- **Evidence:**
  - A leftover debug `console.log` runs on every request and checks a misspelled variable (`NEXT_PUBLIC_PUBLISHABLE_KEY`).
  - `supabase.auth.getUser()` makes a network call to Supabase on every page navigation, even though nothing uses auth yet.
  - If the environment variables are missing (for example on a preview deploy), `createServerClient` throws and every route fails with a 500.
- **Impact:** Slower pages, noisy logs, and the whole site goes down when one variable is missing.
- **Priority / Importance / Effort:** High / Medium / S
- **Dependencies:** G3
- **Recommendation:** Remove the log, share the env module from G3, and add redirects for protected routes when auth arrives (G11).

#### G5 · The mobile sidebar stays open after you tap a link
- **Type:** Broken
- **Evidence:** In `src/components/layout/AppSidebar.tsx`, the `Link`s never call `onClose`, and nothing resets `sidebarOpen` when the page changes. There's also no Escape key handling or focus trap.
- **Impact:** On a phone, every navigation leaves the drawer covering the page. Our small-business users are likely to use phones heavily.
- **Priority / Importance / Effort:** High / Medium / S
- **Dependencies:** none
- **Recommendation:** Close the drawer when the path changes, and add Escape handling and focus management.

### Core functionality

#### G6 · The campaign wizard can't finish, and nothing can be saved anywhere
- **Type:** Missing
- **Evidence:**
  - In `src/components/campaigns/PublishStep.tsx`, "Schedule campaign", "Publish now" and "Save draft" have no handlers.
  - The services are read-only; there's no `createCampaign` or similar.
  - There are no Server Actions or Route Handlers anywhere.
- **Expected:** This is the core loop: goal → content → schedule → it appears in the calendar and content library.
- **Impact:** The product's main value can't be demonstrated end to end.
- **Priority / Importance / Effort:** Critical / Critical / M
- **Dependencies:** G3, G9, G10, G11, G12
- **Recommendation:**
  - Add write functions to the services (`createCampaignWithPosts`, `saveDraft`) behind Server Actions.
  - Validate with `CampaignDraftSchema` and write to Supabase.
  - **Don't** build the client-side Zustand store suggested in `.bob/artifacts/…missing-features.html`; it would be thrown away in Phase 5.

#### G7 · Wizard captions go stale and are hard-coded to the demo café
- **Type:** Incomplete
- **Evidence:**
  - `CampaignContext.nextStep` only generates captions when none exist yet. If you go back and change the product, goal or promotion, the old captions stay.
  - Captions, the preview header and hint text hard-code "Juan's Café, Cebu City", "Friendly · Taglish" and the "Friday 6 PM" date.
  - The brand profile's tone, language and call to action are ignored.
  - Captions are generated for all 3 platforms before the owner picks platforms.
  - The platform step ignores which accounts are actually connected.
- **Impact:** The wizard contradicts itself, and any new business would see "Juan's Café" in its content.
- **Priority / Importance / Effort:** Medium / High / S
- **Dependencies:** G10. The actual text generation is replaced by the AI layer later.
- **Recommendation:**
  - Regenerate (after confirming) when the inputs change.
  - Pull all business details from the business and brand profile.
  - Consider choosing platforms before generating content.

#### G8 · Nothing is validated, and the forms don't match their schemas
- **Type:** Mismatch / Missing
- **Evidence:**
  - `CampaignDraftSchema`, `ProductFormSchema` and `BrandFormSchema` (`src/lib/validation/schemas.ts`) are never imported.
  - The wizard accepts an empty goal, dates in the past and empty captions.
  - The brand form's field names (`hours`, `audience`, `age`, `interests`, `color`, `cta`, `language`, `guidelines`) don't match the schema or database names.
  - "Audience location" has no database column.
  - The brand schema types `tone` and `language` as plain `z.string()` instead of the enums.
- **Impact:** Bad data will reach the database as soon as writes exist.
- **Priority / Importance / Effort:** High / High / S–M
- **Dependencies:** should land together with G6 and G12
- **Recommendation:**
  - Validate on the server inside each Server Action, and reuse the same schema on the client.
  - Align the field names.
  - Either add an audience-location column or drop the field.

#### G9 · Pages are client components that read mock data directly
- **Type:** Tech debt that blocks Phase 5
- **Evidence:** See D1. Content, calendar, analytics, brand, assistant, social accounts and the wizard are whole-page `"use client"` components. They can't call async server services.
- **Expected:** Per `CLAUDE.md`, data flows UI → service → data, and pages are Server Components by default.
- **Impact:** Every one of these pages has to be restructured before it can show real data. Wiring more mock interactions into them now adds work we'd then have to undo.
- **Priority / Importance / Effort:** High / High / M
- **Dependencies:** none. **This blocks G6 and Phase 5.**
- **Recommendation:** Split each page into a server `page.tsx` that fetches through a service, plus a small client component that receives the data as props.

#### G10 · The demo identity is hard-coded throughout
- **Type:** Incomplete
- **Evidence:**
  - `DEMO_BUSINESS_ID` is defined twice: `app/(dashboard)/layout.tsx` and `dashboard/page.tsx`.
  - "Juan Dela Cruz" / "JD" is hard-coded in the sidebar and top bar.
  - "Juan's Café" appears throughout the wizard.
  - `"2026-09-26"` is hard-coded in the dashboard and calendar, even though `constants.DEMO_DATE` exists.
  - The calendar starts on September 2026, and its "Today" button jumps there too.
  - Services accept `businessId` but ignore it.
- **Impact:** Multiple users or businesses can't work; everyone sees the same café.
- **Priority / Importance / Effort:** High / High / S–M
- **Dependencies:** G11
- **Recommendation:** Add a `getCurrentContext()` helper that returns the signed-in user and their business, and use the real current date.

#### G11 · There's no login, sign-up or onboarding
- **Type:** Missing
- **Evidence:**
  - There's no `(auth)` route group and no route protection.
  - The owner can't sign out.
  - The `handle_new_user` trigger creates a business called "My Business" with no products, but there's no onboarding to fill in the brand profile or add a first product.
- **Impact:** Without a signed-in user, the database's row-level security blocks every read and write, so nothing real can happen.
- **Priority / Importance / Effort:** Critical / Critical / M–L
- **Dependencies:** G3, G4
- **Recommendation:** Supabase Auth with email and password (optionally Google), protected routes in `proxy.ts`, and a short onboarding: business basics, then a first product.

#### G12 · Owners can't add or edit products, but every campaign needs one
- **Type:** Missing
- **Evidence:**
  - "Add product", "Edit product" and the wizard's "Add new product" buttons have no handlers.
  - In the database, `campaigns.product_id` is required and can't be deleted while in use.
  - The products page shows availability using the post-status badge, so available products say "✓ Published" and unavailable ones say "Failed".
- **Impact:** A new owner can't create any campaign.
- **Priority / Importance / Effort:** Critical / Critical / M
- **Dependencies:** G8, G9, G10, G11, plus image upload to Supabase Storage
- **Recommendation:** Product create and edit through a dialog and a Server Action, image upload to a Storage bucket, and a proper availability badge.

### Database & Supabase

#### G13 · The Supabase project setup is incomplete
- **Type:** Incomplete
- **Evidence:**
  - There's no `supabase/config.toml`, so no local Supabase stack, no `gen types --local`, and no tracked migration workflow.
  - The seed data sits in `migrations/006_seed.sql`, so it runs in **every** environment, including production.
  - The seed inserts a profile for a user that doesn't exist, which violates the foreign key unless that user was created first.
  - `src/lib/supabase/database.types.ts` is written by hand, lacks the `Views`, `Functions` and `CompositeTypes` keys, and isn't passed to any client, so every query is untyped.
- **Impact:** Seed data could end up in production, fresh setups can fail, and database query types don't match the schema.
- **Priority / Importance / Effort:** High / High / S
- **Dependencies:** none
- **Recommendation:** Run `supabase init`, move the seed to `supabase/seed.sql`, generate the types, and type the clients.

#### G14 · Database security
- **Type:** Poorly implemented
- **(a) Unpinned `search_path`.** `get_user_business_ids`, `increment_campaign_count` and `derive_campaign_status` are `security definer` functions without `set search_path`. Supabase's linter flags this. *Priority Medium, Effort S.*
- **(b) Cross-business product references.** The row-level security rules for inserting campaigns and posts don't check that the product belongs to the same business. A user who knows another business's product ID could reference it. That would bump the other business's `campaign_count` (the trigger runs with elevated rights) and stop them deleting that product. *Priority Medium, Effort S.*
- **(c) Plain-text OAuth tokens.** `social_accounts.access_token` and `refresh_token` are stored as plain text, and the owner's read rule would send them to the browser. *Importance Critical, Priority Low until social publishing starts.* Move them to Supabase Vault or a server-only table before any real account is connected.
- **(d) Slow policies.** The security rules call `auth.uid()` directly instead of `(select auth.uid())`, and the post rules use nested subqueries, which slows queries as data grows. *Priority Low.*
- **Dependencies:** none. Since the migrations have already been run, fix these with a **new** migration (`007_…`) rather than editing old ones.

#### G15 · Denormalised fields can drift
- **Type:** Tech debt
- **Evidence:**
  - `derive_campaign_status` doesn't run when a post is deleted.
  - `campaign_count` isn't adjusted when a campaign's `product_id` changes.
  - Plan limits are defined in three places: `SUBSCRIPTION_PLANS`, the subscription table defaults, and the hard-coded 5/10 in `handle_new_user`.
  - Nothing enforces usage limits.
- **Priority / Importance / Effort:** Low / Medium / S
- **Dependencies:** G6

### Reliability

#### G16 · New accounts with no data will crash, and there are no error or loading pages
- **Type:** Missing
- **Evidence:**
  - The dashboard renders `<Image src={posts[0]?.product.imageUrl ?? ""}>`; an empty `src` throws.
  - The assistant page reads `recommendations[0..2]` directly and crashes if there are fewer than 3.
  - The subscription `ProgressBar` divides by the limit (0 gives `NaN`) and isn't capped at 100%.
  - There are no `error.tsx`, `loading.tsx` or `not-found.tsx` files.
- **Impact:** Every brand-new user has zero data, so they'll hit these crashes first.
- **Priority / Importance / Effort:** High (as soon as real data flows) / High / M
- **Dependencies:** G9
- **Recommendation:**
  - Add error and loading pages per route group.
  - Treat the empty state as the default design, not a special case. This also covers the Settings toggle "Explore as a new business", which currently does nothing.

#### G17 · There are no tests
- **Type:** Missing
- **Evidence:** There's no test runner or test files.
- **Priority / Importance / Effort:** Medium / High / M
- **Dependencies:** G2, G6
- **Recommendation:** Highest-value first targets:
  - The timezone module (G2).
  - Service functions.
  - Row-level security isolation, using pgTAP or a script that signs in as two users.
  - One Playwright test of the wizard's happy path.

#### G18 · No CI, and the lockfile churns
- **Type:** Tech debt
- **Evidence:**
  - Nothing runs lint or build on pull requests.
  - `package-lock.json` shows diffs that remove `libc` fields, which suggests teammates are on different npm versions.
- **Priority / Importance / Effort:** Low / Medium / S
- **Recommendation:** Add a GitHub Action for lint and build, and pin npm with `packageManager` or `engines`.

### UX, consistency & polish

#### G19 · Many controls look like they work but do nothing
- **Type:** Incomplete
- **Evidence:**
  - "Why this recommendation?" and the notifications bell.
  - Upgrade and Manage subscription.
  - Reuse / Duplicate / Edit on content cards.
  - Calendar post chips (styled as clickable), and the calendar Week view (renders the month grid).
  - The "fresh mode" and "include prices" settings.
  - Connect / Disconnect on social accounts (local state only).
- **Impact:** This erodes trust, especially for non-technical owners.
- **Priority / Importance / Effort:** Medium / Medium / M total
- **Recommendation:**
  - Until the real feature exists behind each control, **hide or disable it with a "coming soon" note** rather than faking it.
  - Build Reuse, Duplicate and Edit after G6, since they depend on saved campaigns.
  - Decide whether Google Business is in scope (D6).

#### G20 · Accessibility
- **Type:** Poorly implemented
- **Evidence:**
  - Filter tabs and the Month/Week toggle have no `aria-pressed` or `role="tab"`.
  - Goal and product picker buttons don't indicate which one is selected.
  - Calendar chips are clickable `div`s.
  - Inputs remove the focus outline (`focus:outline-none`) and only change the border colour.
  - "✓ Saved" isn't announced to screen readers (no `aria-live`).
  - The drawer issues are covered in G5.
- **Priority / Importance / Effort:** Low–Medium / Medium / S–M
- **Recommendation:** Fix these while restructuring the pages in G9; that's the cheapest time.

#### G21 · Styling and code duplication
- **Type:** Tech debt
- **Evidence:**
  - Hex colours are hard-coded everywhere.
  - The shadcn `Button` is installed but never used; every button repeats the same long class string.
  - `PLATFORM_LABELS` is redefined in 4 wizard files, even though `platformLabel()` exists.
  - `DEMO_DATE` is defined in several places.
- **Priority / Importance / Effort:** Low / Low / M
- **Recommendation:** Before building more UI, add `Button` variants and a few semantic colour utilities so new code doesn't copy the pattern further. Clean up old pages when you touch them anyway.

#### G22 · The README is out of date
- **Type:** Mismatch
- **Evidence:** The phase table is stale, and `.env.example` and `src/hooks/` are missing.
- **Priority / Importance / Effort:** Low / Low / S
- **Recommendation:** Fix it together with G3.

### Future work (planned, not gaps yet)

- **G23 · AI layer.** Design usage-limit enforcement and cost controls together with it. The recommendations and "Ask Keh" answers are currently hard-coded.
- **G24 · Publishing jobs.** Nothing moves a post from `SCHEDULED` to `PUBLISHING` to `PUBLISHED` yet. We need to choose how scheduled work runs (pg_cron plus an Edge Function, or a hosted cron) before "Schedule" can actually publish anything. Until then, "Schedule" should only save the post as `SCHEDULED`.

---

## Prioritized roadmap (in dependency order)

| Rank | Issue | Priority | Importance | Impact | Effort | Depends on | Why it's here |
|---|---|---|---|---|---|---|---|
| 1 | G3 Supabase env and clients | Critical | Critical | Every database call would fail | S | – | 30 minutes, and it unblocks everything else |
| 2 | G13 Supabase project setup, seed, types | High | High | Seed data in production, untyped queries | S | – | Must be right before any real data exists |
| 3 | G14a/b Database security fixes (migration 007) | High | High | Cross-business data tampering | S | G13 | Cheapest now, before real rows exist |
| 4 | G2 Timezone module | High | High | Every time is wrong | S–M | – | Real `timestamptz` data would make it worse |
| 5 | Quick fixes: G1 404, G5 drawer, G4 proxy | High | Medium | Visible breakage | S | G3 (for G4) | Cheap, visible, no dependencies |
| 6 | G11 Login, sign-up, route protection | Critical | Critical | Nothing real can happen without a user | M–L | G3, G4 | The root of the dependency tree |
| 7 | G10 Real user and business context | High | High | Everyone sees the demo café | S–M | G11 | Every service call needs it |
| 8 | G9 Server pages + client components | High | High | Blocks reading real data | M | G10 | Must come before wiring any page to Supabase |
| 9 | G12 Product create/edit + image upload | Critical | Critical | New users can't make campaigns | M | G8, G9, G11 | Campaigns require a product |
| 10 | G6 + G8 Saving campaigns, with validation | Critical | Critical | Core loop missing | M | G9, G12 | The product's reason to exist |
| 11 | G16 Empty states and error pages | High | High | New users hit crashes | M | G9 | New users start with no data |
| 12 | G7 Wizard correctness (captions, brand data) | Medium | High | Wrong or stale content | S | G10 | Makes the core loop trustworthy |
| 13 | G17 + G18 Tests and CI | Medium | High | Regressions go unnoticed | M | G2, G6 | Lock in the core loop before the AI work |
| 14 | G19 Dead controls: hide or build | Medium | Medium | Erodes trust | M | G6 | Reuse/Duplicate need saved campaigns |
| 15 | G20, G21, G15, G22 | Low | Low–Med | Quality and maintainability | M | – | Do these while you're in those files |
| 16 | G14c tokens, G23 AI, G24 publishing | Low now | Critical later | Needed for the AI and social phases | L | All of the above | G14c must land before the first real account connection |

### Dependency warnings

- **Don't do Phase 3b as currently planned.** A client-side store for wizard output, product modals backed by local state, and fake brand-profile saves would all be rebuilt once data is persisted. Go straight to Server Actions and Supabase instead.
- **Don't wire any page to Supabase before G9.** Otherwise the page gets converted twice.
- **Don't start the AI layer before G6 and G8.** The AI needs a validated draft shape and a place to save its output.
- **Fix G2 before real data arrives.** Once `timestamptz` values come from Postgres, the same string-slicing bug affects every screen.

---

## Must fix / Should fix / Could improve / Nice to have

| Bucket | Items |
|---|---|
| **Must fix** | G3, G13, G14a/b, G2, G1, G5, G11, G10, G9, G12, G6, G8, G16 |
| **Should fix** | G4, G7, G17, G18, G14c (before social publishing), G19 (hide dead controls) |
| **Could improve** | G20, G21, G15, G14d, G22 |
| **Nice to have** | Calendar week view and drag-to-reschedule, notifications panel, a Google Business integration if it's in scope, the "fresh mode" demo toggle once real empty states exist |

---

## Proposed implementation phases

This replaces the phase order currently in `CLAUDE.md` and the README.

### Phase 1: Blockers (about 1–2 days)
G3 → G13 → G14a/b (migration 007) → G2 → G1, G5, G4

### Phase 2: The real core loop
G11 (auth and onboarding) → G10 → G9 → G12 → G6 + G8 → G16

**Exit criteria:** A new owner can sign up, add a product, create a campaign, and see it in the calendar and content library, all saved in Supabase.

### Phase 3: Reliability and quality
G7, G17, G18, G15, and hide the dead controls from G19.

### Phase 4: UX and polish
G20, G21, the remaining G19 features (Reuse/Duplicate/Edit, post detail from the calendar, week view), and G22.

### Phase 5: Future work (the old roadmap's Phases 6–8)
G14c token storage → G23 AI with usage limits → G24 publishing jobs and social adapters → metrics and learning.

---

## What to do next

> Updated 2026-09-27. The original recommendation (auth + real business context) is done — see [Progress](#progress-since-the-audit).

**First, a 2-minute setup step:** apply `supabase/migrations/008_product_images.sql` in the Supabase SQL editor, or product photo uploads will fail.

**Next task: make the brand profile editable, then generate captions with AI.**

**Why this order.** The core loop works, but the product's promise is "the AI handles the marketing". Right now captions are template strings. AI captions are the biggest remaining gap between the demo and the pitch. They need good inputs, and the brand page (tone, language, call to action, audience) is still a mock form that doesn't save — so the AI would be writing from defaults.

**1. Brand profile save (small).**
- `src/app/(dashboard)/brand/`: server page + client form, following the `products/` pattern.
- `business.service.ts`: `updateBusiness` and `updateBrandProfile`.
- `BrandFormSchema` in `lib/validation/schemas.ts`: align field names with the form (see G8) and use the enums for tone, language and CTA.
- Outcome: the wizard's captions and hints reflect what the owner saved.

**2. AI captions (medium).**
- Implement `generateCampaign()` in `lib/ai/ai.service.ts` (server-only), called from a Server Action.
- Input: business, brand profile, product, goal, promotion, instructions, platforms. Output: one caption per platform, validated with Zod.
- Replace `buildCaptions` in `CampaignContext.tsx`; keep the template as a fallback when the API fails.
- Count usage against `subscriptions.ai_campaigns_used` so the free tier limit means something.
- Needs a decision on the AI provider and an API key in `.env`.

**Then:** demo polish — hide or disable unwired controls (G19), replace the dashboard's hard-coded recommendation card, add `error.tsx` / `loading.tsx` (G16), and product/campaign delete.
