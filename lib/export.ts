import { db } from '@/lib/db'
import type { Person } from '@/lib/people'
import { getMembershipStatus } from '@/lib/memberships'
import { todayISO } from '@/lib/dates'
import { getVolunteerHours, getCurrentMilestone } from '@/lib/hours'
import { getActiveFlags } from '@/lib/flags'

export type ExportRow = {
  id: number
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  membership_status: 'active' | 'lapsed' | 'none'
  days_until_or_since_expiry: number | null
  total_volunteer_hours: number
  current_milestone: number | null
  active_flags: string
  email_opt_out: boolean
}

const MS_PER_DAY = 24 * 60 * 60 * 1000

export function getExportRows(): ExportRow[] {
  const people = db.prepare('SELECT * FROM people ORDER BY last_name, first_name').all() as Person[]
  const todayMs = new Date(`${todayISO()}T00:00:00Z`).getTime()

  return people.map((person) => {
    const { status, latest } = getMembershipStatus(person.id)
    const daysUntilOrSinceExpiry = latest
      ? Math.round((new Date(latest.end_date).getTime() - todayMs) / MS_PER_DAY)
      : null
    const hours = getVolunteerHours(person.id)

    return {
      id: person.id,
      first_name: person.first_name,
      last_name: person.last_name,
      // Opted-out addresses never leave the app — the export's stated purpose
      // is drafting email in external tools.
      email: person.email_opt_out === 1 ? null : person.email,
      phone: person.phone,
      membership_status: status,
      days_until_or_since_expiry: daysUntilOrSinceExpiry,
      total_volunteer_hours: hours,
      current_milestone: getCurrentMilestone(hours),
      active_flags: getActiveFlags(person.id)
        .map((f) => f.level)
        .join(','),
      email_opt_out: person.email_opt_out === 1,
    }
  })
}

export function rowsToCSV(rows: ExportRow[]): string {
  if (rows.length === 0) return ''
  const headers = Object.keys(rows[0]) as (keyof ExportRow)[]

  const escape = (value: unknown) => {
    const str = value === null || value === undefined ? '' : String(value)
    return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str
  }

  const lines = [headers.join(',')]
  for (const row of rows) {
    lines.push(headers.map((h) => escape(row[h])).join(','))
  }
  return lines.join('\n')
}
