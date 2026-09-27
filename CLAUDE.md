@AGENTS.md

# Keh — project context

Keh is an AI-powered social media management SaaS for **small business owners**. The core product idea: the owner makes *business* decisions (which product, what promotion, what goal, when), and the AI makes the *marketing* decisions (captions, platform tailoring, posting time, what worked). When designing UI or copy, minimise cognitive load for a non-marketer — plain language, sensible defaults, few choices per step.

The app is a refactor of an earlier vanilla-JS prototype (referred to as "@Sites" / formerly "Suki"). It is being built as a **hackathon MVP**: favour the smallest change that makes the core loop real over polish.

**Core loop (working end to end on Supabase):** sign up → add a product → create a campaign in the wizard → it appears in Campaigns, Calendar, Content and the Dashboard. The brand profile (business details + brand voice) is editable and saved. Analytics, the AI assistant, social accounts and settings still run on mock data or local state; subscription shows the real plan but upgrades aren't wired.

The audit and prioritized roadmap live in [docs/GAP_ANALYSIS.md](docs/GAP_ANALYSIS.md) (gaps are referenced as G1–G24 below).

## Commands

```bash
npm run dev      # dev server on http://localhost:3000 (also regenerates AGENTS.md)
npm run build    # production build — the closest thing to a type check
npm run lint     # ESLint (next core-web-vitals + typescript)
```

There is no test suite and no CI yet. Verify changes with `npm run build` + `npm run lint`, and by running the app. The `supabase` CLI is a dev dependency (`npx supabase …`), but the project isn't linked yet (no `supabase/config.toml`).

## Stack (versions matter — check docs, not memory)

