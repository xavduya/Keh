@AGENTS.md

# Keh — project context

Keh is an AI-powered social media management SaaS for **small business owners**. The core product idea: the owner makes *business* decisions (which product, what promotion, what goal, when), and the AI makes the *marketing* decisions (captions, platform tailoring, posting time, what worked). When designing UI or copy, minimise cognitive load for a non-marketer — plain language, sensible defaults, few choices per step.

The app is a refactor of an earlier vanilla-JS prototype ("@Sites" / formerly "Suki"), built as a **hackathon MVP**: favour the smallest change that makes the core loop real over polish.

**Core loop (working end to end on Supabase):** sign up → add a product → create a campaign in the wizard (optionally filled by the AI) → it appears in Campaigns, Calendar, Content and Home. The AI assistant, weekly recommendations, analytics (from `post_metrics`), brand profile, social account connections (Meta OAuth + TikTok username) and plan limits are all real. **Nothing is published to social platforms yet** — see "Known gaps".

The original audit and roadmap are in [docs/GAP_ANALYSIS.md](docs/GAP_ANALYSIS.md) (gaps G1–G24); "Known gaps" below is the current list.

## Commands

```bash
npm run dev        # dev server on http://localhost:3000 (also regenerates AGENTS.md)
npm run build      # production build — the closest thing to a type check
npm run lint       # ESLint (next core-web-vitals + typescript)
npm run seed:demo -- --email <owner>   # ~8 weeks of demo posts + metrics (--reset removes them)
```

