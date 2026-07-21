import test from 'node:test'
import assert from 'node:assert/strict'
import { todayISO, addDaysISO } from '../lib/dates'
import { createPerson, type PersonInput } from '../lib/people'
import { createMembership } from '../lib/memberships'
import { createFlag, resolveFlag, getActiveFlags } from '../lib/flags'
import {
  getLapseEmailQueue,
  recordLapseEmail,
  getRecentLapseEmails,
  renderLapseEmail,
  LAPSE_GRACE_DAYS,
} from '../lib/lapse-emails'
import { sendEmail } from '../lib/email'

function makePerson(firstName: string, overrides: Partial<PersonInput> = {}): number {
  const input: PersonInput = {
    firstName,
    lastName: 'LapseTest',
    email: `${firstName.toLowerCase()}@example.com`,
    phone: null,
    isStaff: false,
    isSiteLead: false,
    emailOptOut: false,
    street1: null,
    street2: null,
    city: null,
    state: null,
    postalCode: null,
    country: null,
    yearOfBirth: null,
    tags: null,
    ...overrides,
  }
  return createPerson(input)
}

function lapsedMembership(personId: number, daysAgo: number) {
  createMembership({
    personId,
    startDate: addDaysISO(todayISO(), -daysAgo - 365),
    endDate: addDaysISO(todayISO(), -daysAgo),
    loggedBy: null,
  })
}

const inQueue = (id: number) => getLapseEmailQueue().some((p) => p.id === id)

test('queues a person lapsed past the grace period, with the right details', () => {
  const id = makePerson('Due')
  lapsedMembership(id, LAPSE_GRACE_DAYS + 10)
  const entry = getLapseEmailQueue().find((p) => p.id === id)
  assert.ok(entry)
  assert.equal(entry.email, 'due@example.com')
  assert.equal(entry.latest_end_date, addDaysISO(todayISO(), -(LAPSE_GRACE_DAYS + 10)))
})

test('grace period: lapsed less than LAPSE_GRACE_DAYS ago is not queued yet', () => {
  const id = makePerson('TooSoon')
  lapsedMembership(id, LAPSE_GRACE_DAYS - 2)
  assert.ok(!inQueue(id))
})

test('lapsed exactly LAPSE_GRACE_DAYS ago is queued (boundary)', () => {
  const id = makePerson('Boundary')
  lapsedMembership(id, LAPSE_GRACE_DAYS)
  assert.ok(inQueue(id))
})

test('excludes: active members, no email, opted out', () => {
  const activeId = makePerson('Active')
  createMembership({ personId: activeId, startDate: addDaysISO(todayISO(), -30), endDate: addDaysISO(todayISO(), 335), loggedBy: null })
  assert.ok(!inQueue(activeId))

  const noEmailId = makePerson('NoEmail', { email: null })
  lapsedMembership(noEmailId, 60)
  assert.ok(!inQueue(noEmailId))

  const optedOutId = makePerson('OptedOut', { emailOptOut: true })
  lapsedMembership(optedOutId, 60)
  assert.ok(!inQueue(optedOutId))
})

test('active banned flag excludes; resolving it re-queues', () => {
  const id = makePerson('Banned')
  lapsedMembership(id, 60)
  createFlag({ personId: id, level: 'banned', note: 'test', loggedBy: null })
  assert.ok(!inQueue(id))

  const flag = getActiveFlags(id).find((f) => f.level === 'banned')!
  resolveFlag(flag.id)
  assert.ok(inQueue(id))
})

test('a watch flag does not block the email', () => {
  const id = makePerson('Watched')
  lapsedMembership(id, 60)
  createFlag({ personId: id, level: 'watch', note: 'test', loggedBy: null })
  assert.ok(inQueue(id))
})

test('recording removes from queue; renew-then-lapse-again re-queues; UNIQUE backstop', () => {
  const id = makePerson('Cycle')
  const firstEnd = addDaysISO(todayISO(), -400)
  createMembership({ personId: id, startDate: addDaysISO(todayISO(), -765), endDate: firstEnd, loggedBy: null })
  assert.ok(inQueue(id))

  recordLapseEmail({ personId: id, endDate: firstEnd, status: 'dry_run', loggedBy: 'Lead' })
  assert.ok(!inQueue(id))
  assert.throws(() => recordLapseEmail({ personId: id, endDate: firstEnd, status: 'sent', loggedBy: null }))

  // Renewed after that lapse, then lapsed again — a new notice is due.
  const secondEnd = addDaysISO(todayISO(), -30)
  createMembership({ personId: id, startDate: addDaysISO(todayISO(), -395), endDate: secondEnd, loggedBy: null })
  const entry = getLapseEmailQueue().find((p) => p.id === id)
  assert.ok(entry)
  assert.equal(entry.latest_end_date, secondEnd)

  const log = getRecentLapseEmails()
  const mine = log.find((e) => e.person_id === id)
  assert.ok(mine)
  assert.equal(mine.status, 'dry_run')
  assert.equal(mine.logged_by, 'Lead')
})

test('renderLapseEmail includes the name and expiry date', () => {
  const { subject, text } = renderLapseEmail('Jane', '2026-01-15')
  assert.match(subject, /membership has expired/)
  assert.match(text, /Hi Jane,/)
  assert.match(text, /2026-01-15/)
})

test('clearSampleData removes sample people even after a lapse email was recorded', async () => {
  const { seedSampleData, clearSampleData } = await import('../lib/seed')
  seedSampleData()
  const larry = getLapseEmailQueue().find((p) => p.first_name === 'Sample Larry')
  assert.ok(larry, 'sample Larry should be queued')
  recordLapseEmail({ personId: larry.id, endDate: larry.latest_end_date, status: 'dry_run', loggedBy: null })
  assert.doesNotThrow(() => clearSampleData())
  assert.ok(!getRecentLapseEmails().some((e) => e.person_id === larry.id))
})

test('sendEmail dry-runs when no RESEND_API_KEY is set', async () => {
  assert.equal(process.env.RESEND_API_KEY, undefined)
  const result = await sendEmail({ to: 'x@example.com', subject: 's', text: 't' })
  assert.deepEqual(result, { ok: true, dryRun: true })
})
