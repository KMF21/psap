# PSAP — Practical Skills Assessment Portal

Next.js (App Router) + TypeScript + Tailwind + Clerk scaffold for the
Practical Skills Assessment Portal, built for Mr. Dauda Jr.

**Auth is real now.** Clerk handles sign-in, and route protection is live —
`/admin/*` requires an admin-role user, `/csa/*` requires a csa-role user,
enforced in `src/proxy.ts`. **Data is still mock** — pages read from
`src/lib/mock-data.ts`, not Supabase yet. That's the next step.

## Quick start

1. Copy `.env.local.example` to `.env.local` and fill in your real Clerk and
   Supabase values (see below for where to get each one).
2. `npm install`
3. `npm run dev`

## Setting up the environment variables

- **Clerk keys**: clerk.com dashboard → your app → API Keys.
- **Clerk webhook secret**: Clerk dashboard → Webhooks → Add Endpoint →
  URL `https://yourdomain.com/api/webhooks/clerk` (use an ngrok/tunnel URL
  for local testing) → subscribe to `user.created` and `user.updated` →
  copy the Signing Secret.
- **Supabase URL/anon key**: supabase.com dashboard → Project Settings → API.
- **Supabase service role key**: same page — this one is server-only, used
  by the Clerk webhook to write into the `users` table with elevated
  privileges. Never expose it to the browser or commit it.

## Setting a user's role

New users default to `csa` via the webhook. To make someone an Admin: Clerk
dashboard → Users → click the user → Public metadata → add
`{ "role": "admin" }`. The middleware and the webhook both read this field.

## What's implemented

**Auth (new)**
- Real Clerk sign-in/sign-up at `/sign-in` and `/sign-up`
- Route protection in `src/proxy.ts`: signed-out users are redirected to
  sign-in; signed-in users are routed to `/admin` or `/csa` based on their
  Clerk `publicMetadata.role`, and blocked from the wrong section entirely
- A webhook (`/api/webhooks/clerk`) keeps Supabase's `users` table in sync
  with Clerk on every user create/update — this is what the database's RLS
  policies (`current_app_role()`, `current_app_user_id()` in `001_init.sql`)
  actually check against
- `src/lib/supabase/client.ts` and `server.ts` — Supabase clients that pass
  Clerk's session token through as the Supabase access token, so Postgres
  RLS sees the real signed-in user. Built and ready, not yet used by any
  page (that's the mock-data swap, still to come)

**Admin** (`/admin`) — Dashboard, Students, Skills & rubrics, Examinations
(list + per-exam skill/mark/CSA setup), Results with export buttons (UI only)

**CSA** (`/csa`) — Dashboard scoped to assigned skills, and the scoring
screen with live raw/scaled score calculation (Option A proportional
scaling, per the technical spec)

## Project structure

```
src/
  proxy.ts               Route protection (Clerk role-based)
  app/
    admin/                Admin dashboard, students, skills, exams, results
    csa/                   CSA dashboard and scoring flow
    sign-in/, sign-up/     Clerk auth pages
    api/webhooks/clerk/     Syncs Clerk users into Supabase
    page.tsx               Redirects signed-in users by role; sign-in CTA otherwise
    globals.css             Design tokens
  components/
    layout/                 AdminSidebar, CsaSidebar
    ui/                     PageHeader, StatCard, StatusPill, Toolbar
  lib/
    types.ts                Types mirroring the Postgres schema + scaleScore()
    mock-data.ts             In-memory seed data — still what every page reads from
    supabase/                Clerk-aware Supabase clients, ready but unused
```

## Next steps

1. Swap `mock-data.ts` reads for real Supabase queries via
   `useSupabaseClient()` / `createServerSupabaseClient()`, page by page.
2. Update `AdminSidebar` / `CsaSidebar` to show the real signed-in user
   (via Clerk's `useUser()`) instead of the mock `currentAdmin` / `csas`.
3. Build the Admin "Manage CSA Accounts" screen using Clerk's Backend API
   to invite users by email (rather than expecting self-signup).
4. Implement bulk student import, Excel/PDF export, and audit log writes.
5. Deploy to Vercel; point the Clerk webhook at the production URL.
