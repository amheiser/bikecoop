import { db } from '@/lib/db'

export type Membership = {
  id: number
  person_id: number
  start_date: string
  end_date: string
  logged_by: string | null
  created_at: string
}

export type MembershipStatus = 'active' | 'lapsed' | 'none'

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

export function oneYearFrom(dateISO: string): string {
  const date = new Date(dateISO)
  date.setFullYear(date.getFullYear() + 1)
  return date.toISOString().slice(0, 10)
}

export function getMembershipsForPerson(personId: number): Membership[] {
  return db
    .prepare('SELECT * FROM memberships WHERE person_id = ? ORDER BY end_date DESC')
    .all(personId) as Membership[]
}

export function getLatestMembership(personId: number): Membership | undefined {
  return db
    .prepare('SELECT * FROM memberships WHERE person_id = ? ORDER BY end_date DESC LIMIT 1')
    .get(personId) as Membership | undefined
}

export function getMembershipStatus(personId: number): {
  status: MembershipStatus
  latest: Membership | undefined
} {
  const latest = getLatestMembership(personId)
  if (!latest) return { status: 'none', latest: undefined }
  return { status: latest.end_date >= todayISO() ? 'active' : 'lapsed', latest }
}

export function createMembership(input: {
  personId: number
  startDate: string
  endDate: string
  loggedBy: string | null
}): void {
  db.prepare(
    `INSERT INTO memberships (person_id, start_date, end_date, logged_by) VALUES (?, ?, ?, ?)`
  ).run(input.personId, input.startDate, input.endDate, input.loggedBy)
}

export type LapsedPerson = {
  id: number
  first_name: string
  last_name: string
  latest_end_date: string
}

export function getLapsedPeople(): LapsedPerson[] {
  return db
    .prepare(
      `SELECT p.id, p.first_name, p.last_name, m.end_date as latest_end_date
       FROM people p
       JOIN memberships m ON m.person_id = p.id
       WHERE m.end_date = (SELECT MAX(end_date) FROM memberships WHERE person_id = p.id)
         AND m.end_date < ?
       ORDER BY m.end_date DESC`
    )
    .all(todayISO()) as LapsedPerson[]
}
