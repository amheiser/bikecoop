import Database from 'better-sqlite3'
import fs from 'node:fs'
import path from 'node:path'

const globalForDb = globalThis as unknown as { db?: Database.Database }

// Adds a column to an existing table if it's not already there. schema.sql's
// CREATE TABLE IF NOT EXISTS only applies to brand-new databases, so columns
// added after a table already exists (on an already-deployed DB) need this.
function ensureColumn(db: Database.Database, table: string, column: string, definition: string) {
  const columns = db.pragma(`table_info(${table})`) as { name: string }[]
  if (!columns.some((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`)
  }
}

function migrate(db: Database.Database) {
  ensureColumn(db, 'people', 'is_site_lead', 'INTEGER NOT NULL DEFAULT 0')
  ensureColumn(db, 'people', 'street1', 'TEXT')
  ensureColumn(db, 'people', 'street2', 'TEXT')
  ensureColumn(db, 'people', 'city', 'TEXT')
  ensureColumn(db, 'people', 'state', 'TEXT')
  ensureColumn(db, 'people', 'postal_code', 'TEXT')
  ensureColumn(db, 'people', 'country', 'TEXT')
  ensureColumn(db, 'people', 'year_of_birth', 'INTEGER')
  ensureColumn(db, 'people', 'tags', 'TEXT')
}

function createConnection() {
  const dbPath = process.env.DATABASE_PATH || './bikecoop.db'
  const db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  const schemaPath = path.join(process.cwd(), 'db', 'schema.sql')
  db.exec(fs.readFileSync(schemaPath, 'utf8'))
  migrate(db)

  return db
}

export const db = globalForDb.db ?? createConnection()

if (process.env.NODE_ENV !== 'production') {
  globalForDb.db = db
}
