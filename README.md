# Keh — AI-powered social media management

Keh is a social media manager for small business owners. The owner makes the business decisions (which product, what offer, what goal); Keh makes the marketing decisions (captions, platforms, posting time) and learns from the results.

## What works today

| Area | Status |
|---|---|
| Sign up / log in | Supabase Auth; sign-up creates the business, brand profile and a Free subscription |
| Products | Add and edit products with photos (Supabase Storage) |
| Campaign wizard | Goal → content → platforms → review → schedule. Saves one post per platform |
| Campaigns, Calendar, Content, Home | Real data, with live refresh across open tabs |
| Analytics | Real calculations from `post_metrics` (empty until posts have metrics; see "Demo data") |
| AI marketing manager | Chat, "fill the campaign for me", caption rewrites and weekly recommendations. Gemini or OpenAI, with a rules-based fallback when neither is configured |
| Brand profile | Business details, brand voice, logo and brand image |
| Social accounts | Connect a Facebook Page and Instagram Business account (Meta OAuth); TikTok by username |
| Plan limits | Monthly campaign / scheduled-post limits and a daily AI request limit per plan |

**Not built yet:** publishing to social platforms (posts are saved and scheduled, but nothing is posted), a metrics pipeline, editing or deleting campaigns, password reset, billing. See [docs/GAP_ANALYSIS.md](docs/GAP_ANALYSIS.md) and the "Known gaps" section of [CLAUDE.md](CLAUDE.md).

## Tech stack

- **Next.js 16** (App Router, Server Components, Server Actions) and **React 19**
- **TypeScript** (strict), **Tailwind CSS v4**, **shadcn/ui** (Base UI), **lucide-react**, **Recharts**
- **Zod 4** for validation
- **Supabase**: Postgres with Row Level Security, Auth, Storage, Realtime
- **Gemini** (default) or **OpenAI** for the AI features, called over REST from the server only

## Getting started

1. **Install**

   ```bash
   npm install
   ```

2. **Environment.** Copy `.env.example` to `.env.local` and fill in:

   | Variable | Required | Notes |
   |---|---|---|
   | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Yes | Supabase → Project Settings → API Keys |
   | `SUPABASE_SECRET_KEY` | Yes | Server-only; bypasses RLS |
   | `GEMINI_API_KEY` or `OPENAI_API_KEY` | No | Without one, the AI runs in guided (rules-based) mode |
   | `GEMINI_MODEL`, `GEMINI_FALLBACK_MODELS`, `GEMINI_THINKING_LEVEL` | No | See `.env.example` |
   | `META_APP_ID`, `META_APP_SECRET` | No | Needed to connect Facebook / Instagram |

   Never commit `.env.local` or any file with real credentials.

3. **Database.** Run the SQL files in `supabase/migrations/` in order (001 → 013; there is no 006) in the Supabase SQL editor. The project isn't linked to the Supabase CLI yet.

4. **Supabase settings.**
   - Add `http://localhost:3000/auth/callback` (and your deployed URL) to Auth → URL Configuration → Redirect URLs, or turn off "Confirm email" for local testing.
   - For Facebook / Instagram, add `<your site>/auth/social/callback` as a Valid OAuth Redirect URI in the Meta app.

5. **Run**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) and sign up.

### Demo data

Real reach and engagement will come from the social platforms once publishing exists. Until then, you can give a business a believable history so Home, Analytics and the AI have results to work with:

```bash
npm run seed:demo -- --email owner@example.com           # add ~8 weeks of demo posts + metrics
npm run seed:demo -- --email owner@example.com --reset   # remove them again
```

## Scripts

```bash
npm run dev        # development server on http://localhost:3000
npm run build      # production build (also the type check)
npm run start      # serve the production build
npm run lint       # ESLint
npm run seed:demo  # demo history, see above
```

There is no automated test suite yet. Check changes with `npm run build`, `npm run lint`, and by using the app.

## Project structure

```
src/
├── app/
│   ├── (auth)/          # login, signup, auth Server Actions
│   ├── (dashboard)/     # the signed-in app: dashboard, campaigns, calendar, content,
│   │                    # products, analytics, assistant, brand, social-accounts,
│   │                    # subscription, settings
│   ├── api/             # /api/assistant (AI chat), /api/social/connect/[platform]
│   └── auth/            # email-confirmation and Meta OAuth callbacks
├── components/          # UI, grouped by feature (campaigns, assistant, layout, ui…)
├── services/            # data access (Supabase), one file per area
├── lib/
│   ├── ai/              # prompts, providers (Gemini/OpenAI), rate limit, recommendations
│   ├── analytics.ts     # pure performance calculations
│   ├── social/          # Meta OAuth state, publisher interface
│   ├── supabase/        # browser/server/admin clients, database types
│   └── validation/      # Zod schemas
├── hooks/               # useMarketingAssistant
├── types/, constants/, utils/
└── proxy.ts             # session refresh + auth redirects (Next 16's middleware)
supabase/migrations/     # database schema, RLS, functions
scripts/                 # seed-demo-data.mjs
```

Architecture, conventions and rules for contributors (and AI agents) are in [CLAUDE.md](CLAUDE.md).
