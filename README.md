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


## Exam model (migration 009, November 2026)

- **Draw-based practicals.** Each exam has one **compulsory** skill (every student) and a **draw pool**. Each drawn skill has a **paper number** (defaults to the skill's permanent library number). Students draw `draws_per_student` papers (default 3); the same skill can't be drawn twice by one student. All drawn skills share the same allowed marks.
- **Allowed marks per exam.** `exam_skills.assigned_marks`; scores scale with `scaleScore(raw, nativeTotal, assignedMarks)`. Changing marks after scoring recalculates stored scores in the database and writes an audit entry. Rubrics lock once scored.
- **CSAs per exam.** `exam_csas` replaces per-skill/per-project assignment. Any CSA on an exam can score any skill or project for any rostered student; the first CSA to open a student + skill holds it (unique per student + skill).
- **Project chapters.** `exam_project_components` (default Chapter 1–5 at 4 marks) and `project_component_scores`; project total = sum of chapters.
- **Admin tools.** Reassign a wrong paper number, release a stuck draft, remove a student or skill from an exam, delete an exam (type its title) — all audited, via `admin_*` database functions.
- **Migrations** live in `supabase/migrations/` from 009 onward (001–008 were applied by hand in the Supabase SQL editor).

## Levels (migration 010)

- Each exam can record the **level** it is for (e.g. "Year 2"). The roster page opens filtered to that level; results, exports and printed sheets show it; exam and results lists can be filtered by it.
- Students keep one permanent record across sessions. At a new session, use **Students → Change level for a whole group** (e.g. Year 2 → Year 3). It is audited and never changes past exams or scores.
