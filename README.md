# Keh — AI-powered social media management

An AI-powered social media management SaaS for small business owners. Reduces the cognitive workload of social media marketing by helping owners make business decisions while the AI handles marketing decisions.

## Tech stack

- **Next.js 16** — App Router, Server Components
- **React 19** — Client Components for interactivity
- **TypeScript** — strict mode
- **Tailwind CSS v4** — utility-first styling
- **shadcn/ui** — accessible component primitives
- **Lucide React** — icons
- **Zod** — validation
- **Recharts** — analytics charts
- **Supabase** — PostgreSQL, Auth, Storage *(Phase 5)*
- **OpenAI** — AI content generation *(Phase 6)*

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment variables

Copy `.env.example` to `.env.local` and fill in the values:

```bash
cp .env.example .env.local
```

Never commit `.env.local` or any file containing real credentials.

## Project structure

```
src/
├── app/               # Next.js App Router pages and layouts
├── components/        # React components (layout, ui, feature)
├── lib/               # Supabase client, AI service, social publisher, validation
├── services/          # Data-access service functions (UI → Service → Data)
├── hooks/             # Custom React hooks
├── types/             # TypeScript domain interfaces
├── data/              # Typed mock data (replaced by Supabase in Phase 5)
├── constants/         # Platform metadata, statuses, goals, navigation
└── utils/             # Pure utility functions
```

## Refactoring phases

| Phase | Status | Description |
|---|---|---|
| 1 | ✅ Done | Audit of the @Sites prototype |
| 2 | ✅ Done | Foundation — Next.js scaffold, types, constants, mock data, services |
| 3 | Upcoming | Layout & navigation — sidebar, topbar, all 11 routes |
| 3b | Upcoming | Feature components — campaign wizard, calendar, products |
| 4 | Planned | Data layer abstraction — service/repository boundary |
| 5 | Planned | Supabase — database, auth, RLS, storage |
| 6 | Planned | AI layer — OpenAI integration via server-side service |
| 7 | Planned | Social integrations — Facebook, Instagram adapters |
| 8 | Planned | Metrics & learning — analytics pipeline, AI recommendations |

## Scripts

```bash
npm run dev      # Start development server
npm run build    # Production build
npm run start    # Start production server
npm run lint     # ESLint
```
