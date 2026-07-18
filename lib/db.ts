import Database from 'better-sqlite3'
import fs from 'node:fs'
import path from 'node:path'

const globalForDb = globalThis as unknown as { db?: Database.Database }

function createConnection() {
  const dbPath = process.env.DATABASE_PATH || './bikecoop.db'
  const db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  const schemaPath = path.join(process.cwd(), 'db', 'schema.sql')
  db.exec(fs.readFileSync(schemaPath, 'utf8'))

  return db
}

export const db = globalForDb.db ?? createConnection()

if (process.env.NODE_ENV !== 'production') {
  globalForDb.db = db
}
