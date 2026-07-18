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

Deployed to Render on 2026-07-18 with real `AUTH_USERNAME` / `AUTH_PASSWORD` /
`SESSION_SECRET` set in the Render dashboard. Login confirmed working on the
live site.

`DATABASE_PATH` should be updated to `/var/data/bikecoop.db` once the
persistent disk is attached (still Phase 6 per CLAUDE.md's checklist).

## Phase 2 — Hours & badges (complete)

**Date:** 2026-07-18

### What was built

- **`lib/hours.ts`** — `MILESTONES` (5, 10, 20, 50, 100, 200, 300, 400, 500
  hours), `getVolunteerHours` (volunteer visit count × 2.5), `getFootTraffic`
  (total visit count), `getCurrentMilestone`, `getAchievedMilestones`, and
  `getCrossedMilestone(before, after)` for detecting a threshold crossed by a
  single check-in. Kept as its own module since Phase 5's export also needs
  `total_volunteer_hours` and `current_milestone`.
- **`checkInAction`** now computes volunteer hours before and after the
  check-in and returns a celebration string (e.g. "🎉 Jane just passed 5
  hours!") when a threshold is crossed, or `null` otherwise.
- **`app/people/checkin-form.tsx`** — new client component wrapping the
  check-in form in `useActionState` so the returned celebration message can
  be rendered inline; replaces the old plain-HTML check-in forms on both the
  people list and profile page.
- **Profile page** now shows volunteer hours and foot traffic as stat tiles,
  plus a row of badge pills (one per milestone threshold) with achieved ones
  highlighted in the accent color.

### Verified

Typecheck and `npm run build` pass. Browser-driven (Playwright) end-to-end:
created a person, backdated one volunteer visit directly in SQLite to bank
2.5 hours (same-day check-ins upsert onto one `UNIQUE(person_id, visit_date)`
row, so multiple same-day clicks can't be used to simulate crossing a
threshold), then checked in as a volunteer today to push the total to 5.0
hours. Confirmed: celebration message rendered ("🎉 Milestone just passed 5
hours!"), stats tiles read 5 / 2, and exactly one badge ("5 hrs") was
highlighted as achieved. Zero console errors.

## Phase 3 — Flags (complete)

**Date:** 2026-07-18

### What was built

- **`lib/flags.ts`** — `getActiveFlags` (unresolved flags for a person),
  `createFlag`, `resolveFlag` (sets `resolved_at`).
- **`addFlagAction` / `resolveFlagAction`** (`app/people/actions.ts`) — add a
  flag (level + required note, stamped with the current site lead) or clear
  one. Any logged-in volunteer can do either, per CLAUDE.md.
- **`app/people/flag-add-form.tsx`** — client component (level select + note
  + `useActionState` for the "note required" validation error).
- **`app/people/banned-modal.tsx`** — client component: a blocking overlay
  shown whenever a profile has an active `banned` flag, listing the ban
  note(s), dismissible only via an "I Acknowledge" button. It re-appears
  every time the profile is loaded (local `useState`, not persisted) — the
  "shown when a person is looked up" behavior from CLAUDE.md.
- **Profile page** now renders `watch`/`heads_up` flags as colored banners
  (yellow / blue) with an inline "Clear" button, above the stats/badges.

### Also fixed while in the area

Added a show/hide toggle button on the login page's password field
(`app/login/login-form.tsx`), per user request — a plain `useState` flip
between `type="password"` and `type="text"`.

### Verified

Typecheck and `npm run build` pass. Browser-driven (Playwright) end-to-end:
toggled the login password visibility; added a `watch` flag and confirmed
the yellow banner rendered; added a `banned` flag and confirmed the banner
appeared *and* reloading the profile re-triggered the blocking modal (i.e.
it isn't a one-time dismissal); clicked "I Acknowledge" and confirmed the
modal closed; cleared both flags and confirmed the banner disappeared and
the modal no longer appears on reload. Zero console errors.

## Phase 4 — Memberships (complete)

**Date:** 2026-07-18

### What was built

- **`lib/memberships.ts`** — `getMembershipsForPerson` (full history),
  `getLatestMembership`, `getMembershipStatus` (`active` / `lapsed` / `none`,
  computed live by comparing the latest `end_date` to today — never stored),
  `createMembership` (used for both first-time recording and renewal — a
  renewal is just another row), `getLapsedPeople` (people whose latest
  membership's `end_date` is before today, for the lapsed list).
- **`addMembershipAction`** (`app/people/actions.ts`) — validates the date
  range, records the membership stamped with the current site lead.
- **`app/people/membership-form.tsx`** — client component (start/end date
  inputs, defaulting to today → one year out; `useActionState` for the "end
  before start" validation error).
- **Profile page** now shows a membership status banner (green "Current
  member — through `<date>`", yellow "Lapsed — expired `<date>`", or neutral
  "No membership on file"), the record/renew form, and membership history.
- **`/memberships/lapsed`** — new page listing everyone whose latest
  membership has expired, sorted most-recently-lapsed first, linked from the
  top nav as "Lapsed Members".

### Verified

Typecheck and `npm run build` pass (new `/memberships/lapsed` route shows up
in the build output). Browser-driven (Playwright) end-to-end: a person with
no membership showed "No membership on file"; recording one with the
pre-filled default dates flipped it to "Current member — through
`<one year out>`" and added a history row; a second person got a
directly-backdated expired membership (SQLite) and showed "Lapsed — expired
`<date>`"; the `/memberships/lapsed` page listed only that lapsed person, not
the active one. Zero console errors.

### Not built yet (explicitly out of scope so far)

Reporting/export (Phase 5), Freehub CSV import (Phase 6) — see CLAUDE.md's
checklist.
