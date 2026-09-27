@AGENTS.md

# Keh — project context

Keh is an AI-powered social media management SaaS for **small business owners**. The core product idea: the owner makes *business* decisions (which product, what promotion, what goal, when), and the AI makes the *marketing* decisions (captions, platform tailoring, posting time, what worked). When designing UI or copy, minimise cognitive load for a non-marketer — plain language, sensible defaults, few choices per step.

The app is a refactor of an earlier vanilla-JS prototype ("@Sites" / formerly "Suki"), built as a **hackathon MVP**: favour the smallest change that makes the core loop real over polish.

**Core loop (working end to end on Supabase):** sign up → add a product → create a campaign in the wizard (AI writes the captions) → it's scheduled and shows in Campaigns, Calendar, Content and Home. Campaigns can be edited, rescheduled and deleted.

**Publishing is a placeholder in the MVP.** Posting to Facebook / Instagram (pg_cron job → `SocialPublisher` adapters) and hourly metrics collection are built but switched off unless `PUBLISHING_ENABLED=true`; with it off, "Schedule" and "Publish now" only save posts as `SCHEDULED`. Don't remove or rewire this code without asking — it's kept for when the team finishes publishing.

**Deployment isn't decided** — no host chosen, nothing deployed. The README's "Deployment" section lists the requirements and options (note Vercel's ~4.5 MB request-body limit vs. our 5 MB photo uploads).

The original audit and roadmap are in [docs/GAP_ANALYSIS.md](docs/GAP_ANALYSIS.md) (gaps G1–G24); "Known gaps" below is the current list.

## Commands

```bash
npm run dev        # dev server on http://localhost:3000 (also regenerates AGENTS.md)
npm run build      # production build — the closest thing to a type check
npm run lint       # ESLint (next core-web-vitals + typescript)
npm test           # Vitest (src/**/*.test.ts); npm run test:watch while developing
npm run seed:demo -- --email <owner>   # ~8 weeks of demo posts + metrics (--reset removes them)
```

CI (`.github/workflows/ci.yml`) runs lint, tests and build on every PR. Tests cover pure logic and the platform adapters (Meta API mocked with a stubbed `fetch`); there are no end-to-end tests, so also check changes in the running app. The `supabase` CLI is a dev dependency, but the project isn't linked (no `supabase/config.toml`).

**Line endings:** the repo is checked out with CRLF (`core.autocrlf=true`). The Edit tool handles this; scripted multi-line find/replace must normalise `\r\n` first or it silently won't match.

## Stack (versions matter — check docs, not memory)

- **Next.js 16** App Router. Breaking changes vs older Next — read `node_modules/next/dist/docs/` before using an API. Middleware is **`src/proxy.ts`** exporting `proxy()`. `error.tsx` receives `{ error, retry }` (not `reset`). Server Action body limit is 11 MB in `next.config.ts` (the brand form can send two 5 MB images).
- **React 19**, **TypeScript strict**, path alias `@/*` → `src/*`.
- **Tailwind CSS v4** (CSS-first config in `src/app/globals.css`) + **shadcn/ui** (`base-nova` style on `@base-ui/react`, not Radix). Add primitives with `npx shadcn add <name>`.
- **Zod 4**, **Recharts 3**, **lucide-react**.
- **Supabase** (`@supabase/ssr`, `@supabase/supabase-js`) — Auth, Postgres (RLS), Storage, Realtime. `@supabase/server` is installed but unused.
- **AI:** Gemini (default) or OpenAI, called with `fetch` from `lib/ai/providers.ts` — no SDK installed.

## Architecture

```
src/
├── app/
│   ├── error.tsx, not-found.tsx       # last-resort error page (outside the app shell), 404
│   ├── (auth)/                        # login, signup, forgot-password, reset-password + actions.ts
│   ├── (dashboard)/                   # signed-in app, shares DashboardLayout (sidebar, topbar, copilot, LiveRefresh)
│   │   ├── error.tsx, loading.tsx     # error/loading states inside the app shell
│   │   ├── dashboard/                 # Home: stats, today/tomorrow, recommendation card, insights
│   │   ├── campaigns/ (+ new/, [id]/edit/)  # list + wizard; actions.ts (saveCampaign create/edit,
│   │   │                              # removeCampaign, markTikTokPosted); wizard-business.ts
│   │   ├── calendar/, content/        # month calendar, content library
│   │   ├── products/                  # ProductsView + ProductDialog + PhotoPicker; actions.ts (saveProduct, removeProduct)
│   │   ├── analytics/                 # AnalyticsView (lib/analytics on real posts)
│   │   ├── assistant/                 # AI chat page + recommendations + "What your results show"
│   │   ├── brand/                     # BrandForm; actions.ts (saveBrandProfile)
│   │   ├── social-accounts/ (+ choose/)  # connect/disconnect, pick a Page; actions.ts
│   │   ├── subscription/              # plan + usage (read-only)
│   │   ├── settings/                  # account: password, email, delete account (actions.ts)
│   │   └── recommendation-actions.ts  # refreshRecommendations, dismissRecommendation
│   ├── api/assistant/                 # POST — AI chat (own auth check; see proxy.ts)
│   ├── api/social/connect/[platform]/ # starts Meta OAuth (facebook | instagram)
│   ├── api/cron/publish, api/cron/metrics   # jobs called by pg_cron (Bearer CRON_SECRET)
│   └── auth/callback, auth/social/callback  # auth emails (with ?next=); Meta OAuth callback
├── components/                        # by feature: campaigns (wizard + WizardAiCopilot), assistant, dashboard,
│                                      # analytics, brand, social-accounts, layout, auth, ui (shadcn + Keh primitives)
├── hooks/useMarketingAssistant.ts     # chat state + handing AI-filled campaigns to the wizard
├── services/                          # data access, all Supabase: business, product, campaign, analytics,
│                                      # recommendation, social-account, storage, publishing (jobs), batch
├── lib/
│   ├── ai/                            # ai.service (chat + guided engine), providers (Gemini/OpenAI),
│   │                                  # context (what the AI knows), recommendations, rate-limit
│   ├── analytics.ts                   # pure findings/insights/recommendedSlot from posts + metrics
│   ├── auth/context.ts                # getCurrentContext() → { user, business }; redirects to /login
│   ├── social/                        # meta (Graph API), publishers (Facebook, Instagram), publisher.interface,
│                                      # token-crypto (AES-GCM), oauth-state (CSRF nonce, page pick), connect-errors
│   ├── cron-auth.ts, request-origin.ts
│   ├── supabase/                      # client.ts, server.ts (server + admin), database.types.ts (hand-written)
│   └── validation/schemas.ts          # Zod schemas
├── types/index.ts                     # domain model (single source of truth for TS types)
├── constants/                         # platforms, statuses, goals, nav, SUBSCRIPTION_PLANS, DEFAULT_TIMEZONE…
└── utils/                             # formatting, datetime (Manila-time helpers), recommendations
supabase/migrations/                   # 001–005, 007–016 (there is no 006)
supabase/seed.sql                      # old dev seed (was migration 006); prefer `npm run seed:demo`
scripts/seed-demo-data.mjs             # demo history generator (secret key)
```

**Auth flow:** `proxy.ts` refreshes the session and optimistically redirects signed-out users to `/login` (and signed-in users away from `/login`, `/signup`, `/forgot-password`); `/auth/*`, `/api/assistant` and `/api/cron/*` are exempt (they check auth themselves). Auth emails (confirm, reset password, change email) link to `/auth/callback?next=<path>`; `safeNextPath` only allows same-site paths. The authoritative check is `getCurrentContext()`, called by the `(dashboard)` layout, every server page and every Server Action. Never hard-code a business ID.

### Patterns to follow

- **Pages:** a server `page.tsx` calls `getCurrentContext()` + services and passes plain data to a `"use client"` view. Don't make whole pages client components.
- **Mutations:** a `"use server"` `actions.ts` next to the route. Each action calls `getCurrentContext()`, validates with Zod (`lib/validation/schemas.ts`), re-checks ownership of any referenced row, calls a service write function, then `revalidatePath(...)` for every page that shows the data. Return `{ error }` / `{ fieldErrors }`; `redirect()` on success when navigating away.
- **Forms:** `useActionState`, submitted via `onSubmit` + `startTransition(() => formAction(formData))` rather than `<form action>` — React 19 resets action-driven forms after every submit (see `AuthForm`, `ProductDialog`).
- **Dialogs:** native `<dialog>` + `showModal()` — see `ProductDialog`.
- **Services** map DB rows (snake_case) to domain types (camelCase) with a `toX(row)` mapper, use `createServerClient()` so RLS applies, and also filter by `businessId`.
- **Dates/times:** use `@/utils/datetime` (`manilaDateKey`, `manilaTime`, `todayKey`, `manilaToUtcIso`, `formatDateKey`, `nextWeekday`…). The DB stores UTC `timestamptz`; the UI shows `Asia/Manila`. Never slice ISO strings.
- **Images:** photos are optional (`imageUrl` may be `""`), so guard every `<Image>`. Uploads go through `storage.service.ts` (type/size checked, extension from the MIME type).
- **Live refresh:** `LiveRefresh` subscribes to Realtime changes for the business and calls `router.refresh()`; new tables that pages display should be added to its list (and to the `supabase_realtime` publication).
- **URL messages:** never render free text from the query string; pass a code and map it (see `lib/social/connect-errors.ts`).

### AI layer (`lib/ai/`)

- **Server-only.** Client code talks to `POST /api/assistant` (chat) or the `refreshRecommendations` Server Action. Model output is parsed with Zod and passed through `sanitizeResponse` / `sanitize` (only real ACTIVE product IDs, future dates, bounded text).
- **Guided engine:** with no API key, or when the model fails or returns junk, a rules-based engine answers from the same context — the app must work with no AI key.
- **Cost controls:** `usesModel()` skips the model for "best time" and results questions (answered by the guided engine). Only model calls count against `consume_ai_request` (migration 009), capped per plan by `SUBSCRIPTION_PLANS[].aiRequestsPerDay`; if the limiter is unavailable it fails closed to guided mode. Providers cap thinking (`GEMINI_THINKING_LEVEL`), set per-task output budgets, send a JSON schema as structured output, make at most 2 upstream calls, and put failing models on a per-process cooldown. Every call logs `[ai] <label> <model> in=… out=… thinking=…`.
- **Prompts send only what the intent needs** (`promptContext` in `ai.service.ts`); keep new context small.
- **Recommendations** are stored in `ai_recommendations`, generated automatically from Home when missing or over a week old (`getRecommendationState`), and on demand via "New ideas" (1-hour cooldown).
- **Wizard captions:** moving from Goal to Content shows template captions at once (`buildCaptions`), then — when a model is configured (`WizardBusiness.aiEnabled`) — asks the in-wizard copilot to write them (`writeCaptions` → `askWizardCopilot(…, "captions")`), applied with the usual AI banner and Undo.

### Publishing

- **Switch:** `isPublishingEnabled()` (`PUBLISHING_ENABLED`, default off) gates "Publish now" and both `/api/cron/*` routes; the wizard copy follows `WizardBusiness.publishingEnabled`.
- **Statuses:** "Save draft" → `DRAFT`; "Schedule" → `SCHEDULED` at the chosen time; "Publish now" → `SCHEDULED` now, then (only when enabled) `publishDuePosts({ campaignId })` runs immediately. TikTok posts are `ACTION_REQUIRED`; the owner posts them and clicks "I posted it" (`markTikTokPosted`).
- **The job:** pg_cron (migration 016) POSTs `/api/cron/publish` every 5 minutes and `/api/cron/metrics` hourly, with `Authorization: Bearer CRON_SECRET`. `publishDuePosts` claims due posts atomically (`claim_due_posts`, `FOR UPDATE SKIP LOCKED` → `PUBLISHING`), publishes through `getPublisher(platform)`, and records `PUBLISHED` + `external_post_id` or `FAILED` + `last_error` (owner-facing text, shown on Campaigns and Content). Posts stuck in `PUBLISHING` are failed, never retried, so nothing is posted twice.
- **Adapters** (`lib/social/publishers.ts`) implement `SocialPublisher` over `lib/social/meta.ts`: Facebook posts a photo (`/{page}/photos`) or text (`/{page}/feed`); Instagram creates a media container, waits for `FINISHED`, then `media_publish` (needs a photo; Instagram only accepts JPG). Errors become plain-language `PublishResult.error`s; code 190 means "reconnect".
- **Tokens** are AES-256-GCM encrypted with `SOCIAL_TOKEN_KEY` (`token-crypto.ts`) before they're stored, and only decrypted in `getPublishingAccount` (admin client). Owners with several Pages pick one on `/social-accounts/choose` (the user token waits in an encrypted 10-minute cookie).
- Editing is blocked once any post is `PUBLISHING`/`PUBLISHED` (`isCampaignEditable`). Deleting a campaign removes it from Keh only, not from Facebook/Instagram.

### Rules

- **Social platforms go through `SocialPublisher`**; don't call the Graph API from pages or actions directly.
- **Supabase clients:** `createBrowserClient()` in client code; `createServerClient()` in server code (RLS); `createAdminClient()` bypasses RLS — trusted server code only (tokens, the publish/metrics jobs, quota release, recommendation writes, account deletion, seed script).
- **RLS ownership chain:** `auth.uid() → profiles.id → businesses.owner_id → <table>.business_id`, via `get_user_business_ids()`. Every new table needs RLS plus policies on this chain. Storage paths are `<business_id>/…` in the `product-images` bucket.
- **Migrations:** numbered SQL files applied by hand in the Supabase SQL editor. Once applied, fix schema/RLS with a new migration, never by editing an old one. Newer ones to check are applied: 009 (AI rate limit), 010 (plan usage), 011 (realtime), 012 (recommendations), 013 (dismiss-only updates), 014 (scheduled-post quota for edits) and 015 (publishing: `last_error`, claim/metrics functions, delete-aware status trigger) are applied; **016 (pg_cron jobs) is intentionally not applied** — only run it after deploying and switching publishing on (README). Code degrades gracefully when 009/010/012/014 are missing, but limits then don't apply; publishing needs 015 + 016 + `PUBLISHING_ENABLED=true`.
- **Deleting a user:** campaigns reference products `ON DELETE RESTRICT`, so delete the business's campaigns before the auth user (see `deleteAccount`), or the cascade fails.
- **`social_accounts` token columns aren't selectable by users** (column grants, 007) — select explicit columns (`SAFE_COLUMNS`), not `*`; writes go through the admin client.

### Domain model

`User → Business → { BrandProfile, Product[], SocialAccount[], Campaign[] → SocialPost[] → PostMetric[], AIRecommendation[], Subscription }`

- Platforms: `FACEBOOK | INSTAGRAM | TIKTOK`.
- Post status: `DRAFT | SCHEDULED | PUBLISHING | PUBLISHED | ACTION_REQUIRED | FAILED`. A campaign's status is derived from its posts by the `derive_campaign_status` trigger (on insert, status update and — since 015 — delete).
- A campaign has one product (`not null`, `on delete restrict`) and one post per platform. Only `ACTIVE` products can be used in a campaign (wizard + `saveCampaign`).
- `handle_new_user()` (007) creates a profile, a business named from the sign-up form, a brand profile and a FREE subscription.
- Enums are UPPER_SNAKE string unions.

**Kept in sync by hand:** enums in `src/types/index.ts`, `src/lib/validation/schemas.ts`, `src/lib/supabase/database.types.ts` and `supabase/migrations/001_enums.sql`; plan limits in `SUBSCRIPTION_PLANS`, the `subscriptions` defaults and `handle_new_user()`.

### Styling

- Brand tokens are `--keh-*` in `globals.css`, exposed as `bg-brand`, `text-brand-dark`, `text-brand-muted`, `border-brand-line`, `bg-brand-bg`, `bg-brand-light` (and `bg-primary`). New code uses these and the shadcn `Button`; older components still use hex values (`text-[#7b7b8b]`).
- Fonts: DM Sans (body), Manrope (headings) via `next/font/google`.
- Remote images: `*.supabase.co` storage and `images.unsplash.com` (used by `supabase/seed.sql`).

## Known gaps

**Major:**

1. **Deployment host not chosen** — see the README's "Deployment" section. Publishing (below) also waits on this.
2. **Onboarding, brand setup and billing** — planned as a guided onboarding after sign-up. Subscription "Upgrade" / "Manage" do nothing yet. (Usage counters reset lazily in `consume_campaign_quota` once `usage_resets_at` passes, so the page can show last month's usage until the next campaign is saved.)
3. **Publishing is switched off for the MVP and hasn't run against live Meta accounts.** The adapters are unit-tested with a mocked Graph API only. Before real owners can connect, the Meta app needs App Review for `pages_manage_posts`, `pages_read_engagement`, `read_insights`, `instagram_content_publish` and `instagram_manage_insights`; until then only app admins/testers can connect. Insight metric names change often — watch the `[cron] metrics` logs.
4. **Instagram needs JPG photos.** Uploads may be PNG/WebP/GIF; those Instagram posts fail with a message asking for a JPG. Converting on upload (or warning in the wizard) would remove the surprise.

**Minor / known:** pages still load a business's whole history (now in batches of 150 IDs, so no URL-length failures) — add pagination if accounts grow large; no end-to-end tests; campaign creation and edits aren't single transactions (edits update posts in place, so a failure never leaves a campaign empty); deleting a campaign doesn't remove published posts from the platforms or give back plan usage; AI model cooldowns are per server process; `database.types.ts` is hand-written; RLS lets an owner create extra businesses, which the app ignores (it always uses the first).

## Environment

- **Env vars** (see `.env.example`, validated in `src/lib/env.ts`): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`; optional `GEMINI_API_KEY` / `OPENAI_API_KEY` (+ `GEMINI_MODEL`, `GEMINI_FALLBACK_MODELS`, `GEMINI_THINKING_LEVEL`, `OPENAI_MODEL`) `META_APP_ID` / `META_APP_SECRET` + `SOCIAL_TOKEN_KEY` (connecting Facebook/Instagram), `PUBLISHING_ENABLED` (default off), and `CRON_SECRET` (only with publishing on; the same value goes in Vault as `keh_cron_secret`). `.env*` is gitignored except `.env.example`. **Never commit credentials.** Use the publishable/secret keys, not the legacy anon/service-role keys.
- **Auth emails:** confirmation, password reset and email change all land on `/auth/callback` (with `?next=`), which must be in the project's allowed redirect URLs. The reset link only works in the browser that asked for it (PKCE). For demos, turning off "Confirm email" is simplest.
- **Gemini free tier** has small daily quotas per model; when the main model is exhausted, requests fall back to the next model and then to guided mode. Watch the `[ai]` log lines.

## Agent skills

Supabase skills are vendored in `.agents/skills/` (mirrored in `.bob/skills/`, tracked in `skills-lock.json`): `supabase`, `supabase-postgres-best-practices`, `supabase-server`. Read the relevant `SKILL.md` before writing migrations, RLS policies, or code that imports `@supabase/server`.
