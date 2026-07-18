-- St. Pete Bike Coop Member Management System
-- SQLite schema. Applied idempotently at startup by lib/db.ts.

CREATE TABLE IF NOT EXISTS people (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  is_staff INTEGER NOT NULL DEFAULT 0,
  is_site_lead INTEGER NOT NULL DEFAULT 0,
  email_opt_out INTEGER NOT NULL DEFAULT 0,
  street1 TEXT,
  street2 TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  country TEXT,
  year_of_birth INTEGER,
  tags TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_people_name ON people (last_name, first_name);

CREATE TABLE IF NOT EXISTS memberships (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  person_id INTEGER NOT NULL REFERENCES people (id),
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  logged_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_memberships_person ON memberships (person_id);

CREATE TABLE IF NOT EXISTS visits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  person_id INTEGER NOT NULL REFERENCES people (id),
  visit_date TEXT NOT NULL DEFAULT (date('now')),
  is_volunteer INTEGER NOT NULL DEFAULT 0,
  logged_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (person_id, visit_date)
);

CREATE INDEX IF NOT EXISTS idx_visits_person ON visits (person_id);
CREATE INDEX IF NOT EXISTS idx_visits_date ON visits (visit_date);

CREATE TABLE IF NOT EXISTS flags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  person_id INTEGER NOT NULL REFERENCES people (id),
  level TEXT NOT NULL CHECK (level IN ('banned', 'watch', 'heads_up')),
  note TEXT,
  logged_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  resolved_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_flags_person ON flags (person_id, resolved_at);

CREATE TABLE IF NOT EXISTS notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  person_id INTEGER NOT NULL REFERENCES people (id),
  text TEXT NOT NULL,
  logged_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_notes_person ON notes (person_id, created_at);

-- One row per (person, reward tier) once redeemed. Tiers themselves are a
-- code constant (lib/rewards.ts), not a table, so they're easy to tune.
CREATE TABLE IF NOT EXISTS reward_redemptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  person_id INTEGER NOT NULL REFERENCES people (id),
  tier_id TEXT NOT NULL,
  redeemed_at TEXT NOT NULL DEFAULT (datetime('now')),
  logged_by TEXT,
  UNIQUE (person_id, tier_id)
);

CREATE INDEX IF NOT EXISTS idx_reward_redemptions_person ON reward_redemptions (person_id);

-- Tracks one-off data-fix migrations (see lib/db.ts) so they run exactly
-- once per database, distinct from the schema/column changes above.
CREATE TABLE IF NOT EXISTS schema_migrations (
  name TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL DEFAULT (datetime('now'))
);
