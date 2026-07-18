import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { isValidSessionCookieValue, SESSION_COOKIE_NAME } from '@/lib/auth'

const PUBLIC_PATHS = ['/login']

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isPublic = PUBLIC_PATHS.includes(pathname)
  const isAuthenticated = isValidSessionCookieValue(
    request.cookies.get(SESSION_COOKIE_NAME)?.value
  )

  if (!isAuthenticated && !isPublic) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (isAuthenticated && isPublic) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
