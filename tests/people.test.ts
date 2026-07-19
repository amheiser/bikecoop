import test from 'node:test'
import assert from 'node:assert/strict'
import { db } from '../lib/db'
import { createPerson, getPerson, searchPeople, checkIn, getVisitsForPerson, type PersonInput } from '../lib/people'

function personInput(overrides: Partial<PersonInput> = {}): PersonInput {
  return {
    firstName: 'Test',
    lastName: 'Person',
    email: null,
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
}

test('createPerson / getPerson round-trip', () => {
  const id = createPerson(personInput({ firstName: 'Ada', lastName: 'Lovelace', email: 'ada@example.com', isStaff: true }))
  const person = getPerson(id)
  assert.ok(person)
  assert.equal(person.first_name, 'Ada')
  assert.equal(person.last_name, 'Lovelace')
  assert.equal(person.email, 'ada@example.com')
  assert.equal(person.is_staff, 1)
  assert.equal(person.is_site_lead, 0)
})

test('searchPeople returns nothing for an empty query', () => {
  createPerson(personInput({ firstName: 'Should', lastName: 'NotAppear' }))
  assert.deepEqual(searchPeople(''), [])
  assert.deepEqual(searchPeople('   '), [])
})

test('searchPeople matches partial full name and email', () => {
  const id = createPerson(personInput({ firstName: 'Grace', lastName: 'Hopper', email: 'grace@navy.mil' }))
  assert.ok(searchPeople('Grace Hop').some((p) => p.id === id))
  assert.ok(searchPeople('navy.mil').some((p) => p.id === id))
  assert.ok(!searchPeople('zzz-no-match').some((p) => p.id === id))
})

test('checkIn is one visit per person per day', () => {
  const id = createPerson(personInput())
  checkIn({ personId: id, isVolunteer: false, loggedBy: null })
  checkIn({ personId: id, isVolunteer: false, loggedBy: 'Lead' })
  const visits = getVisitsForPerson(id)
  assert.equal(visits.length, 1)
  assert.equal(visits[0].logged_by, 'Lead')
})

test('a plain re-check-in never downgrades a volunteer session', () => {
  const id = createPerson(personInput())
  checkIn({ personId: id, isVolunteer: true, loggedBy: null })
  checkIn({ personId: id, isVolunteer: false, loggedBy: null })
  const visits = getVisitsForPerson(id)
  assert.equal(visits.length, 1)
  assert.equal(visits[0].is_volunteer, 1)
})

test('a volunteer re-check-in upgrades a plain visit', () => {
  const id = createPerson(personInput())
  checkIn({ personId: id, isVolunteer: false, loggedBy: null })
  checkIn({ personId: id, isVolunteer: true, loggedBy: null })
  const visits = getVisitsForPerson(id)
  assert.equal(visits.length, 1)
  assert.equal(visits[0].is_volunteer, 1)
})

test('visits are stamped with the shop-timezone date, not the SQLite UTC default', () => {
  const id = createPerson(personInput())
  checkIn({ personId: id, isVolunteer: false, loggedBy: null })
  const visit = getVisitsForPerson(id)[0]
  const easternToday = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date())
  assert.equal(visit.visit_date, easternToday)
  // Sanity: the row really is in the shared test DB, not a stale connection.
  const row = db.prepare('SELECT COUNT(*) as c FROM visits WHERE person_id = ?').get(id) as { c: number }
  assert.equal(row.c, 1)
})
