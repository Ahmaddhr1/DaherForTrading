import { NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

// API paths that must remain reachable without a logged-in session.
// Keep this list short and explicit - everything else under /api is
// protected by default.
const PUBLIC_API_PREFIXES = [
  '/api/admin/login',
  '/api/public/', // read-only, token-scoped endpoints (e.g. shared invoice links)
]

function isPublicApiPath(pathname) {
  return PUBLIC_API_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix)
  )
}

// Middleware runs on the Edge runtime, where `next/headers`'s cookies() and
// the Node-only `jsonwebtoken` package do not behave the same as in a route
// handler - `next/headers` in particular does not resolve a usable cookie
// jar here, which previously made every session look invalid regardless of
// its actual validity. `jose` works on Edge and verifies the token directly
// against the raw cookie from the request, so this check is self-contained.
async function verifySession(request) {
  const token = request.cookies.get('session')?.value
  if (!token) return null

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET)
    const { payload } = await jwtVerify(token, secret)
    return payload
  } catch {
    return null
  }
}

export async function middleware(request) {
  const { pathname } = request.nextUrl
  const user = await verifySession(request)

  if (user && pathname === '/') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  if (!user && pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  if (!user && pathname.startsWith('/api') && !isPublicApiPath(pathname)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return NextResponse.next()
}