There is no test suite and no CI. Verify changes with `npm run build` + `npm run lint`, and by running the app. The `supabase` CLI is a dev dependency, but the project isn't linked (no `supabase/config.toml`).

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
│   ├── (auth)/                        # login, signup + actions.ts (login / signup / signOut)
│   ├── (dashboard)/                   # signed-in app, shares DashboardLayout (sidebar, topbar, copilot, LiveRefresh)
│   │   ├── error.tsx, loading.tsx     # error/loading states inside the app shell
│   │   ├── dashboard/                 # Home: stats, today/tomorrow, recommendation card, insights
│   │   ├── campaigns/ (+ new/)        # list + wizard; actions.ts (saveCampaign)
│   │   ├── calendar/, content/        # month calendar, content library
│   │   ├── products/                  # ProductsView + ProductDialog + PhotoPicker; actions.ts (saveProduct)
│   │   ├── analytics/                 # AnalyticsView (lib/analytics on real posts)
│   │   ├── assistant/                 # AI chat page + recommendations + "What your results show"
│   │   ├── brand/                     # BrandForm; actions.ts (saveBrandProfile)
│   │   ├── social-accounts/           # connect/disconnect; actions.ts (disconnect, connectTikTok)
│   │   ├── subscription/, settings/   # plan + usage (read-only); account + timezone
│   │   └── recommendation-actions.ts  # refreshRecommendations, dismissRecommendation
│   ├── api/assistant/                 # POST — AI chat (own auth check; see proxy.ts)
│   ├── api/social/connect/[platform]/ # starts Meta OAuth (facebook | instagram)
│   └── auth/callback, auth/social/callback  # email confirmation; Meta OAuth callback
├── components/                        # by feature: campaigns (wizard + WizardAiCopilot), assistant, dashboard,
│                                      # analytics, brand, social-accounts, layout, auth, ui (shadcn + Keh primitives)
├── hooks/useMarketingAssistant.ts     # chat state + handing AI-filled campaigns to the wizard
├── services/                          # data access, all Supabase: business, product, campaign, analytics,
│                                      # recommendation, social-account, storage
├── lib/
│   ├── ai/                            # ai.service (chat + guided engine), providers (Gemini/OpenAI),
│   │                                  # context (what the AI knows), recommendations, rate-limit
│   ├── analytics.ts                   # pure findings/insights/recommendedSlot from posts + metrics
│   ├── auth/context.ts                # getCurrentContext() → { user, business }; redirects to /login
│   ├── social/                        # oauth-state (CSRF nonce), connect-errors, publisher.interface (stub)
│   ├── supabase/                      # client.ts, server.ts (server + admin), database.types.ts (hand-written)
│   └── validation/schemas.ts          # Zod schemas
├── types/index.ts                     # domain model (single source of truth for TS types)
├── constants/                         # platforms, statuses, goals, nav, SUBSCRIPTION_PLANS, DEFAULT_TIMEZONE…
└── utils/                             # formatting, datetime (Manila-time helpers), recommendations
supabase/migrations/                   # 001–005, 007–013 (there is no 006)
supabase/seed.sql                      # old dev seed (was migration 006); prefer `npm run seed:demo`
scripts/seed-demo-data.mjs             # demo history generator (secret key)
```

**Auth flow:** `proxy.ts` refreshes the session and optimistically redirects signed-out users to `/login` (and signed-in users away from `/login`/`/signup`); `/auth/*` and `/api/assistant` are exempt. The authoritative check is `getCurrentContext()`, called by the `(dashboard)` layout, every server page and every Server Action. Never hard-code a business ID.

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

### Rules

- **Social platforms go through `SocialPublisher`** (`lib/social/publisher.interface.ts`, still a stub). Nothing publishes yet: "Schedule" and "Publish now" save posts as `SCHEDULED` (TikTok as `ACTION_REQUIRED`); "Save draft" saves `DRAFT`.
- **Supabase clients:** `createBrowserClient()` in client code; `createServerClient()` in server code (RLS); `createAdminClient()` bypasses RLS — trusted server code only (token writes, quota release, recommendation writes, seed script).
- **RLS ownership chain:** `auth.uid() → profiles.id → businesses.owner_id → <table>.business_id`, via `get_user_business_ids()`. Every new table needs RLS plus policies on this chain. Storage paths are `<business_id>/…` in the `product-images` bucket.
- **Migrations:** numbered SQL files applied by hand in the Supabase SQL editor. Once applied, fix schema/RLS with a new migration, never by editing an old one. Newer ones to check are applied: 009 (AI rate limit), 010 (plan usage), 011 (realtime), 012 (recommendations), 013 (dismiss-only updates). Code degrades gracefully when 009/010/012 are missing, but limits then don't apply.
- **`social_accounts` token columns aren't selectable by users** (column grants, 007) — select explicit columns (`SAFE_COLUMNS`), not `*`; writes go through the admin client.

### Domain model

`User → Business → { BrandProfile, Product[], SocialAccount[], Campaign[] → SocialPost[] → PostMetric[], AIRecommendation[], Subscription }`

- Platforms: `FACEBOOK | INSTAGRAM | TIKTOK`.
- Post status: `DRAFT | SCHEDULED | PUBLISHING | PUBLISHED | ACTION_REQUIRED | FAILED`. A campaign's status is derived from its posts by the `derive_campaign_status` trigger.
- A campaign has one product (`not null`, `on delete restrict`) and one post per platform. Only `ACTIVE` products can be used in a campaign (wizard + `saveCampaign`).
- `handle_new_user()` (007) creates a profile, a business named from the sign-up form, a brand profile and a FREE subscription.
- Enums are UPPER_SNAKE string unions.

**Kept in sync by hand:** enums in `src/types/index.ts`, `src/lib/validation/schemas.ts`, `src/lib/supabase/database.types.ts` and `supabase/migrations/001_enums.sql`; plan limits in `SUBSCRIPTION_PLANS`, the `subscriptions` defaults and `handle_new_user()`.

### Styling

- Brand tokens are `--keh-*` in `globals.css`, exposed as `bg-brand`, `text-brand-dark`, `text-brand-muted`, `border-brand-line`, `bg-brand-bg`, `bg-brand-light` (and `bg-primary`). New code uses these and the shadcn `Button`; older components still use hex values (`text-[#7b7b8b]`).
- Fonts: DM Sans (body), Manrope (headings) via `next/font/google`.
- Remote images: `*.supabase.co` storage and `images.unsplash.com` (used by `supabase/seed.sql`).

## Known gaps

**Major (need design or real work):**

1. **No publishing or scheduler.** Posts stay `SCHEDULED` forever; "Publish now" just saves with the current time. Needs `SocialPublisher` adapters (Facebook, Instagram) and a job runner (e.g. Supabase cron + an Edge Function or a protected Route Handler).
2. **No metrics pipeline.** `post_metrics` is only filled by `seed:demo`, so real accounts have empty analytics, insights and no data-driven recommendations.
3. **Wizard captions are templates by default.** `buildCaptions` in `CampaignContext.tsx` uses generic copy (e.g. "Treat yourself today!", which the AI prompt bans); AI captions only appear when the owner asks the copilot. Consider generating AI captions automatically on the Content step (one model call per campaign).
4. **No campaign edit, delete or reschedule**, and no product delete (availability can be changed). Calendar and Content can't open a post.
5. **No password reset, password/email change, or account deletion.**
6. **Social tokens are stored in plain text** (hidden from users by column grants, but not encrypted — use Supabase Vault before real launch). Meta connect always picks the owner's *first* Page; no token revocation handling.
7. **Data loading doesn't scale.** Most pages load every campaign, post and metric row for the business; `getPosts` uses `.in(ids)` lists that hit URL-length limits at a few hundred campaigns. Needs pagination / date-range queries or a database view.
8. **No tests or CI.**
9. **Onboarding, brand setup and billing** — planned as a guided onboarding after sign-up. Subscription "Upgrade" / "Manage" buttons do nothing yet. (Usage counters reset lazily in `consume_campaign_quota` once `usage_resets_at` passes, so the page can show last month's usage until the next campaign is saved.)

**Minor / known:** campaign creation isn't a single transaction (the service deletes the campaign if its posts fail); `derive_campaign_status` ignores post deletes; AI model cooldowns are per server process; `database.types.ts` is hand-written; the RLS policies let an owner create extra businesses, which the app ignores (it always uses the first).

## Environment

- **Env vars** (see `.env.example`, validated in `src/lib/env.ts`): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`; optional `GEMINI_API_KEY` / `OPENAI_API_KEY` (+ `GEMINI_MODEL`, `GEMINI_FALLBACK_MODELS`, `GEMINI_THINKING_LEVEL`, `OPENAI_MODEL`) and `META_APP_ID` / `META_APP_SECRET`. `.env*` is gitignored except `.env.example`. **Never commit credentials.** Use the publishable/secret keys, not the legacy anon/service-role keys.
- **Email confirmation:** if enabled, the link lands on `/auth/callback`, which must be in the project's allowed redirect URLs. For demos, turning off "Confirm email" is simplest.
- **Gemini free tier** has small daily quotas per model; when the main model is exhausted, requests fall back to the next model and then to guided mode. Watch the `[ai]` log lines.

## Agent skills

Supabase skills are vendored in `.agents/skills/` (mirrored in `.bob/skills/`, tracked in `skills-lock.json`): `supabase`, `supabase-postgres-best-practices`, `supabase-server`. Read the relevant `SKILL.md` before writing migrations, RLS policies, or code that imports `@supabase/server`.
