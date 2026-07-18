import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import Link from 'next/link'
import './globals.css'
import { isValidSessionCookieValue, SESSION_COOKIE_NAME } from '@/lib/auth'
import { getSiteLeads } from '@/lib/people'
import { getSiteLead } from '@/lib/site-lead'
import { SiteLeadPicker } from './site-lead-picker'
import { logout } from './login/actions'

export const metadata: Metadata = {
  title: 'St. Pete Bike Coop',
  description: 'Member management for the St. Pete Bike Coop',
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const cookieStore = await cookies()
  const isAuthenticated = isValidSessionCookieValue(cookieStore.get(SESSION_COOKIE_NAME)?.value)

  const siteLeads = isAuthenticated ? getSiteLeads() : []
  const siteLead = isAuthenticated ? await getSiteLead() : null

  return (
    <html lang="en">
      <body>
        {isAuthenticated && (
          <header className="top-bar">
            <nav>
              <Link href="/people">People</Link>
              <Link href="/reports">Reports</Link>
            </nav>
            <SiteLeadPicker siteLeads={siteLeads} currentId={siteLead?.id ?? null} />
            <form action={logout}>
              <button type="submit" className="btn-secondary">
                Sign Out
              </button>
            </form>
          </header>
        )}
        {children}
      </body>
    </html>
  )
}
