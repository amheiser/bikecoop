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

## Phase 5 — Reports & AI-friendly export (complete)

**Date:** 2026-07-18

### What was built

- **`lib/reports.ts`** — `getPeriodRange` (monthly / quarterly / annual → ISO
  start/end + a display label), `getReportMetrics` (total visits, unique
  visitors, volunteer sessions, volunteer hours, new members — first
  membership `start_date` in period — and lapsed members — latest
  membership `end_date` in period).
- **`/reports`** — a GET-form period picker (type/year/month/quarter, always
  visible, only the relevant fields used server-side — no client JS needed)
  defaulting to the current month, rendering the six metrics as stat tiles.
- **`lib/export.ts`** — `getExportRows` (one row per person with
  `membership_status`, `days_until_or_since_expiry` — positive if still
  active, negative if lapsed, `total_volunteer_hours`, `current_milestone`,
  `active_flags` as a comma-joined list of levels, `email_opt_out`) and a
  small hand-rolled `rowsToCSV` (no new dependency — keeps with CLAUDE.md's
  "minimal pinned dependencies" rule).
- **`/export/csv`** and **`/export/json`** — Route Handlers (Next 16's
  `route.ts` convention) returning the export with `Content-Disposition:
  attachment` so they download directly; linked as buttons from `/reports`.
  Protected by the same `proxy.ts` auth gate as every other route — no
  separate auth check needed inside the handlers.
- Added "Reports" to the top nav.

### Verified

Typecheck and `npm run build` pass (`/reports`, `/export/csv`,
`/export/json` all show up in the build output). Browser-driven (Playwright)
end-to-end: created a person, checked them in as a volunteer, and recorded a
membership, all "this month" — the default `/reports` view showed 1 total
visit, 1 unique visitor, 1 volunteer session, 2.5 volunteer hours, 1 new
member, 0 lapsed members; switching to an unrelated past period (`2023`
annual) showed all zeros, confirming the date-range filtering actually
filters. Downloaded both `/export/csv` and `/export/json` through the
authenticated browser context and confirmed correct headers
(`Content-Type: text/csv`, `Content-Disposition: attachment; filename=...`)
and correct computed field values (`membership_status: active`,
`days_until_or_since_expiry: 365`, etc.). Zero console errors.

### Not built yet (explicitly out of scope so far)

