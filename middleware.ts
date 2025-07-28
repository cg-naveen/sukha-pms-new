import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from './lib/auth'

export async function middleware(request: NextRequest) {
  // Skip middleware for API routes and static files
  if (
    request.nextUrl.pathname.startsWith('/api/') ||
    request.nextUrl.pathname.startsWith('/_next/') ||
    request.nextUrl.pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  const user = await getCurrentUser(request)

  // Redirect to auth if not authenticated and not already on auth page
  if (!user && request.nextUrl.pathname !== '/auth') {
    return NextResponse.redirect(new URL('/auth', request.url))
  }

  // Redirect to dashboard if authenticated and on auth page
  if (user && request.nextUrl.pathname === '/auth') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next|api|favicon.ico).*)']
}