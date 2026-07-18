import { db } from '@/lib/db'

export type Person = {
  id: number
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  is_staff: number
  email_opt_out: number
  created_at: string
}

export type Visit = {
  id: number
  person_id: number
  visit_date: string
  is_volunteer: number
  logged_by: string | null
  created_at: string
}

export function searchPeople(query: string): Person[] {
  const term = `%${query.trim()}%`
  if (!query.trim()) {
    return db
      .prepare('SELECT * FROM people ORDER BY last_name, first_name LIMIT 50')
      .all() as Person[]
  }
  return db
    .prepare(
      `SELECT * FROM people
       WHERE (first_name || ' ' || last_name) LIKE ? OR email LIKE ?
       ORDER BY last_name, first_name LIMIT 50`
    )
    .all(term, term) as Person[]
}

export function getPerson(id: number): Person | undefined {
  return db.prepare('SELECT * FROM people WHERE id = ?').get(id) as Person | undefined
}

export function getStaff(): Person[] {
  return db
    .prepare('SELECT * FROM people WHERE is_staff = 1 ORDER BY first_name, last_name')
    .all() as Person[]
}

export function createPerson(input: {
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
  isStaff: boolean
  emailOptOut: boolean
}): number {
  const result = db
    .prepare(
      `INSERT INTO people (first_name, last_name, email, phone, is_staff, email_opt_out)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(
      input.firstName,
      input.lastName,
      input.email,
      input.phone,
      input.isStaff ? 1 : 0,
      input.emailOptOut ? 1 : 0
    )
  return Number(result.lastInsertRowid)
}

export function updatePerson(
  id: number,
  input: {
    firstName: string
    lastName: string
    email: string | null
    phone: string | null
    isStaff: boolean
    emailOptOut: boolean
  }
): void {
  db.prepare(
    `UPDATE people SET first_name = ?, last_name = ?, email = ?, phone = ?, is_staff = ?, email_opt_out = ?
     WHERE id = ?`
  ).run(
    input.firstName,
    input.lastName,
    input.email,
    input.phone,
    input.isStaff ? 1 : 0,
    input.emailOptOut ? 1 : 0,
    id
  )
}

export function getVisitsForPerson(personId: number): Visit[] {
  return db
    .prepare('SELECT * FROM visits WHERE person_id = ? ORDER BY visit_date DESC')
    .all(personId) as Visit[]
}

export function checkIn(input: { personId: number; isVolunteer: boolean; loggedBy: string | null }): void {
  db.prepare(
    `INSERT INTO visits (person_id, is_volunteer, logged_by)
     VALUES (?, ?, ?)
     ON CONFLICT (person_id, visit_date) DO UPDATE SET is_volunteer = excluded.is_volunteer, logged_by = excluded.logged_by`
  ).run(input.personId, input.isVolunteer ? 1 : 0, input.loggedBy)
}