- **Next.js 16** App Router. Breaking changes vs older Next — read `node_modules/next/dist/docs/` before using an API. Notably, middleware is now **`src/proxy.ts`** exporting `proxy()`, not `middleware.ts`. Server Action body limit is raised to 6 MB in `next.config.ts` for photo uploads.
- **React 19**, **TypeScript strict**, path alias `@/*` → `src/*`.
- **Tailwind CSS v4** (CSS-first config in `src/app/globals.css`, no tailwind.config) + **shadcn/ui** (`base-nova` style, built on `@base-ui/react`, not Radix; `cn` comes from shadcn's `cn` package). Add primitives with `npx shadcn add <name>`.
- **Zod 4**, **Recharts 3**, **lucide-react**.
- **Supabase** (`@supabase/ssr`, `@supabase/supabase-js`) — Auth, Postgres (RLS) and Storage. `@supabase/server` is installed but unused.
- **OpenAI** — planned, not installed. Wizard captions are template strings in `CampaignContext.tsx` until then.

## Architecture

```
src/
├── app/(auth)/        # login, signup + actions.ts (login / signup / signOut)
├── app/auth/callback/ # email-confirmation route handler (exchanges ?code= for a session)
├── app/(dashboard)/   # app routes sharing DashboardLayout (sidebar + topbar)
│   ├── dashboard/     # server page — real posts; stats, recommendation card, accounts widget are mock
│   ├── campaigns/     # list (server page + CampaignsList) + actions.ts (saveCampaign)
│   ├── campaigns/new/ # server page → CampaignWizard (real products + brand details)
│   ├── calendar/      # server page → CalendarView (real posts)
│   ├── content/       # server page → ContentView (real posts)
│   ├── products/      # server page → ProductsView + ProductDialog + actions.ts (saveProduct)
│   ├── brand/         # server page → components/brand/BrandForm + actions.ts (saveBrandProfile)
│   └── analytics, assistant, social-accounts, subscription, settings  # server pages, mostly mock data
├── app/page.tsx       # redirects to /dashboard
├── components/
│   ├── auth/          # AuthForm (shared login/signup form)
│   ├── layout/        # AppSidebar, TopBar, DashboardLayout
│   ├── ui/            # shadcn Button + Keh primitives (StatCard, PageHeader, badges, AvailabilityBadge…)
│   └── campaigns/     # CampaignWizard + CampaignContext + 5 steps: Goal → Content → Platforms → Review → Publish
├── services/          # data access — business, product, campaign, storage = Supabase; analytics, recommendation, social-account = mock
├── data/              # typed mock data (still used by the mock services and mock pages)
├── lib/
│   ├── env.ts         # validated env vars (publicEnv, getSupabaseSecretKey)
│   ├── auth/context.ts# getCurrentContext() → { user, business }; redirects to /login if signed out
│   ├── supabase/      # client.ts (browser), server.ts (server + admin), database.types.ts (hand-written)
│   ├── ai/            # ai.service.ts — empty stub
│   ├── social/        # SocialPublisher interface — stub
│   └── validation/    # Zod schemas (ProductFormSchema, CampaignDraftSchema are used by actions)
├── types/index.ts     # domain model (single source of truth for TS types)
├── constants/         # platforms, statuses, goals, nav, plans, DEFAULT_TIMEZONE, MAX_UPLOAD_BYTES
└── utils/             # index.ts (formatPrice, initials…) + datetime.ts (Manila-time helpers)
supabase/migrations/   # 001–005 base schema, 007_hardening, 008_product_images (Storage bucket)
supabase/seed.sql      # dev seed — NOT a migration; needs a matching auth user first
```

There is no `app/api/`, no `src/hooks/`, and no `error.tsx` / `loading.tsx` / `not-found.tsx` yet.

**Auth flow:** `proxy.ts` refreshes the session and optimistically redirects signed-out users to `/login` (and signed-in users away from `/login`/`/signup`). The authoritative check is `getCurrentContext()`, called by the `(dashboard)` layout, every server page, and every Server Action. Never hard-code a business ID.

### Patterns to follow

- **Pages:** a server `page.tsx` calls `getCurrentContext()` + services and passes plain data to a `"use client"` view component (see `products/`, `calendar/`, `content/`, `campaigns/`). Don't make whole pages client components.
- **Mutations:** a `"use server"` `actions.ts` next to the route. Each action calls `getCurrentContext()`, validates with a Zod schema from `lib/validation/schemas.ts`, re-checks ownership of any referenced row, calls a service write function, then `revalidatePath(...)` for every page that shows the data. Return `{ error }` / `{ fieldErrors }` for the UI; `redirect()` on success when navigating away.
- **Forms:** use `useActionState`, but submit via `onSubmit` + `startTransition(() => formAction(formData))` rather than `<form action>` — React 19 resets action-driven forms after every submit, which wipes input when validation fails (see `AuthForm`, `ProductDialog`).
- **Dialogs:** native `<dialog>` + `showModal()` (focus trap, Escape and backdrop for free) — see `ProductDialog`.
- **Services** map DB rows (snake_case) to domain types (camelCase) with a `toX(row)` mapper; they use `createServerClient()` so RLS applies, and also filter by `businessId` explicitly.
- **Dates/times:** use `@/utils/datetime` (`manilaDateKey`, `manilaTime`, `todayKey`, `manilaToUtcIso`, `formatDateKey`…). The DB stores UTC `timestamptz`; the UI shows `Asia/Manila`. Never slice ISO strings.
- **Images:** upload through `storage.service.ts` (`submittedFile`, `validateImage`, `uploadBusinessImage`) — files go to the `product-images` bucket under `<business_id>/…` (brand images under `<business_id>/brand/…`). Photos are optional (`imageUrl` may be `""`), so guard every `<Image>`.

### Rules

- **Data flow is UI → service → data.** Don't add new `@/data/*` imports to UI code. Remaining direct imports: the analytics, assistant, brand, social-accounts and subscription pages (still mock).
- **AI calls are server-only.** Client components must never call OpenAI; go through a Server Action / Route Handler → `lib/ai/ai.service.ts`. Validate AI structured output with Zod.
- **Social platforms go through `SocialPublisher`** (`lib/social/publisher.interface.ts`). Nothing publishes to real platforms yet: "Schedule" and "Publish now" save posts as `SCHEDULED` (TikTok as `ACTION_REQUIRED`, since the owner finishes it manually); "Save draft" saves `DRAFT`.
- **Supabase clients:** `createBrowserClient()` in client code; `createServerClient()` in server code (respects RLS); `createAdminClient()` bypasses RLS — trusted server code only.
- **RLS ownership chain:** `auth.uid() → profiles.id → businesses.owner_id → <table>.business_id`, via `get_user_business_ids()`. Every new table needs RLS enabled plus policies following this chain. Storage paths for product photos are `<business_id>/<uuid>.<ext>`.
- **Migrations:** 001–005, 007 and 008 are applied to the project in `.env`. Once a migration is applied, fix schema/RLS with a new numbered migration, not by editing it. `social_accounts` token columns aren't selectable by users — select explicit columns, not `*`.

### Domain model

`User → Business → { BrandProfile, Product[], SocialAccount[], Campaign[] → SocialPost[] → PostMetric[], AIRecommendation[], Subscription }`

- Platforms: `FACEBOOK | INSTAGRAM | TIKTOK`. The social-accounts page also shows a "Google Business" card faked as a `FACEBOOK` account; don't build on that hack.
- Post status: `DRAFT | SCHEDULED | PUBLISHING | PUBLISHED | ACTION_REQUIRED | FAILED`. A campaign's status is derived from its posts by the `derive_campaign_status` trigger.
- A campaign has one product (`campaigns.product_id` is `not null`, `on delete restrict`) and one post per platform. Only `ACTIVE` products are offered in the wizard.
- `handle_new_user()` (rewritten in 007) creates a profile, a business named from the sign-up form, a brand profile and a FREE subscription.
- Enums are UPPER_SNAKE string unions.

**Enums/types are duplicated in four places and must stay in sync:** `src/types/index.ts`, `src/lib/validation/schemas.ts`, `src/lib/supabase/database.types.ts`, and `supabase/migrations/001_enums.sql`. `database.types.ts` is hand-written; regenerate it with the Supabase CLI once the project is linked. Plan limits are duplicated in `SUBSCRIPTION_PLANS`, the `subscriptions` table defaults, and `handle_new_user()`.

### Styling

- Brand tokens live in `globals.css` as `--keh-*` and are exposed as `bg-brand`, `text-brand-dark`, `text-brand-muted`, `border-brand-line`, `bg-brand-bg`, `bg-brand-light` (and `bg-primary` = Keh purple). New code uses these tokens and the shadcn `Button`; older pages still use hard-coded hex values (`text-[#7b7b8b]`) and hand-rolled buttons.
- Fonts: DM Sans (body), Manrope (headings) via `next/font/google`.
- Remote images are allowed only from `*.supabase.co` storage and `images.unsplash.com` (mock data) — see `next.config.ts`.

## Still mock / not wired

- **Dashboard:** the "Recommended for this week" card (hard-coded Matcha Latte), stat cards, insight strip and connected-accounts widget are mock.
- **Mock pages:** analytics, assistant ("Ask Keh" returns a template), social accounts (connect/disconnect is local state), settings (toggles do nothing). Subscription shows the real plan/usage, but usage counters aren't incremented yet.
- **Unwired controls:** content Reuse/Duplicate/Edit, calendar post chips and week view, "Why this recommendation?", notifications bell, subscription Upgrade/Manage. There's no campaign edit/delete and no product delete yet.
- **Metrics:** `reach` is always 0 on real posts until a metrics pipeline writes `post_metrics`, so "Top Performing" in Content is empty.

## Roadmap

| Phase | Status | Scope |
|---|---|---|
| 1–3 | Done | Prototype audit, foundation, layout + all routes (incl. `/campaigns` list) |
| 3b | Dropped | Mock-only wiring of modals — superseded by building features on real data |
| 4–5 | Mostly done | Server pages + Server Actions + Supabase for auth, business, products, campaigns. Still to do: brand profile save, `supabase init`/linked types, empty/error states, tests |
| 6 | Planned | AI layer — OpenAI behind `ai.service.ts` (captions, recommendations), with usage-limit enforcement |
| 7 | Planned | Social adapters (Facebook, Instagram; TikTok later) + scheduled-publish job runner |
| 8 | Planned | Metrics & learning — analytics pipeline, AI recommendations |

Next priorities (see `docs/GAP_ANALYSIS.md` → "Progress"): AI captions → demo polish (hide dead controls, real dashboard stats, delete product/campaign) → error/loading states.

The README's phase table is out of date. The older `.bob/artifacts/keh-refactoring-progress-missing-features.html` predates the gap analysis.

## Environment & known issues

- **Env vars** (see `.env.example`, validated in `src/lib/env.ts`): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`. Later: `OPENAI_API_KEY`. `.env*` is gitignored except `.env.example`. **Never commit credentials.** Use the publishable/secret keys, not the legacy anon/service-role keys.
- **Email confirmation:** if the Supabase project requires it, sign-up shows "check your email" and the link lands on `/auth/callback`, which must be in the project's allowed redirect URLs. For demos, turning off "Confirm email" in Supabase Auth settings is simplest.
- **Empty data crashes:** the assistant page indexes `recommendations[0..2]` directly; the subscription progress bar divides by the limit (G16). Both are mock pages today.
- **Supabase:** no `supabase/config.toml`; `database.types.ts` is hand-written; `derive_campaign_status` ignores post deletes (G15); campaign creation isn't a single transaction (the service deletes the campaign if its posts fail to insert).

## Agent skills

Supabase skills are vendored in `.agents/skills/` (mirrored in `.bob/skills/`, tracked in `skills-lock.json`): `supabase`, `supabase-postgres-best-practices`, `supabase-server`. Read the relevant `SKILL.md` before writing migrations, RLS policies, or code that imports `@supabase/server`.
