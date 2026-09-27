@AGENTS.md

# Keh — project context

Keh is an AI-powered social media management SaaS for **small business owners**. The core product idea: the owner makes *business* decisions (which product, what promotion, what goal, when), and the AI makes the *marketing* decisions (captions, platform tailoring, posting time, what worked). When designing UI or copy, minimise cognitive load for a non-marketer — plain language, sensible defaults, few choices per step.

The app is a refactor of an earlier vanilla-JS prototype (referred to as "@Sites" / formerly "Suki"). Auth (Supabase email/password) and the current business are real; everything else — campaigns, posts, products, analytics, recommendations — still runs on mock data, and nothing is written to the database yet.

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
- **Supabase** (`@supabase/ssr`, `@supabase/supabase-js`, `@supabase/server`) — Auth + `business.service.ts` use it; other services are still mock-backed. `@supabase/server` is installed but unused.
- **OpenAI** — planned, not installed.

## Architecture

```
src/
├── app/(dashboard)/   # 11 routes sharing DashboardLayout (sidebar + topbar):
│                      #   dashboard, assistant, campaigns/new, calendar, content, products,
│                      #   analytics, brand, social-accounts, subscription, settings
├── app/(auth)/        # login, signup + actions.ts (login/signup/signOut Server Actions)
├── app/auth/callback/ # email-confirmation route handler (exchanges ?code= for a session)
├── app/page.tsx       # redirects to /dashboard
├── components/
│   ├── layout/        # AppSidebar, TopBar, DashboardLayout
│   ├── ui/            # shadcn button (currently unused) + Keh primitives (StatCard, PageHeader, badges…)
│   └── campaigns/     # 5-step wizard: Goal → Content → Platforms → Review → Publish (CampaignContext)
├── services/          # async, read-only data-access functions — business.service is Supabase, the rest mock
├── data/              # typed mock data
├── lib/
│   ├── env.ts         # validated env vars (publicEnv, getSupabaseSecretKey)
│   ├── auth/context.ts# getCurrentContext() → { user, business }; redirects to /login if signed out
│   ├── supabase/      # client.ts (browser), server.ts (server + admin), database.types.ts (hand-written)
│   ├── ai/            # ai.service.ts — empty stub
│   ├── social/        # SocialPublisher interface — stub
│   └── validation/    # Zod schemas — defined but not imported anywhere yet
├── types/index.ts     # domain model (single source of truth for TS types)
├── constants/         # platforms, statuses, goals, nav, plans
└── utils/             # pure helpers (timeLabel, formatDate, formatPrice…)
supabase/migrations/   # 001–005 (enums, tables, indexes, RLS, functions) + 007_hardening (grants, token columns, search_path, product checks)
supabase/seed.sql      # dev seed — NOT a migration; needs a matching auth user first
```

There is no `app/api/`, no `src/hooks/`, and no `error.tsx` / `loading.tsx` / `not-found.tsx`. The only Server Actions are the auth ones.

**Auth flow:** `proxy.ts` refreshes the session and optimistically redirects signed-out users to `/login` (and signed-in users away from `/login`/`/signup`). The authoritative check is `getCurrentContext()` in `app/(dashboard)/layout.tsx`. Server pages get the business via `const { user, business } = await getCurrentContext()` — never hard-code a business ID.

**Nav:** "Campaigns" points at `/campaigns/new`; there is no campaigns list page yet.

### Rules

- **Data flow is UI → service → data.** Pages/components call `@/services/*`; services own the data source. Keep service functions `async` and business-scoped (`businessId` arg) so they survive the swap from mock data to Supabase. Don't add new `@/data/*` imports to UI code.
  - **Current reality:** only `app/(dashboard)/layout.tsx` and `dashboard/page.tsx` go through services. 12 files import `@/data/*` directly: the analytics, assistant, brand, calendar, content, products, social-accounts and subscription pages, plus `CampaignContext`, `GoalStep`, `ContentStep` and `ReviewStep`. Most of those pages are whole-page `"use client"` components, so they must be split into a server `page.tsx` (fetches via a service) + a client component (receives props) before they can use real data (G9).
