@AGENTS.md

# Keh — project context

Keh is an AI-powered social media management SaaS for **small business owners**. The core product idea: the owner makes *business* decisions (which product, what promotion, what goal, when), and the AI makes the *marketing* decisions (captions, platform tailoring, posting time, what worked). When designing UI or copy, minimise cognitive load for a non-marketer — plain language, sensible defaults, few choices per step.

The app is a refactor of an earlier vanilla-JS prototype (referred to as "@Sites" / formerly "Suki"). Most pages are faithful rebuilds of that prototype and still run on mock data.

## Commands

```bash
npm run dev      # dev server on http://localhost:3000 (also regenerates AGENTS.md)
npm run build    # production build — the closest thing to a type check
npm run lint     # ESLint (next core-web-vitals + typescript)
```

There is no test suite yet. Verify changes with `npm run build` + `npm run lint`, and by running the app.

## Stack (versions matter — check docs, not memory)

- **Next.js 16** App Router. Breaking changes vs older Next — read `node_modules/next/dist/docs/` before using an API. Notably, middleware is now **`src/proxy.ts`** exporting `proxy()`, not `middleware.ts`.
- **React 19**, **TypeScript strict**, path alias `@/*` → `src/*`.
- **Tailwind CSS v4** (CSS-first config in `src/app/globals.css`, no tailwind.config) + **shadcn/ui** (`base-nova` style, built on `@base-ui/react`, not Radix). Add primitives with `npx shadcn add <name>`.
- **Zod 4**, **Recharts 3**, **lucide-react**.
- **Supabase** (`@supabase/ssr`, `@supabase/supabase-js`, `@supabase/server`) — schema exists, not yet wired into the app.
- **OpenAI** — planned (Phase 6), not installed.

## Architecture

```
src/
├── app/(dashboard)/   # 11 routes sharing DashboardLayout (sidebar + topbar)
├── app/page.tsx       # redirects to /dashboard
├── components/
│   ├── layout/        # AppSidebar, TopBar, DashboardLayout
│   ├── ui/            # shadcn button + Keh primitives (StatCard, PageHeader, badges…)
│   └── campaigns/     # 5-step wizard: Goal → Content → Platforms → Review → Publish (CampaignContext)
├── services/          # async data-access functions (currently mock-backed)
├── data/              # typed mock data
├── lib/
│   ├── supabase/      # client.ts (browser), server.ts (server + admin), database.types.ts
│   ├── ai/            # ai.service.ts — stub
│   ├── social/        # SocialPublisher interface — stub
│   └── validation/    # Zod schemas
├── types/index.ts     # domain model (single source of truth for TS types)
├── constants/         # platforms, statuses, goals, nav, plans
└── utils/             # pure helpers (timeLabel, formatDate, formatPrice…)
supabase/migrations/   # 001_enums → 006_seed (tables, indexes, RLS, functions, seed)
```

### Rules

- **Data flow is UI → service → data.** Pages/components call `@/services/*`; services own the data source. Service signatures are designed to survive the swap from mock data to Supabase, so keep them `async` and business-scoped (`businessId` arg). Several pages (analytics, assistant, brand, calendar, content, products, CampaignContext) still import `@/data/*` directly — don't add more of that; route new reads through a service.
- **Server Components by default.** Add `"use client"` only for interactivity. Data fetching happens in Server Components / services, not in client components.
- **AI calls are server-only.** Client components must never call OpenAI; go through a Route Handler / Server Action → `lib/ai/ai.service.ts`. Validate AI structured output with Zod.
- **Social platforms go through `SocialPublisher`** (`lib/social/publisher.interface.ts`) — one adapter per platform; campaign/scheduling code depends on the interface only. TikTok has no auto-publish, so its posts end up `ACTION_REQUIRED` for the owner to finish manually.
- **Supabase clients:** `createBrowserClient()` in client code; `createServerClient()` in Server Components/Actions/Route Handlers (respects RLS); `createAdminClient()` bypasses RLS — trusted server code only, never imported by anything client-side.
- **RLS ownership chain:** `auth.uid() → profiles.id → businesses.owner_id → <table>.business_id`, via the `get_user_business_ids()` helper. Every new table needs RLS enabled plus policies following this chain.

