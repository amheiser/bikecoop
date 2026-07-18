import crypto from 'node:crypto'
import { cookies } from 'next/headers'

const SESSION_COOKIE = 'session'
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000 // 30 days

function secret() {
  const value = process.env.SESSION_SECRET
  if (!value) throw new Error('SESSION_SECRET is not set')
  return value
}

function sign(expiresAt: number) {
  const hmac = crypto.createHmac('sha256', secret()).update(String(expiresAt)).digest('hex')
  return `${expiresAt}.${hmac}`
}

export function createSessionCookieValue() {
  return sign(Date.now() + SESSION_TTL_MS)
}

export function isValidSessionCookieValue(value: string | undefined): boolean {
  if (!value) return false
  const [expiresAtRaw, hmac] = value.split('.')
  const expiresAt = Number(expiresAtRaw)
  if (!expiresAt || !hmac) return false
  if (Date.now() > expiresAt) return false
  const expected = sign(expiresAt).split('.')[1]
  const a = Buffer.from(hmac)
  const b = Buffer.from(expected)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

export function checkCredentials(username: string, password: string): boolean {
  const validUsername = process.env.AUTH_USERNAME
  const validPassword = process.env.AUTH_PASSWORD
  if (!validUsername || !validPassword) return false
  return username === validUsername && password === validPassword
}

export const SESSION_COOKIE_NAME = SESSION_COOKIE
export const SESSION_MAX_AGE_SECONDS = SESSION_TTL_MS / 1000

export async function requireAuth(): Promise<void> {
  const cookieStore = await cookies()
  if (!isValidSessionCookieValue(cookieStore.get(SESSION_COOKIE_NAME)?.value)) {
    throw new Error('Unauthorized')
  }
}