- **Server Components by default.** Add `"use client"` only for interactivity. Data fetching happens in Server Components / services, not in client components.
- **Mutations go through Server Actions → service write functions**, validated server-side with the Zod schemas in `lib/validation/schemas.ts`. Don't build client-only stores to fake persistence — they get thrown away when Supabase lands.
- **AI calls are server-only.** Client components must never call OpenAI; go through a Route Handler / Server Action → `lib/ai/ai.service.ts`. Validate AI structured output with Zod.
- **Social platforms go through `SocialPublisher`** (`lib/social/publisher.interface.ts`) — one adapter per platform; campaign/scheduling code depends on the interface only. TikTok has no auto-publish, so its posts end up `ACTION_REQUIRED` for the owner to finish manually.
- **Supabase clients:** `createBrowserClient()` in client code; `createServerClient()` in Server Components/Actions/Route Handlers (respects RLS); `createAdminClient()` bypasses RLS — trusted server code only, never imported by anything client-side.
- **RLS ownership chain:** `auth.uid() → profiles.id → businesses.owner_id → <table>.business_id`, via the `get_user_business_ids()` helper. Every new table needs RLS enabled plus policies following this chain.
- **Migrations:** as of 2026-09-27 they were *not* applied to the project in `.env` (REST returned "table not found"). Apply 001–005 then 007 in order (SQL editor or `supabase db push`). Once applied anywhere, fix schema/RLS with a new numbered migration, not by editing existing files. With 007 applied, `social_accounts` token columns aren't selectable by users — select explicit columns, not `*`.
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

- Mock-backed services (campaign, product, analytics, recommendation, social-account) ignore `businessId` and return the same sample café data to every signed-in user, so the demo stays populated. Pages other than the dashboard and layout still import `@/data/*` directly (e.g. the brand page shows the mock café, not the real business).
- The demo date `2026-09-26` is hard-coded in `dashboard/page.tsx` and `calendar/page.tsx` (the calendar starts on September 2026 and its "Today" button jumps there), even though `DEMO_DATE` exists in `constants/index.ts`.
- The demo identity is still hard-coded in the wizard: "Juan's Café, Cebu City", "Friendly · Taglish" and the "Friday 6 PM" slot in captions, preview and hints. (Sidebar, top bar and dashboard greeting use the real user/business.)
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
| 5 | In progress | Supabase — done: env keys, typed clients, auth + `(auth)` routes, protected routes, real business context, migration 007. Still to do: apply migrations, `supabase init`/`config.toml`, remaining services → Supabase |
| 6 | Planned | AI layer — OpenAI behind `ai.service.ts`, with usage-limit enforcement |
| 7 | Planned | Social adapters (Facebook, Instagram; TikTok later) + scheduled-publish job runner |
| 8 | Planned | Metrics & learning — analytics pipeline, AI recommendations |

Phase 4 was meant to precede Phase 5, but the Supabase schema landed first. The agreed working order (from `docs/GAP_ANALYSIS.md`) is:

1. **Blockers:** ~~env keys/clients, RLS fixes, `/campaigns` 404, mobile drawer, proxy~~ (done 2026-09-27); still open: apply migrations, `supabase init`, timezone module.
2. **Core loop:** auth + onboarding → real business context → server pages + client components → product create/edit → persisted campaigns → empty states.
3. Then tests/CI, UX polish, and finally AI and publishing.

The README's phase table is out of date (it still lists Phase 3 as upcoming). The older `.bob/artifacts/keh-refactoring-progress-missing-features.html` predates the gap analysis.

## Environment & known issues

- **Env vars** (see `.env.example`, validated in `src/lib/env.ts`): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`. The local `.env` also has `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` and `SUPABASE_JWKS_URL` for `@supabase/server` (unused). Later: `OPENAI_API_KEY`. `.env*` is gitignored except `.env.example`. **Never commit credentials.** Use the publishable/secret keys, not the legacy anon/service-role keys.
- **Email confirmation:** if the Supabase project requires it, sign-up returns no session and shows "check your email"; the link lands on `/auth/callback`, which must be in the project's allowed redirect URLs. For hackathon demos, turning off "Confirm email" in Supabase Auth settings is simplest.
- **Times are displayed in UTC but labelled Asia/Manila:** mock `scheduledAt` values are UTC ISO strings and the UI does `scheduledAt.slice(11, 16)` / `startsWith(date)`, so times show 8 hours off and late-evening posts land on the wrong day (G2).
- **Empty data crashes:** the assistant page indexes `recommendations[0..2]` directly; the subscription progress bar divides by the limit (G16).
- **Supabase project:** there's no `supabase/config.toml`, and `database.types.ts` is hand-written (regenerate once the CLI is set up). `derive_campaign_status` ignores post deletes (G15).

## Agent skills

Supabase skills are vendored in `.agents/skills/` (mirrored in `.bob/skills/`, tracked in `skills-lock.json`): `supabase`, `supabase-postgres-best-practices`, `supabase-server`. Read the relevant `SKILL.md` before writing migrations, RLS policies, or code that imports `@supabase/server`.
