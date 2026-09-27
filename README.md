# Keh — AI-powered social media management

Keh is a social media manager for small business owners. The owner makes the business decisions (which product, what offer, what goal); Keh makes the marketing decisions (captions, platforms, posting time) and learns from the results.

## What works today

| Area | Status |
|---|---|
| Sign up / log in | Supabase Auth; sign-up creates the business, brand profile and a Free subscription |
| Onboarding | A short guided setup after sign-up: business details → brand voice (tone, language, call to action, color, logo) → first product → plan. Can be skipped |
| Products | Add, edit and delete products. Photos are resized and saved as JPG in the browser (Instagram-ready, small uploads) |
| Campaign wizard | Goal → content (AI-written captions) → platforms → review → schedule. Edit, reschedule or delete campaigns later |
| Campaigns, Calendar, Content, Home | Real data, with live refresh across open tabs |
| Publishing | **Placeholder for the MVP:** scheduled posts are saved to the calendar, nothing is posted. Posting to Facebook / Instagram and metrics collection are built but switched off (see "Publishing to social platforms") |
| Analytics | Real calculations from `post_metrics` (filled by `seed:demo` for now, by the metrics job once publishing is on) |
| AI marketing manager | Chat, "fill the campaign for me", caption rewrites and weekly recommendations. Gemini or OpenAI, with a rules-based fallback when neither is configured |
| Brand profile | Business details, brand voice, logo and brand image |
| Social accounts | Connect a Facebook Page and Instagram Business account (Meta OAuth, choose between Pages, tokens encrypted); TikTok by username |
| Plans & billing | Four plans with monthly campaign / scheduled-post limits and a daily AI limit. **Placeholder:** no payment provider yet — with `BILLING_ENABLED=true` a demo checkout switches plans instantly; otherwise everyone is on Free |
| Account | Password reset, change password or email, delete account |

**Not built yet:** a real payment provider (billing is a placeholder). **Not deployed yet** — see "Deployment" for the recommended host. Publishing is built but off. See [docs/GAP_ANALYSIS.md](docs/GAP_ANALYSIS.md) and the "Known gaps" section of [CLAUDE.md](CLAUDE.md).

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
   | `SOCIAL_TOKEN_KEY` | To connect Facebook / Instagram | Encrypts platform tokens; 32 random bytes, base64 (command in `.env.example`) |
   | `BILLING_ENABLED` | No | `true` turns on the demo checkout (plan changes without payment); `false` keeps everyone on Free |
   | `PUBLISHING_ENABLED` | No | Leave `false` for the MVP (see "Publishing to social platforms") |
   | `CRON_SECRET` | Only with publishing on | Shared secret for the scheduled jobs (16+ random characters) |

   Never commit `.env.local` or any file with real credentials.

3. **Database.** Run the SQL files in `supabase/migrations/` in order (001 → 015, then 017; there is no 006) in the Supabase SQL editor. The project isn't linked to the Supabase CLI yet. Skip 016 for now — it's only for switching publishing on after deploying.

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

## Deployment

Keh isn't deployed yet. Whatever host we use needs:

- **A Node.js server runtime** (Node 22). Keh uses Server Components, Server Actions and Route Handlers, so it can't be a static export.
- **Environment variables** from the table above, set in the host's dashboard (never committed).
- **Supabase settings:** add `https://<our-domain>/auth/callback` to Auth → URL Configuration → Redirect URLs, and set the Site URL to the domain.
- **Meta app** (only when publishing is switched on): add `https://<our-domain>/auth/social/callback` as a Valid OAuth Redirect URI.
- **Upload size:** photos are resized in the browser before upload (usually well under 1 MB); the server accepts up to 5 MB per image.

### Recommendation: Vercel

For where Keh is now (a hackathon MVP a small team demos and iterates on), **deploy to Vercel**:

- **Built for Next.js.** Keh is on Next.js 16; Vercel supports each release on day one, with no config (Server Actions, Route Handlers, image handling, `proxy.ts`).
- **A preview URL for every pull request**, so teammates and judges can try a branch before it's merged.
- **Free to start.** The Hobby plan covers demos and testing.
- **The upload limit no longer matters.** Photos are resized in the browser before upload (`utils/image.ts`), so a product photo is ~0.5 MB, far under Vercel's ~4.5 MB request limit.
- **Scheduled jobs don't need Vercel Cron** — they're triggered by Supabase pg_cron, which works on any host.

How to set it up:

