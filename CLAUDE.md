# CLAUDE.md — St. Pete Bike Coop Member Management System

Read this fully before making changes. It is the source of truth for scope and conventions.

## What this project is

A member-management web app for a cooperative bike shop, replacing a legacy Ruby on Rails
app ("Freehub"). Built and maintained by one person (Nick). The #1 priority is **stability
and low maintenance**: boring, well-established patterns; pinned dependencies; no clever
abstractions. Prefer the simplest thing that works. It may later be offered to other co-ops.

## Stack (do not change without asking)

- Next.js (App Router) + TypeScript — UI and API in one deployable app
- SQLite via `better-sqlite3` (synchronous API is fine; this app has one concurrent user)
- No ORM, no Tailwind, no component libraries unless asked. Plain CSS or CSS modules.
- Hosted on Render. Deploys automatically on push to `main` via GitHub.
- Database file location comes from `process.env.DATABASE_PATH`, defaulting to
  `./bikecoop.db` locally. On Render production it will be `/var/data/bikecoop.db`.
  Never hardcode paths. Never commit the database file (gitignored).

## Domain model (four tables — see db/schema.sql)

- **people** — everyone who enters the shop, members and non-members. `is_staff` marks
  site leads. `email_opt_out` must be respected in any export.
- **memberships** — dated annual records attached to a person. Current membership =
  `end_date >= today`. Lapsed = most recent membership has `end_date < today`.
  One membership type only (annual).
- **visits** — one row per person per day (`UNIQUE(person_id, visit_date)` enforces this;
  shop is only open 6:00–8:30pm so multiple daily visits are impossible).
  `is_volunteer = 1` means the visit was a volunteer session worth exactly **2.5 hours**.
  Total volunteer hours = count(volunteer visits) × 2.5. Foot traffic = count(all visits).
- **flags** — warnings shown when a person is looked up. Levels: `banned`, `watch`,
  `heads_up`. `banned` → blocking modal that must be dismissed before proceeding.
  `watch`/`heads_up` → prominent colored banner on the person's record. Flags persist
  until manually cleared (`resolved_at` set). Any volunteer can add or clear flags.

## Volunteer milestones / badges

Computed live from cumulative hours, never stored. Thresholds (hours):
5, 10, 20, 50, 100, 200, 300, 400, 500+.
When logging a session pushes someone past a threshold, show an in-app celebration
(e.g. toast: "🎉 Jane just passed 50 hours!"). Badges display on the person's profile.

## Auth & attribution model

- One shared username/password for the whole app (simple session cookie is fine).
  This is the only real security boundary.
- Inside the app, a dropdown of site leads (people where `is_staff = 1`) selects who is
  operating the tool. Their name is stamped as `logged_by` on every visit, membership,
  and flag. Remember the selection per device (cookie). This is attribution, not
  security — do not build role-based permissions.
- No member-facing login of any kind in v1.

## Explicitly out of scope for v1 (do not build)

- Shift signup, SignUpGenius replacement, Slack integration
- The app sending email (exports only; email is handled externally)
- Member self-service portal
- Multi-organization support (keep code clean enough to add later, but do not build it)

## Reporting & export (Phase 5)

- Periods: monthly, quarterly (Q1–Q4), annual. Metrics: total visits, unique visitors,
  volunteer sessions, volunteer hours, new members, lapsed members.
- "AI-friendly export": one row per person — CSV and JSON — with stable snake_case
  column names and computed fields: membership_status (active/lapsed/none),
  days_until_or_since_expiry, total_volunteer_hours, current_milestone, active_flags,
  email_opt_out. This is fed to external AI tools to draft emails; the app never sends.

## Data import (Phase 6)

A one-time CSV import from the legacy Freehub export (people + membership history).
Legacy data has no volunteer hours — hour totals start at zero at go-live.
Import must de-duplicate and be re-runnable safely. Details finalized when the CSV
header row is provided.

## Build phases & current state

- [x] Phase 0 — Scaffold: Next.js app deployed to Render (free tier for now),
      auto-deploy from GitHub `main` working.
- [x] Phase 1 — Schema (`db/schema.sql`), connection (`lib/db.ts`), People pages
      (list/search, add/edit, profile), visit check-in with volunteer checkbox,
      site-lead dropdown + shared login.
- [ ] Phase 2 — Hours & badges: totals on profile, milestone badges, celebration toast.
- [ ] Phase 3 — Flags: add/clear UI, blocking modal for banned, banners for others.
- [ ] Phase 4 — Memberships: record/renew, current-vs-lapsed logic, lapsed list.
- [ ] Phase 5 — Reports & AI-friendly export.
- [ ] Phase 6 — Freehub CSV import. Before go-live: upgrade Render to Starter,
      attach persistent disk at /var/data, set DATABASE_PATH.

Keep this checklist updated as phases complete.

## Conventions

- Small commits with clear messages; push to `main` deploys automatically.
- Dates stored as ISO strings (`YYYY-MM-DD`); SQLite `date('now')` defaults are used.
- Keep dependencies minimal and pinned. Do not add packages without a strong reason.
- UI should be obvious enough for a non-technical volunteer at a front desk:
  big search box, big buttons, high contrast. Function over polish.
- The dev database (`bikecoop.db`) is disposable; never commit it.

@AGENTS.md
