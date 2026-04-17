import NextAuth from 'next-auth'
import { authConfig } from '@/auth.config'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const { auth } = NextAuth(authConfig)

const PROTECTED_PATHS = ['/setup', '/game', '/pods']
const AUTH_ONLY_PATHS = ['/login', '/register']

export default auth(function middleware(request: NextRequest & { auth: { user?: unknown } | null }) {
  const { pathname } = request.nextUrl
  const session = (request as NextRequest & { auth: { user?: unknown } | null }).auth

  // Legacy admin cookie check
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    if (pathname === '/admin/login') return NextResponse.next()
    const adminSession = request.cookies.get('admin_session')?.value
    const password = process.env.ADMIN_PASSWORD ?? 'admin'
    if (adminSession !== password) {
      if (pathname.startsWith('/api/admin')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
    return NextResponse.next()
  }

  // Redirect authenticated users away from login/register
  if (AUTH_ONLY_PATHS.includes(pathname) && session?.user) {
    return NextResponse.redirect(new URL('/pods', request.url))
  }

  // Protect game/setup/pod routes
  const isProtected = PROTECTED_PATHS.some((p) => pathname.startsWith(p))
  if (isProtected && !session?.user) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public).*)'],
}