1. Import the GitHub repo at vercel.com/new (framework: Next.js, defaults are fine).
2. Add the environment variables from `.env.example` (Settings → Environment Variables).
3. Settings → Functions → **Function Region**: pick the one closest to your Supabase project's region (Supabase → Project Settings → General). For a Singapore (`ap-southeast-1`) project, choose Singapore (`sin1`) — every page makes several database calls, so this matters most for speed.
4. Add the Vercel URL to Supabase Auth redirect URLs (see above).

**When to reconsider:** Vercel's Hobby plan is for non-commercial use. Once Keh charges customers, either upgrade to Vercel Pro (~$20 per team member per month) or move to **Railway or Render** (~$5–7/month for a small always-on Node server). The app is portable — `npm run build && npm run start` — so switching later is an afternoon's work, not a rewrite.

### All the options

| Option | Good | Watch out for |
|---|---|---|
| **Vercel** (recommended) | Made by the Next.js team; zero config, preview deploys per PR, free to start | ~4.5 MB request bodies (fine now that photos are resized in the browser). The Hobby plan is for non-commercial use. |
| **Netlify** | Similar to Vercel, supports Next.js | Also has serverless body/time limits; check the current Next.js support for Next 16 |
| **Render / Railway / Fly.io** | Runs `npm run build && npm run start` as a normal Node server — no body-size surprises, predictable pricing | A small always-on instance costs a few dollars a month; slower cold starts on free tiers |
| **Own VPS** (e.g. DigitalOcean) | Full control, cheapest at scale | We maintain the server, HTTPS and updates |

Whatever we choose, the deploy is `npm ci && npm run build && npm run start` with the env vars set. Supabase (database, auth, storage) stays where it is.

## Publishing to social platforms — built, switched off

Posting to Facebook / Instagram and collecting their metrics are **not part of the MVP**. The code exists but is off unless `PUBLISHING_ENABLED=true`. With it off (the default):

- "Schedule" and "Publish now" save posts to the calendar as *Scheduled*; nothing is posted.
- `/api/cron/publish` and `/api/cron/metrics` do nothing.
- You don't need `CRON_SECRET`, the Vault secrets, or migration 016. `SOCIAL_TOKEN_KEY` is only needed to connect Facebook / Instagram accounts.

To switch it on later (after deploying):

1. Get Meta App Review for `pages_manage_posts`, `pages_read_engagement`, `read_insights`, `instagram_content_publish` and `instagram_manage_insights` (until then only app admins/testers can connect).
2. Set `PUBLISHING_ENABLED=true`, `SOCIAL_TOKEN_KEY` and `CRON_SECRET` in the app's environment.
3. In the Supabase SQL editor, store the site URL and the same secret in Vault:
   ```sql
   select vault.create_secret('https://your-site.example', 'keh_site_url');
   select vault.create_secret('<CRON_SECRET>', 'keh_cron_secret');
   ```
4. Run `supabase/migrations/016_publish_cron.sql`. It schedules publishing every 5 minutes and metrics every hour; the file lists queries to check runs or stop the jobs.

## Scripts

```bash
npm run dev        # development server on http://localhost:3000
npm run build      # production build (also the type check)
npm run start      # serve the production build
npm run lint       # ESLint
npm test           # unit tests (Vitest)
npm run seed:demo  # demo history, see above
```

CI runs lint, tests and build on every pull request. There are no end-to-end tests, so also check changes by using the app.

## Project structure

```
src/
├── app/
│   ├── (auth)/          # login, signup, auth Server Actions
│   ├── (dashboard)/     # the signed-in app: dashboard, campaigns, calendar, content,
│   │                    # products, analytics, assistant, brand, social-accounts,
│   │                    # subscription, settings
│   ├── api/             # /api/assistant (AI chat), /api/social/connect/[platform], /api/cron/* (jobs)
│   └── auth/            # email-confirmation and Meta OAuth callbacks
├── components/          # UI, grouped by feature (campaigns, assistant, layout, ui…)
├── services/            # data access (Supabase), one file per area
├── lib/
│   ├── ai/              # prompts, providers (Gemini/OpenAI), rate limit, recommendations
│   ├── analytics.ts     # pure performance calculations
│   ├── social/          # Meta Graph API, Facebook/Instagram publishers, token encryption, OAuth state
│   ├── supabase/        # browser/server/admin clients, database types
│   └── validation/      # Zod schemas
├── hooks/               # useMarketingAssistant
├── types/, constants/, utils/
└── proxy.ts             # session refresh + auth redirects (Next 16's middleware)
supabase/migrations/     # database schema, RLS, functions
scripts/                 # seed-demo-data.mjs
```

Architecture, conventions and rules for contributors (and AI agents) are in [CLAUDE.md](CLAUDE.md).
