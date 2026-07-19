'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import {
  checkCredentials,
  createSessionCookieValue,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
} from '@/lib/auth'

export async function login(_prevState: string | undefined, formData: FormData) {
  const username = String(formData.get('username') ?? '')
  const password = String(formData.get('password') ?? '')

  if (!checkCredentials(username, password)) {
    // Flat delay on failure to blunt online brute-forcing of the shared password.
    await new Promise((resolve) => setTimeout(resolve, 1000))
    return 'Incorrect username or password.'
  }

  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE_NAME, createSessionCookieValue(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  })

  redirect('/')
}

export async function logout() {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE_NAME)
  redirect('/login')
}