### Domain model

`User → Business → { BrandProfile, Product[], SocialAccount[], Campaign[] → SocialPost[] → PostMetric[], AIRecommendation[], Subscription }`

- Platforms: `FACEBOOK | INSTAGRAM | TIKTOK`
- Post status: `DRAFT | SCHEDULED | PUBLISHING | PUBLISHED | ACTION_REQUIRED | FAILED`
- Enums are UPPER_SNAKE string unions.

**Enums/types are duplicated in four places and must stay in sync:** `src/types/index.ts`, `src/lib/validation/schemas.ts`, `src/lib/supabase/database.types.ts`, and `supabase/migrations/001_enums.sql`. Change one → change all. Prefer regenerating `database.types.ts` (`npx supabase gen types typescript …`, see file header) over hand-editing its generated section.

### Styling

- Brand tokens live in `globals.css` as `--keh-*` (purple `#5849da`, dark, muted, line, bg, light) and are mapped to shadcn semantic tokens, so `bg-primary` is Keh purple; also exposed as `--color-brand-*` utilities.
- Fonts: DM Sans (body), Manrope (headings) via `next/font/google`.
- Existing pages use a lot of hard-coded hex values (`text-[#7b7b8b]`, `border-[#e9e9ef]`). Prefer tokens/utility classes in new code.
- Remote images are allowed only from `*.supabase.co` storage and `images.unsplash.com` (mock data) — see `next.config.ts`.

## Demo / mock scaffolding to be aware of

- `DEMO_BUSINESS_ID = "biz_001"` in `app/(dashboard)/layout.tsx` stands in for the session's business until auth lands.
- Dashboard hard-codes `DEMO_DATE = "2026-09-26"` to group "today/tomorrow" posts against mock data.
- Campaign wizard output is not persisted anywhere; many buttons (product modal, calendar post modal, content reuse/duplicate/edit, notifications, subscription modals) are rendered but unwired.

## Roadmap

| Phase | Status | Scope |
|---|---|---|
| 1 | Done | Audit of the prototype |
| 2 | Done | Foundation — scaffold, types, constants, mock data, services |
| 3 | Done | Layout, navigation, all 11 routes |
| 3b | Next | Wire up missing interactions (modals, wizard persistence, week view, fresh-mode empty states…) |
| 4 | Planned | Data layer — service/repository boundary, flesh out Zod schemas |
| 5 | In progress | Supabase — migrations written; auth, `(auth)` routes, protected-route redirects in `proxy.ts`, services → Supabase still to do |
| 6 | Planned | AI layer — OpenAI behind `ai.service.ts` |
| 7 | Planned | Social adapters — Facebook, Instagram (TikTok later) |
| 8 | Planned | Metrics & learning — analytics pipeline, AI recommendations |

The README's phase table is behind (it still lists Phase 3 as upcoming). A detailed gap list lives in `.bob/artifacts/keh-refactoring-progress-missing-features.html`.

## Environment & known issues

- Env vars: `NEXT_PUBLIC_SUPABASE_URL`, a public Supabase key, `SUPABASE_SERVICE_ROLE_KEY`; later `OPENAI_API_KEY`. Local values go in `.env.local` / `.env` (all `.env*` are gitignored). **Never commit credentials.** The README mentions `.env.example`, but it doesn't exist yet.
- **Key-name mismatch:** `src/proxy.ts` reads `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, while `lib/supabase/client.ts` and `server.ts` read `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Pick one; the installed Supabase skills recommend the new publishable/secret keys over legacy anon/service-role keys.
- `src/proxy.ts` has a leftover debug `console.log` that runs on every request, and it checks the wrong var name (`NEXT_PUBLIC_PUBLISHABLE_KEY`).

## Agent skills

Supabase skills are vendored in `.agents/skills/` (mirrored in `.bob/skills/`, tracked in `skills-lock.json`): `supabase`, `supabase-postgres-best-practices`, `supabase-server`. Read the relevant `SKILL.md` before writing migrations, RLS policies, or code that imports `@supabase/server`.
