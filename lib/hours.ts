import { db } from '@/lib/db'

export const MILESTONES = [5, 10, 20, 50, 100, 200, 300, 400, 500]
export const HOURS_PER_VOLUNTEER_VISIT = 2.5

export function getVolunteerHours(personId: number): number {
  const row = db
    .prepare('SELECT COUNT(*) as count FROM visits WHERE person_id = ? AND is_volunteer = 1')
    .get(personId) as { count: number }
  return row.count * HOURS_PER_VOLUNTEER_VISIT
}

export function getFootTraffic(personId: number): number {
  const row = db
    .prepare('SELECT COUNT(*) as count FROM visits WHERE person_id = ?')
    .get(personId) as { count: number }
  return row.count
}

export function getCurrentMilestone(hours: number): number | null {
  let current: number | null = null
  for (const threshold of MILESTONES) {
    if (hours >= threshold) current = threshold
  }
  return current
}

export function getAchievedMilestones(hours: number): number[] {
  return MILESTONES.filter((threshold) => hours >= threshold)
}

export function getCrossedMilestone(hoursBefore: number, hoursAfter: number): number | null {
  let crossed: number | null = null
  for (const threshold of MILESTONES) {
    if (hoursBefore < threshold && hoursAfter >= threshold) crossed = threshold
  }
  return crossed
}
