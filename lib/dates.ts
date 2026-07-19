// All user-facing dates in this app are calendar dates in the shop's local
// timezone. The server (Render) runs in UTC and the shop is open evenings —
// UTC midnight lands at 7–8pm Eastern, mid-shift — so "today" must always be
// computed in SHOP_TIMEZONE, never taken from the server clock's UTC date
// (and never left to SQLite's date('now'), which is also UTC).
export const SHOP_TIMEZONE = 'America/New_York'

// en-CA formats dates as YYYY-MM-DD.
const isoDateFormat = new Intl.DateTimeFormat('en-CA', { timeZone: SHOP_TIMEZONE })

export function todayISO(): string {
  return isoDateFormat.format(new Date())
}

export function addDaysISO(dateISO: string, days: number): string {
  const date = new Date(`${dateISO}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

export function oneYearFrom(dateISO: string): string {
  const date = new Date(`${dateISO}T00:00:00Z`)
  date.setUTCFullYear(date.getUTCFullYear() + 1)
  return date.toISOString().slice(0, 10)
}
