import { db } from '@/lib/db'
import { oneYearBefore } from '@/lib/dates'

// The exact column list produced by legacy Freehub's "People" report CSV
// export (Person::CSV_FIELDS in app/models/person.rb — note postal_code
// really does appear twice; that's a Freehub quirk, both values are the same).
export const FREEHUB_PEOPLE_HEADER = [
  'id',
  'first_name',
  'last_name',
  'staff',
  'email',
  'email_opt_out',
  'phone',
  'postal_code',
  'street1',
  'street2',
  'city',
  'state',
  'postal_code',
  'country',
  'yob',
  'tag_list',
  'created_at',
  'membership_expires_on',
]

// Column positions, validated against the header before any row is read.
const COL = {
  id: 0,
  first_name: 1,
  last_name: 2,
  staff: 3,
  email: 4,
  email_opt_out: 5,
  phone: 6,
  postal_code: 7,
  street1: 8,
  street2: 9,
  city: 10,
  state: 11,
  country: 13,
  yob: 14,
  tag_list: 15,
  created_at: 16,
  membership_expires_on: 17,
}

// Minimal RFC-4180 CSV parser: quoted fields, escaped quotes, embedded
// commas/newlines, CRLF line endings. Blank lines are dropped.
export function parseCSV(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false
  let i = 0
  while (i < text.length) {
    const char = text[i]
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i += 2
          continue
        }
        inQuotes = false
        i++
        continue
      }
      field += char
      i++
      continue
    }
    if (char === '"') {
      inQuotes = true
      i++
      continue
    }
    if (char === ',') {
      row.push(field)
      field = ''
      i++
      continue
    }
    if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') i++
      row.push(field)
      field = ''
      rows.push(row)
      row = []
      i++
      continue
    }
    field += char
    i++
  }
  if (field !== '' || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  return rows.filter((r) => !(r.length === 1 && r[0].trim() === ''))
}

export type ImportResult = {
  peopleCreated: number
  peopleAlreadyPresent: number
  membershipsCreated: number
  skipped: { row: number; reason: string }[]
}

function truthy(value: string): boolean {
  return ['true', 't', '1', 'yes'].includes(value.trim().toLowerCase())
}

function orNull(value: string | undefined): string | null {
  const trimmed = (value ?? '').trim()
  return trimmed || null
}

const LOGGED_BY = 'Freehub import'

export function importFreehubPeople(csvText: string): ImportResult {
  const rows = parseCSV(csvText)
  if (rows.length < 2) {
    throw new Error('The file has no data rows.')
  }

  const header = rows[0].map((h) => h.trim().toLowerCase())
  const headerMatches =
    header.length === FREEHUB_PEOPLE_HEADER.length &&
    FREEHUB_PEOPLE_HEADER.every((name, i) => header[i] === name)
  if (!headerMatches) {
    throw new Error(
      `This doesn't look like a Freehub People report CSV. Expected columns: ${FREEHUB_PEOPLE_HEADER.join(', ')}. Got: ${header.join(', ')}`
    )
  }

  const findByFreehubId = db.prepare('SELECT id FROM people WHERE freehub_id = ?')
  // Fallback for people hand-entered before the import ran: adopt them by
  // exact name+email instead of creating a duplicate.
  const findByNameEmail = db.prepare(
    `SELECT id FROM people
     WHERE freehub_id IS NULL
       AND lower(first_name) = ? AND lower(last_name) = ?
       AND lower(COALESCE(email, '')) = ?`
  )
  const adopt = db.prepare('UPDATE people SET freehub_id = ? WHERE id = ?')
  const insertPerson = db.prepare(
    `INSERT INTO people (
       first_name, last_name, email, phone, is_staff, is_site_lead, email_opt_out,
       street1, street2, city, state, postal_code, country, year_of_birth, tags,
       freehub_id, created_at
     ) VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, datetime('now')))`
  )
  const hasMembershipEnding = db.prepare(
    'SELECT 1 FROM memberships WHERE person_id = ? AND end_date = ?'
  )
  const insertMembership = db.prepare(
    'INSERT INTO memberships (person_id, start_date, end_date, logged_by) VALUES (?, ?, ?, ?)'
  )

  const result: ImportResult = {
    peopleCreated: 0,
    peopleAlreadyPresent: 0,
    membershipsCreated: 0,
    skipped: [],
  }

  const run = db.transaction(() => {
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i]
      const rowNumber = i + 1 // 1-based, counting the header row

      if (row.length !== FREEHUB_PEOPLE_HEADER.length) {
        result.skipped.push({ row: rowNumber, reason: `expected ${FREEHUB_PEOPLE_HEADER.length} columns, got ${row.length}` })
        continue
      }

      const firstName = row[COL.first_name].trim()
      const lastName = row[COL.last_name].trim()
      if (!firstName || !lastName) {
        result.skipped.push({ row: rowNumber, reason: 'missing first or last name' })
        continue
      }

      const freehubIdRaw = row[COL.id].trim()
      const freehubId = /^\d+$/.test(freehubIdRaw) ? Number(freehubIdRaw) : null
      const email = orNull(row[COL.email])

      let personId: number
      const byId = freehubId !== null ? (findByFreehubId.get(freehubId) as { id: number } | undefined) : undefined
      const byName = byId
        ? undefined
        : (findByNameEmail.get(firstName.toLowerCase(), lastName.toLowerCase(), (email ?? '').toLowerCase()) as
            | { id: number }
            | undefined)

      if (byId) {
        personId = byId.id
        result.peopleAlreadyPresent++
      } else if (byName) {
        personId = byName.id
        if (freehubId !== null) adopt.run(freehubId, personId)
        result.peopleAlreadyPresent++
      } else {
        const yobRaw = row[COL.yob].trim()
        const createdAtRaw = row[COL.created_at].trim()
        const inserted = insertPerson.run(
          firstName,
          lastName,
          email,
          orNull(row[COL.phone]),
          truthy(row[COL.staff]) ? 1 : 0,
          truthy(row[COL.email_opt_out]) ? 1 : 0,
          orNull(row[COL.street1]),
          orNull(row[COL.street2]),
          orNull(row[COL.city]),
          orNull(row[COL.state]),
          orNull(row[COL.postal_code]),
          orNull(row[COL.country]),
          /^\d{4}$/.test(yobRaw) ? Number(yobRaw) : null,
          orNull(row[COL.tag_list]),
          freehubId,
          /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(createdAtRaw) ? `${createdAtRaw}:00` : null
        )
        personId = Number(inserted.lastInsertRowid)
        result.peopleCreated++
      }

      // Freehub's people export carries only the latest membership expiry;
      // reconstruct that one membership (start = one year before end).
      const expiresOn = row[COL.membership_expires_on].trim()
      if (expiresOn) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(expiresOn)) {
          result.skipped.push({
            row: rowNumber,
            reason: `person imported, but membership_expires_on "${expiresOn}" is not a YYYY-MM-DD date — no membership created`,
          })
        } else if (!hasMembershipEnding.get(personId, expiresOn)) {
          insertMembership.run(personId, oneYearBefore(expiresOn), expiresOn, LOGGED_BY)
          result.membershipsCreated++
        }
      }
    }
  })
  run()

  return result
}
