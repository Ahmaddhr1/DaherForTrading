import { NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

// API paths that must remain reachable without a logged-in session.
// Keep this list short and explicit - everything else under /api is
// protected by default.
const PUBLIC_API_PREFIXES = [
  '/api/admin/login',
  '/api/public/', // read-only, token-scoped endpoints (e.g. shared invoice links)
  '/api/cron/', // secret-header-authenticated (see CRON_SECRET), not session-authenticated
]

function isPublicApiPath(pathname) {
  return PUBLIC_API_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix)
  )
}

// Routes restricted to role "owner". Everything else that requires a
// session is open to any logged-in admin ("owner" or "employee").
//
// Exact paths: the path itself, not anything nested under it.
const OWNER_ONLY_EXACT_PATHS = [
  '/api/admin', // GET: list admins
  '/dashboard/admins',
  '/dashboard/activity',
]
// Prefixes: the path itself or anything nested under it.
const OWNER_ONLY_PATH_PREFIXES = [
  '/api/admin/create',
  '/api/settings/backup',
  '/api/settings/restore',
  '/api/activity',
]
const MONGO_ID = /^[0-9a-fA-F]{24}$/

function isOwnerOnlyPath(pathname) {
  if (OWNER_ONLY_EXACT_PATHS.includes(pathname)) return true

  if (
    OWNER_ONLY_PATH_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(prefix + '/')
    )
  ) {
    return true
  }

  // /api/admin/<id> - PATCH/DELETE on a specific admin (role/active/reset
  // password, or removal). Matched by shape rather than added to the
  // prefix list above so it doesn't also catch /api/admin/me,
  // /api/admin/login, /api/admin/logout, or /api/admin/change-password,
  // which every logged-in admin (not just owners) needs to reach.
  const adminIdMatch = pathname.match(/^\/api\/admin\/([^/]+)$/)
  if (adminIdMatch && MONGO_ID.test(adminIdMatch[1])) return true

  return false
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

  // At this point, any path that requires a session either has a verified
  // `user` or is a public API path (which is never owner-only), so it's
  // safe to check role without re-checking for a session.
  if (user && isOwnerOnlyPath(pathname) && user.role !== 'owner') {
    if (pathname.startsWith('/api')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}
