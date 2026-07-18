'use server'

import { cookies } from 'next/headers'
import { requireAuth } from '@/lib/auth'
import { SITE_LEAD_COOKIE_NAME } from '@/lib/site-lead'

export async function setSiteLead(formData: FormData) {
  await requireAuth()
  const personId = String(formData.get('personId') ?? '')
  const cookieStore = await cookies()
  if (!personId) {
    cookieStore.delete(SITE_LEAD_COOKIE_NAME)
    return
  }
  cookieStore.set(SITE_LEAD_COOKIE_NAME, personId, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  })
}
