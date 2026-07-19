import type { Metadata } from 'next'
import Link from 'next/link'
import './globals.css'
import { isAuthenticated as checkAuthenticated } from '@/lib/auth'
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
  const isAuthenticated = await checkAuthenticated()

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
