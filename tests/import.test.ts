import test from 'node:test'
import assert from 'node:assert/strict'
import { db } from '../lib/db'
import { parseCSV, importFreehubPeople, FREEHUB_PEOPLE_HEADER } from '../lib/import'
import { createPerson, searchPeople, type PersonInput } from '../lib/people'
import { getMembershipsForPerson, getMembershipStatus } from '../lib/memberships'

const HEADER = FREEHUB_PEOPLE_HEADER.join(',')

test('parseCSV handles quotes, embedded commas/newlines, CRLF, and blank lines', () => {
  assert.deepEqual(parseCSV('a,b,c\r\n1,2,3\n'), [
    ['a', 'b', 'c'],
    ['1', '2', '3'],
  ])
  assert.deepEqual(parseCSV('"Smith, Bob","says ""hi"""\n'), [['Smith, Bob', 'says "hi"']])
  assert.deepEqual(parseCSV('"multi\nline",x\n\n'), [['multi\nline', 'x']])
})

test('rejects a CSV that is not a Freehub People report', () => {
  assert.throws(() => importFreehubPeople('first,last\nJane,Doe\n'), /Freehub People report/)
  assert.throws(() => importFreehubPeople(''), /no data rows/)
})

test('imports people with fields, staff flag, and reconstructed membership', () => {
  const csv = [
    HEADER,
    '101,Import Jane,Doe,true,ijane@example.com,false,555-0101,33701,123 Main St,,St. Petersburg,FL,33701,US,1980,"mentor, wrench",2019-05-01 10:30,2026-12-31',
    '102,"Import Bob, Jr.",Jones,false,,true,,,,,,,,,,,2020-01-01 09:00,',
  ].join('\n')

  const result = importFreehubPeople(csv)
  assert.equal(result.peopleCreated, 2)
  assert.equal(result.peopleAlreadyPresent, 0)
  assert.equal(result.membershipsCreated, 1)
  assert.equal(result.skipped.length, 0)

  const jane = searchPeople('Import Jane Doe')[0]
  assert.ok(jane)
  assert.equal(jane.is_staff, 1)
  assert.equal(jane.is_site_lead, 0)
  assert.equal(jane.freehub_id, 101)
  assert.equal(jane.year_of_birth, 1980)
  assert.equal(jane.tags, 'mentor, wrench')
  assert.equal(jane.created_at, '2019-05-01 10:30:00')
  const memberships = getMembershipsForPerson(jane.id)
  assert.equal(memberships.length, 1)
  assert.equal(memberships[0].start_date, '2025-12-31')
  assert.equal(memberships[0].end_date, '2026-12-31')
  assert.equal(memberships[0].logged_by, 'Freehub import')
  assert.equal(getMembershipStatus(jane.id).status, 'active')

  const bob = searchPeople('Import Bob')[0]
  assert.ok(bob)
  assert.equal(bob.first_name, 'Import Bob, Jr.')
  assert.equal(bob.email_opt_out, 1)
  assert.equal(bob.email, null)
  assert.equal(getMembershipsForPerson(bob.id).length, 0)
})

test('re-running the same import changes nothing', () => {
  const csv = [
    HEADER,
    '201,Rerun,Tester,false,rerun@example.com,false,,,,,,,,,,,2018-03-03 12:00,2025-06-30',
  ].join('\n')

  const first = importFreehubPeople(csv)
  assert.equal(first.peopleCreated, 1)
  assert.equal(first.membershipsCreated, 1)

  const second = importFreehubPeople(csv)
  assert.equal(second.peopleCreated, 0)
  assert.equal(second.peopleAlreadyPresent, 1)
  assert.equal(second.membershipsCreated, 0)

  assert.equal(searchPeople('Rerun Tester').length, 1)
  const person = searchPeople('Rerun Tester')[0]
  assert.equal(getMembershipsForPerson(person.id).length, 1)
})

test('adopts a person hand-entered before the import instead of duplicating', () => {
  const input: PersonInput = {
    firstName: 'Adopted',
    lastName: 'Early',
    email: 'adopted@example.com',
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
  }
  const existingId = createPerson(input)

  const csv = [
    HEADER,
    '301,Adopted,Early,false,adopted@example.com,false,,,,,,,,,,,2017-01-01 08:00,',
  ].join('\n')
  const result = importFreehubPeople(csv)
  assert.equal(result.peopleCreated, 0)
  assert.equal(result.peopleAlreadyPresent, 1)

  const matches = searchPeople('Adopted Early')
  assert.equal(matches.length, 1)
  assert.equal(matches[0].id, existingId)
  assert.equal(matches[0].freehub_id, 301)
})

test('skips bad rows with reasons but imports the rest', () => {
  const csv = [
    HEADER,
    ',,,false,,false,,,,,,,,,,,,', // no name
    '401,Only,TwoCols', // wrong column count
    '402,Good,Person,false,,false,,,,,,,,,,,,not-a-date', // bad membership date
  ].join('\n')

  const result = importFreehubPeople(csv)
  assert.equal(result.peopleCreated, 1)
  assert.equal(result.membershipsCreated, 0)
  assert.equal(result.skipped.length, 3)
  assert.match(result.skipped[0].reason, /missing first or last name/)
  assert.match(result.skipped[1].reason, /columns/)
  assert.match(result.skipped[2].reason, /membership_expires_on/)

  // The bad-date person still exists, just without a membership.
  const person = searchPeople('Good Person')[0]
  assert.ok(person)
  assert.equal(db.prepare('SELECT COUNT(*) as c FROM memberships WHERE person_id = ?').get(person.id) && getMembershipsForPerson(person.id).length, 0)
})