Freehub CSV import (Phase 6) — see CLAUDE.md's checklist. This one needs the
actual legacy CSV header row from Freehub before the field mapping can be
finalized (per CLAUDE.md's own note under "Data import").

## Person model enhancement: comprehensive fields + staff/site-lead split (complete)

**Date:** 2026-07-18

Prompted by feedback on the Add Person form ("this needs to be more
comprehensive") plus a real bug: `is_staff` was doing double duty as both a
general staff designation *and* the flag that populated the site-lead
dropdown, which is wrong — most staff are not site leads. Researched by
cloning the actual legacy Freehub repo (github.com/asalant/freehub, not just
its wiki) and reading `db/schema.rb`, `app/models/person.rb`, and the person
views directly, rather than guessing at its field set.

### What was built

- **Split `is_staff` from a new `is_site_lead`** — `is_staff` is now a
  general profile designation (drives a Freehub-style Staff/Member/Patron
  label); `is_site_lead` is the narrower flag that actually populates the
  "Working today" dropdown. `getStaff()` stays; added `getSiteLeads()`.
- **Added Person fields matching Freehub's model**: full mailing address
  (`street1`/`street2`/`city`/`state`/`postal_code`/`country`),
  `year_of_birth`, and free-form comma-separated `tags` (rendered as pill
  badges on the profile).
- **Added a `notes` table** and general free-text Notes journal on the
  profile — timestamped, attributed, never edited/deleted. Distinct from the
  structured Flags system (Freehub has no ban/watch levels at all, just this
  kind of general note).
- **Idempotent migration in `lib/db.ts`** — new `ensureColumn()`/`migrate()`
  helpers run `ALTER TABLE ... ADD COLUMN` guarded by `PRAGMA table_info`,
  so the already-deployed Render database picks up the new `people` columns
  without a manual migration step or downtime. `schema.sql`'s
  `CREATE TABLE IF NOT EXISTS` alone only covers brand-new databases.
- Updated `person-form.tsx`, the profile page, and the top-nav site-lead
  picker accordingly.

### Also surfaced by the research

Freehub tracks a second "service" type, Earn a Bike/Digging Rights, alongside
membership. Nick wanted this reimagined as an hours-based rewards system
rather than a straight port — see the "Volunteer-hour rewards" entry below,
built the same day after a proposal was confirmed.

### Verified

Typecheck and `npm run build` pass. Verified the migration path specifically
(not just the happy path): hand-built a SQLite DB shaped like the
*pre-migration* production schema (no `is_site_lead`/address/etc. columns),
ran `lib/db.ts`'s migration logic against it, and confirmed all new columns
were added, the `notes` table was created, and the existing row survived
with safe defaults (`is_site_lead = 0`, address fields `NULL`) rather than
erroring or dropping data. Browser-driven (Playwright) end-to-end on a fresh
DB: created a staff-but-not-site-lead person and confirmed they're absent
from the site-lead dropdown; created a second person with the full field set
(address, year of birth, tags, staff, site lead) and confirmed they *do*
appear in the dropdown, and that the profile correctly renders their address,
tags as badges, and Staff/Site lead labels; added a note and confirmed it
appears in the notes feed with a timestamp. Zero console errors.

## Volunteer-hour rewards (complete)

**Date:** 2026-07-18

Proposed in conversation (manual redemption vs auto-grant; shop-credit
ledger now vs later — both resolved in favor of the simpler option) and
built the same day using Nick's example numbers as the starting config.

### What was built

- **`lib/rewards.ts`** — `REWARD_TIERS` (10 hrs → Free Annual Membership,
  30 hrs → Earn-a-Bike Eligibility; a plain code array, easy to retune),
  `getRewardStatuses(personId, hours)` → `locked` / `available` / `redeemed`
  per tier, `redeemReward`.
- **`reward_redemptions` table** — one row per redeemed
  `(person_id, tier_id)`, enforced unique so a tier can't be redeemed twice.
- **`redeemRewardAction`** (`app/people/actions.ts`) — re-validates
  eligibility and non-duplication server-side (not just trusting the UI
  state), then records the redemption; for `free_membership` specifically,
  also calls the existing `createMembership()` to record a free year,
  stamped `"<site lead> (redeemed reward)"` in `logged_by` for traceability.
- **Rewards section on the profile** — one row per tier showing Locked /
  a "Redeem" button (when available) / "Redeemed `<date>` by `<site lead>`".
- Moved `oneYearFrom` from a page-local helper into `lib/memberships.ts` so
  both the profile page and the reward-redemption action could share it.

### Explicitly deferred

An "hours → ongoing shop credit" ledger — a fundamentally different shape of
feature (a running balance, not a one-time unlock) — per Nick's choice to
ship the two threshold rewards first and revisit credit later.

### Verified

Typecheck and `npm run build` pass. Browser-driven (Playwright) end-to-end:
backdated volunteer visits (via SQLite, since check-ins are one-per-day) to
give a test person exactly 10.0 hours — confirmed "Free Annual Membership"
showed as available while "Earn-a-Bike" stayed locked; redeemed it and
confirmed the reward flipped to "Redeemed `<timestamp>`", a real membership
record appeared in Membership history, and the status banner flipped to
"Current member"; reloaded and confirmed the Redeem button was gone (can't
double-redeem); backdated further to 30.0 hours, confirmed Earn-a-Bike
became available, redeemed it, and confirmed exactly one membership row
existed throughout (no duplicate-creation bug from re-redeeming or
re-rendering). Zero console errors.

## Post-deploy fixes: site-lead migration bug, Volunteer wording, new-person membership (complete)

**Date:** 2026-07-18

Reported by Nick right after the person-model deploy went live: the "Working
today" dropdown appeared broken.

### Root cause

The `is_staff`/`is_site_lead` split shipped in the previous commit had a real
regression: under the old (pre-split) code, `is_staff = 1` was what populated
the site-lead dropdown. Splitting the flag added `is_site_lead` defaulting to
`0` for *every* already-existing person — including everyone who used to show
up in the dropdown — silently revoking their dropdown access on deploy. Not
caught earlier because verification only tested fresh people created after
the split, never an already-existing "staff" person carried across the
migration.

### What was built

- **One-time backfill migration** (`lib/db.ts`) — a new `runOnce()` helper
  backed by a `schema_migrations` tracking table (`name`, `applied_at`).
  `backfill_site_lead_from_staff` sets `is_site_lead = 1` for anyone who
  already had `is_staff = 1`, exactly once, on whichever database it hits
  next (dev or the already-migrated production DB — it re-checks the
  column's *existence*, not this data fix, so it still applies even though
  `is_site_lead` itself was added in the prior deploy). Verified it does
  **not** re-run on subsequent boots and does **not** fight a future manual
  edit (e.g. someone later unchecking Site Lead for a volunteer stays
  unchecked).
- **"Staff" renamed to "Volunteer"** in the UI (checkbox label on
  `person-form.tsx`, the Volunteer/Member/Patron type shown on the profile).
  The underlying `is_staff` column/variable names are unchanged — renaming
  them to `is_volunteer` would collide in meaning with `visits.is_volunteer`
  (a specific day's volunteer session vs. this general designation), so only
  the display text changed.
- **New-person form gained three checkboxes** (shown only when creating, not
  editing, mirroring Freehub's own new-person form): "Start annual
  membership today", "Check in today", "…as a volunteer session". Previously
  creating a person required a second trip to their profile to record a
  membership or check them in — a real gap vs. Freehub that Nick called out.

### Verified

Typecheck and `npm run build` pass. Reproduced the exact bug first: built a
database shaped like the *live pre-fix* state (`is_site_lead` column already
present, defaulted to 0, on a person with `is_staff = 1`), ran the new
migration logic against it, and confirmed the backfill fixes it — then ran
migration a second time (no change) and a third time after manually
unsetting the flag (stays unset, confirming the fix doesn't fight future
edits). Browser-driven (Playwright): confirmed the new-person form shows
"Volunteer" (not "Staff") and the three new checkboxes; created a person with
all three checked in one submission and confirmed the profile showed
"Current member", a volunteer visit in Visit History, and 2.5 volunteer
hours; confirmed the Edit form correctly omits the new-person-only
checkboxes. Zero console errors.

## Simplified new-person form + sample data for testing (complete)

**Date:** 2026-07-18

Nick wanted sign-up and sign-in kept as separate steps (dropped the "Check
in today" / "...as a volunteer session" checkboxes added in the previous
fix, keeping only "Start annual membership today"), and asked for sample
data so he could test the app without hand-creating everything.

### What was built

- **Removed the check-in checkboxes** from the new-person form
  (`person-form.tsx`) and the corresponding logic from `createPersonAction`.
  "Start annual membership today" stays — that part of the original ask was
  correct, just not the check-in bundling.
- **`lib/seed.ts`** — `seedSampleData()` creates 7 people covering every
  major state the app models: a bare patron (no membership/visits), an
  active member with a mixed visit history and a note, a lapsed member, a
  volunteer just past the 10hr milestone/reward tier, a staff+site-lead
  volunteer past the 30hr Earn-a-Bike tier (also exercises the site-lead
  dropdown), a banned person, and a watch-flagged person. All tagged
  `sample-data` so they're identifiable and safely removable as a group.
  `clearSampleData()` deletes them and all their dependent rows (visits,
  memberships, flags, notes, reward redemptions).
- **"Sample Data" section on `/reports`** — "Load Sample Data" / "Clear
  Sample Data" buttons calling new server actions in `app/reports/actions.ts`.
  This runs against whichever database the app is currently pointed at
  (dev or the live Render deploy) since there's no way for me to seed the
  production database directly — Nick triggers it himself from the UI.

### Verified

Typecheck and `npm run build` pass. Browser-driven (Playwright) end-to-end:
confirmed the new-person form no longer shows the check-in checkboxes but
still has "Start annual membership today"; loaded sample data and confirmed
all 7 people appear in the list; confirmed the site-lead dropdown includes
the staff+site-lead sample volunteer; opened her profile and confirmed 32.5
volunteer hours, both reward tiers showing "Redeem" (available), and
"Current member" status; opened the banned sample person's profile and
confirmed the blocking modal fires; confirmed the lapsed sample person shows
"Lapsed" status; cleared sample data and confirmed all 7 people were gone.
Zero console errors.

## People-list default state, volunteer-UI visibility, flag merge, Reports hub (complete)

**Date:** 2026-07-18

Nick's feedback after clicking through the sample data, worked from an approved plan
(`/Users/amheiser/.claude/plans/so-if-the-person-harmonic-newt.md`) with three design
decisions locked in via `AskUserQuestion` first: gate volunteer UI on actual hours
(not the Volunteer role flag), merge `watch`/`heads_up` into one level, and fold
Lapsed Members into a Reports hub alongside a new Volunteers report.

### What was built

- **`/people` no longer defaults to listing everyone.** `searchPeople('')` now
  returns `[]`; the page shows "Search for a person by name or email to check them
  in." until a query is typed, and "No matches." only once a search has actually
  come up empty.
- **Volunteer Hours stat, milestone badges, and the Rewards section are hidden
  until a person has logged at least one volunteer hour** (`volunteerHours > 0`),
  not gated on the "Volunteer" role checkbox — an occasional, unflagged volunteer
  still gets full credit and visibility once they've logged a session. Foot traffic
  stays visible for everyone; it's the only stat shown at 0 volunteer hours. The
  Check-In "Volunteer session" checkbox is unaffected — it stays available for
  everyone, since that's how hours start.
- **Merged the `watch` and `heads_up` flag levels into one** (kept as `watch` in
  the DB/CSS/label — they were functionally identical, just a different color and
  icon). New `runOnce()` migration `merge_heads_up_into_watch` converts any
  existing `heads_up` rows; `schema.sql`'s CHECK constraint narrowed for new
  databases. The flag-add form now offers only Watch / Banned.
- **Reports is now the single hub for all reporting.** Added `getVolunteerRoster()`
  to `lib/hours.ts` (everyone with any logged volunteer hours, sorted by hours
  descending). `/reports` gained "Lapsed Members" and "Volunteers" sections (reusing
  the existing `getLapsedPeople()`); the standalone `/memberships/lapsed` page and
  its top-nav link were deleted; `revalidatePath('/memberships/lapsed')` calls
  scattered across `app/people/actions.ts` and `app/reports/actions.ts` were
  updated to `revalidatePath('/reports')`.

### Verified

Typecheck and `npm run build` pass (`/memberships/lapsed` confirmed gone from the
build's route list). Migration correctness verified the same way as the earlier
site-lead fix: hand-built a SQLite DB with a `heads_up` flag row (simulating
already-deployed production data), ran the new migration logic against it, confirmed
the row flipped to `watch`, and confirmed a second `migrate()` run left it unchanged
(idempotent). Browser-driven (Playwright) end-to-end: empty `/people` search shows
the new prompt, not a list; loaded sample data and confirmed the 0-hour sample
people (Larry Lapsed, Patty Patron, Banned Bob, Watchful Wendy) show **only** Foot
traffic with no Volunteer hours/badges/Rewards, while the >0-hour sample people
(Vera, Rookie, Mia) still show all three; the flag-level dropdown only offers Watch
and Banned; Wendy's pre-existing "watch" banner still renders correctly; `/reports`
shows both new sections with correct data (Larry in Lapsed Members, the three
volunteers sorted by hours with milestone labels in Volunteers, 0-hour people
correctly excluded); `/memberships/lapsed` returns 404; the top nav no longer shows
"Lapsed Members". Zero console errors (aside from the test's own intentional 404
check).
