import test from 'node:test'
import assert from 'node:assert/strict'
import { todayISO, addDaysISO, oneYearFrom, SHOP_TIMEZONE } from '../lib/dates'

test('todayISO returns the current date in the shop timezone, not UTC', () => {
  const expected = new Intl.DateTimeFormat('en-CA', { timeZone: SHOP_TIMEZONE }).format(new Date())
  assert.equal(todayISO(), expected)
  assert.match(todayISO(), /^\d{4}-\d{2}-\d{2}$/)
})

test('addDaysISO crosses month boundaries', () => {
  assert.equal(addDaysISO('2026-01-31', 1), '2026-02-01')
  assert.equal(addDaysISO('2026-03-01', -1), '2026-02-28')
  assert.equal(addDaysISO('2026-07-18', 0), '2026-07-18')
})

test('oneYearFrom handles ordinary and leap dates', () => {
  assert.equal(oneYearFrom('2025-07-18'), '2026-07-18')
  assert.equal(oneYearFrom('2024-02-29'), '2025-03-01')
})
