@AGENTS.md

# Keh — project context

Keh is an AI-powered social media management SaaS for **small business owners**. The core product idea: the owner makes *business* decisions (which product, what promotion, what goal, when), and the AI makes the *marketing* decisions (captions, platform tailoring, posting time, what worked). When designing UI or copy, minimise cognitive load for a non-marketer — plain language, sensible defaults, few choices per step.

The app is a refactor of an earlier vanilla-JS prototype (referred to as "@Sites" / formerly "Suki"). Every page is a faithful rebuild of that prototype and still runs on mock data — nothing reads from or writes to Supabase yet, and there is no auth.

The current audit and prioritized roadmap live in [docs/GAP_ANALYSIS.md](docs/GAP_ANALYSIS.md) (gaps are referenced as G1–G24 below).

## Commands

```bash
npm run dev      # dev server on http://localhost:3000 (also regenerates AGENTS.md)
npm run build    # production build — the closest thing to a type check
npm run lint     # ESLint (next core-web-vitals + typescript)
```

There is no test suite and no CI yet. Verify changes with `npm run build` + `npm run lint`, and by running the app.

## Stack (versions matter — check docs, not memory)

- **Next.js 16** App Router. Breaking changes vs older Next — read `node_modules/next/dist/docs/` before using an API. Notably, middleware is now **`src/proxy.ts`** exporting `proxy()`, not `middleware.ts`.
- **React 19**, **TypeScript strict**, path alias `@/*` → `src/*`.
- **Tailwind CSS v4** (CSS-first config in `src/app/globals.css`, no tailwind.config) + **shadcn/ui** (`base-nova` style, built on `@base-ui/react`, not Radix; `cn` comes from shadcn's `cn` package, not clsx + tailwind-merge). Add primitives with `npx shadcn add <name>`.
- **Zod 4**, **Recharts 3**, **lucide-react**.
- **Supabase** (`@supabase/ssr`, `@supabase/supabase-js`, `@supabase/server`) — schema and migrations exist; clients exist but are not called anywhere. `@supabase/server` is installed but unused.
- **OpenAI** — planned, not installed.

## Architecture

```
src/
├── app/(dashboard)/   # 11 routes sharing DashboardLayout (sidebar + topbar):
│                      #   dashboard, assistant, campaigns/new, calendar, content, products,
│                      #   analytics, brand, social-accounts, subscription, settings
├── app/page.tsx       # redirects to /dashboard
├── components/
│   ├── layout/        # AppSidebar, TopBar, DashboardLayout
│   ├── ui/            # shadcn button (currently unused) + Keh primitives (StatCard, PageHeader, badges…)
│   └── campaigns/     # 5-step wizard: Goal → Content → Platforms → Review → Publish (CampaignContext)
├── services/          # async, read-only data-access functions (mock-backed; no write functions yet)
├── data/              # typed mock data
├── lib/
│   ├── supabase/      # client.ts (browser), server.ts (server + admin), database.types.ts (hand-written)
│   ├── ai/            # ai.service.ts — empty stub
│   ├── social/        # SocialPublisher interface — stub
│   └── validation/    # Zod schemas — defined but not imported anywhere yet
├── types/index.ts     # domain model (single source of truth for TS types)
├── constants/         # platforms, statuses, goals, nav, plans
└── utils/             # pure helpers (timeLabel, formatDate, formatPrice…)
supabase/migrations/   # 001_enums → 006_seed (tables, indexes, RLS, functions, seed)
```

There is no `(auth)` route group, no `app/api/`, no Server Actions, no `src/hooks/`, and no `error.tsx` / `loading.tsx` / `not-found.tsx`.

**Nav vs routes:** `NAV_ITEMS` in `constants/index.ts` links "Campaigns" to `/campaigns`, which has no page (404). Only `/campaigns/new` exists (G1).

### Rules

- **Data flow is UI → service → data.** Pages/components call `@/services/*`; services own the data source. Keep service functions `async` and business-scoped (`businessId` arg) so they survive the swap from mock data to Supabase. Don't add new `@/data/*` imports to UI code.
  - **Current reality:** only `app/(dashboard)/layout.tsx` and `dashboard/page.tsx` go through services. 12 files import `@/data/*` directly: the analytics, assistant, brand, calendar, content, products, social-accounts and subscription pages, plus `CampaignContext`, `GoalStep`, `ContentStep` and `ReviewStep`. Most of those pages are whole-page `"use client"` components, so they must be split into a server `page.tsx` (fetches via a service) + a client component (receives props) before they can use real data (G9).
- **Server Components by default.** Add `"use client"` only for interactivity. Data fetching happens in Server Components / services, not in client components.
- **Mutations go through Server Actions → service write functions**, validated server-side with the Zod schemas in `lib/validation/schemas.ts`. Don't build client-only stores to fake persistence — they get thrown away when Supabase lands.
- **AI calls are server-only.** Client components must never call OpenAI; go through a Route Handler / Server Action → `lib/ai/ai.service.ts`. Validate AI structured output with Zod.
- **Social platforms go through `SocialPublisher`** (`lib/social/publisher.interface.ts`) — one adapter per platform; campaign/scheduling code depends on the interface only. TikTok has no auto-publish, so its posts end up `ACTION_REQUIRED` for the owner to finish manually.
- **Supabase clients:** `createBrowserClient()` in client code; `createServerClient()` in Server Components/Actions/Route Handlers (respects RLS); `createAdminClient()` bypasses RLS — trusted server code only, never imported by anything client-side.
- **RLS ownership chain:** `auth.uid() → profiles.id → businesses.owner_id → <table>.business_id`, via the `get_user_business_ids()` helper. Every new table needs RLS enabled plus policies following this chain.
- **Migrations have already been applied** to the Supabase project. Fix schema/RLS issues with a new numbered migration (`007_…`), not by editing existing files.
- **Timestamps:** the DB stores `timestamptz` (UTC); the UI must display in `Asia/Manila` (`DEFAULT_TIMEZONE`). Never slice ISO strings to get a time or date — see known issues.

### Domain model

`User → Business → { BrandProfile, Product[], SocialAccount[], Campaign[] → SocialPost[] → PostMetric[], AIRecommendation[], Subscription }`

- Platforms: `FACEBOOK | INSTAGRAM | TIKTOK`. The social-accounts page also shows a "Google Business" card, but it isn't a real platform — it's faked as a `FACEBOOK` account with positional labels. Whether Google Business is in scope is undecided; don't build on that hack.
- Post status: `DRAFT | SCHEDULED | PUBLISHING | PUBLISHED | ACTION_REQUIRED | FAILED`
- A campaign requires a product (`campaigns.product_id` is `not null`, `on delete restrict`).
- `handle_new_user()` (migration 005) creates a profile, a business named "My Business", a brand profile and a FREE subscription on sign-up.
- Enums are UPPER_SNAKE string unions.

**Enums/types are duplicated in four places and must stay in sync:** `src/types/index.ts`, `src/lib/validation/schemas.ts`, `src/lib/supabase/database.types.ts`, and `supabase/migrations/001_enums.sql`. Change one → change all. `database.types.ts` is currently hand-written and not passed to the Supabase clients; prefer regenerating it (`npx supabase gen types typescript …`, see file header) over hand-editing. Plan limits are likewise duplicated in `SUBSCRIPTION_PLANS`, the `subscriptions` table defaults, and `handle_new_user()`.

### Styling

- Brand tokens live in `globals.css` as `--keh-*` (purple `#5849da`, dark, muted, line, bg, light) and are mapped to shadcn semantic tokens, so `bg-primary` is Keh purple; also exposed as `--color-brand-*` utilities.
- Fonts: DM Sans (body), Manrope (headings) via `next/font/google`.
- Existing pages use hard-coded hex values (`text-[#7b7b8b]`, `border-[#e9e9ef]`) and hand-rolled `<button>` class strings; the shadcn `Button` is installed but unused. Prefer tokens/utility classes and `Button` variants in new code. Use `platformLabel()` from `@/utils` instead of redefining `PLATFORM_LABELS`.
- Remote images are allowed only from `*.supabase.co` storage and `images.unsplash.com` (mock data) — see `next.config.ts`.

## Demo / mock scaffolding to be aware of

- `DEMO_BUSINESS_ID = "biz_001"` is defined in **both** `app/(dashboard)/layout.tsx` and `dashboard/page.tsx`. Services accept `businessId` but mostly ignore it and return the mock business.
- The demo date `2026-09-26` is hard-coded in `dashboard/page.tsx` and `calendar/page.tsx` (the calendar starts on September 2026 and its "Today" button jumps there), even though `DEMO_DATE` exists in `constants/index.ts`.
- The demo identity is hard-coded in UI: "Juan Dela Cruz" / "JD" in `AppSidebar` and `TopBar`; "Juan's Café, Cebu City", "Friendly · Taglish" and the "Friday 6 PM" slot in the wizard's captions, preview and hints.
- Campaign wizard output is not persisted: Schedule / Publish now / Save draft have no handlers. Wizard captions are template strings generated only once, so they go stale if the product or goal changes.
- Rendered but unwired: product add/edit (and the wizard's "Add new product"), calendar post chips and week view, content Reuse/Duplicate/Edit, "Why this recommendation?", the notifications bell, subscription Upgrade/Manage, and the settings toggles. Brand "Save" and social connect/disconnect only change local state.

## Roadmap

| Phase | Status | Scope |
|---|---|---|
| 1 | Done | Audit of the prototype |
| 2 | Done | Foundation — scaffold, types, constants, mock data, services (read-only) |
| 3 | Done | Layout, navigation, 11 routes (the `/campaigns` list page is still missing) |
| 3b | Deferred | Mock-only wiring of modals/interactions — skip; most of it would be rebuilt once data is persisted |
| 4 | Not started | Data layer — server pages + client components, service write functions, Server Actions, wire up Zod schemas |
| 5 | Started out of order | Supabase — migrations applied; still to do: `supabase init`/`config.toml`, fix env keys, auth + `(auth)` routes, protected routes in `proxy.ts`, services → Supabase |
| 6 | Planned | AI layer — OpenAI behind `ai.service.ts`, with usage-limit enforcement |
| 7 | Planned | Social adapters (Facebook, Instagram; TikTok later) + scheduled-publish job runner |
| 8 | Planned | Metrics & learning — analytics pipeline, AI recommendations |

Phase 4 was meant to precede Phase 5, but the Supabase schema landed first. The agreed working order (from `docs/GAP_ANALYSIS.md`) is:

1. **Blockers:** env keys/clients, Supabase project setup, RLS fixes, timezone module, quick UI fixes (`/campaigns` 404, mobile drawer, proxy).
2. **Core loop:** auth + onboarding → real business context → server pages + client components → product create/edit → persisted campaigns → empty states.
3. Then tests/CI, UX polish, and finally AI and publishing.

The README's phase table is out of date (it still lists Phase 3 as upcoming). The older `.bob/artifacts/keh-refactoring-progress-missing-features.html` predates the gap analysis.

## Environment & known issues

- **Env vars actually in `.env`:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `SUPABASE_JWKS_URL`. Later: `OPENAI_API_KEY`. All `.env*` files are gitignored. **Never commit credentials.** There is no `.env.example` yet, although the README mentions one.
- **The Supabase clients read variables that don't exist:** `lib/supabase/client.ts` and `server.ts` read `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY`, which aren't in `.env`, so both will fail the first time they're called. Only `src/proxy.ts` uses the correct `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Standardise on the publishable/secret keys (the vendored Supabase skills recommend them over legacy anon/service-role keys) (G3).
- **`src/proxy.ts`** has a leftover debug `console.log` on every request (checking a misspelled `NEXT_PUBLIC_PUBLISHABLE_KEY`), calls `supabase.auth.getUser()` on every request although nothing uses auth yet, and 500s every route if the Supabase env vars are missing (G4).
- **Times are displayed in UTC but labelled Asia/Manila:** mock `scheduledAt` values are UTC ISO strings and the UI does `scheduledAt.slice(11, 16)` / `startsWith(date)`, so times show 8 hours off and late-evening posts land on the wrong day (G2).
- **Mobile sidebar** doesn't close on navigation (G5).
- **Empty data crashes:** the dashboard passes `""` to `next/image` when there are no posts, and the assistant page indexes `recommendations[0..2]` directly (G16).
- **Supabase project:** there's no `supabase/config.toml`; the dev seed lives in `migrations/006_seed.sql` (so it runs in every environment) and inserts a profile for a nonexistent `auth.users` row. `security definer` functions lack `set search_path`, and campaign/post inserts don't check that the product belongs to the same business. OAuth tokens in `social_accounts` are plain text and readable by the owner via RLS; they must move to Vault or a server-only table before real accounts are connected (G13, G14).

## Agent skills

Supabase skills are vendored in `.agents/skills/` (mirrored in `.bob/skills/`, tracked in `skills-lock.json`): `supabase`, `supabase-postgres-best-practices`, `supabase-server`. Read the relevant `SKILL.md` before writing migrations, RLS policies, or code that imports `@supabase/server`.
