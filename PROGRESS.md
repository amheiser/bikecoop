# Progress Log

## Phase 1 — Schema, People pages, check-in, auth (complete)

**Date:** 2026-07-18

### What was built

- **`db/schema.sql`** — `people`, `memberships`, `visits`, `flags` tables per the
  domain model in CLAUDE.md. Applied idempotently (`CREATE TABLE IF NOT EXISTS`).
- **`lib/db.ts`** — `better-sqlite3` singleton connection (survives dev hot-reload
  via a `globalThis` cache). Reads `DATABASE_PATH`, defaults to `./bikecoop.db`.
  WAL journal mode, foreign keys on.
- **`lib/people.ts`** — data access: search/list, get, create, update people;
  get visits for a person; check in (upsert on `UNIQUE(person_id, visit_date)`).
- **Auth (`lib/auth.ts`, `app/login/`, `proxy.ts`)** — single shared
  username/password from `AUTH_USERNAME` / `AUTH_PASSWORD` env vars. Session is a
  stateless HMAC-signed cookie (`SESSION_SECRET`), no session table. `proxy.ts`
  (Next.js 16's renamed `middleware.ts`) gates every route and redirects
  unauthenticated requests to `/login`.
- **Site-lead dropdown (`lib/site-lead.ts`, `app/site-lead-picker.tsx`,
  `app/actions.ts`)** — top-bar `<select>` of `is_staff` people, auto-submits on
  change, persisted in a cookie, stamped as `logged_by` on every visit.
- **People pages (`app/people/`)**
  - `/people` — search box + results list with an inline check-in
    (volunteer checkbox) per row, "+ Add Person" link.
  - `/people/new` — add-person form.
  - `/people/[id]` — profile: contact info, check-in form, visit history.
  - `/people/[id]/edit` — edit-person form.
- Rewrote `app/globals.css` for a high-contrast, big-button, front-desk-friendly
  UI (plain CSS, no Tailwind, per CLAUDE.md). Dropped the Google-fonts
  (Geist) dependency in favor of a system font stack to avoid a network
  fetch at build time.

### Next.js version note

This repo runs Next.js 16.2.10, which has real breaking changes vs. older
training data (confirmed against the docs bundled in
`node_modules/next/dist/docs/`, per AGENTS.md): `cookies()`/`headers()`/`params`
are async-only, mutations use Server Functions (`'use server'`) instead of API
routes, and `middleware.ts` is renamed to `proxy.ts`. All new code follows
these conventions.

### Verified

Typecheck and `npm run build` both pass. Full golden path driven end-to-end in
a real headless browser (Playwright, since no browser tool was preloaded in
this environment) with screenshots and a `console --errors` check:

1. Unauthenticated visit to `/` redirects to `/login`.
2. Login with `AUTH_USERNAME` / `AUTH_PASSWORD` redirects to `/people`.
3. "+ Add Person" creates a person and redirects to their profile.
4. Searching `/people` finds the new person; inline check-in with the
   volunteer checkbox records a visit, visible on their profile.
5. Editing a person via `/people/[id]/edit` saves and redirects back.
6. The site-lead dropdown selection persists across a page reload (cookie).

Zero console/page errors observed.

### Before deploying

- Set real `AUTH_USERNAME`, `AUTH_PASSWORD`, and a strong `SESSION_SECRET` in
  Render's environment (a throwaway dev-only `.env.local` is gitignored and
  not committed).
- `DATABASE_PATH` should be `/var/data/bikecoop.db` once the persistent disk
  is attached (still Phase 6 per CLAUDE.md's checklist).

### Not built yet (explicitly out of scope for this phase)

Hours/badges (Phase 2), flags (Phase 3), memberships (Phase 4), reporting/
export (Phase 5), Freehub CSV import (Phase 6) — see CLAUDE.md's checklist.
