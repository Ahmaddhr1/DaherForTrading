import { NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { hasPermission } from '@/lib/permissions'

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

// Routes restricted to role "owner" - never delegable to an employee via a
// permission grant (managing other admins/permissions, the raw activity
// log, backups). Everything else that requires a session is open to any
// logged-in admin ("owner" or "employee"), subject to the permission-gated
// list below.
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
  '/api/activity', // the raw activity log (performance is carved out below - see PERMISSION_GATED_PATHS)
]
const MONGO_ID = /^[0-9a-fA-F]{24}$/

function isOwnerOnlyPath(pathname) {
  if (OWNER_ONLY_EXACT_PATHS.includes(pathname)) return true

  if (
    OWNER_ONLY_PATH_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(prefix + '/')
    )
  ) {
    // Carved out: the employee-performance report lives under /api/activity
    // but is gated by canViewStats instead (see PERMISSION_GATED_PATHS).
    if (pathname === '/api/activity/performance') return false
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

// Routes an employee can reach only with the matching permission granted
// (see lib/permissions.js) - an owner always passes these too. Checked
// after the strict owner-only list above, so e.g. '/api/activity/performance'
// being carved out there is what lets it reach this list at all.
const PERMISSION_GATED_PATHS = [
  { test: (p) => p === '/dashboard', permission: 'canViewStats' },
  { test: (p) => p === '/dashboard/admins/performance', permission: 'canViewStats' },
  { test: (p) => p === '/api/activity/performance', permission: 'canViewStats' },
  { test: (p) => p === '/api/dashboard' || p.startsWith('/api/dashboard/'), permission: 'canViewStats' },
  { test: (p) => p === '/api/reports' || p.startsWith('/api/reports/'), permission: 'canViewStats' },
  { test: (p) => p === '/dashboard/reports' || p.startsWith('/dashboard/reports/'), permission: 'canViewStats' },
  // Dedicated create/edit pages for the new per-page permissions below - the
  // record lists themselves stay open to every employee; only the pages
  // whose entire purpose is the gated action redirect away without it, so
  // an employee can't land on a form that would just 403 on submit.
  { test: (p) => p === '/dashboard/customers/create', permission: 'canManageCustomers' },
  { test: (p) => /^\/dashboard\/customers\/[^/]+\/addorder$/.test(p), permission: 'canCreateOrders' },
  { test: (p) => p === '/dashboard/companies/create', permission: 'canManageCompanies' },
  { test: (p) => /^\/dashboard\/companies\/[^/]+\/addpurchase$/.test(p), permission: 'canManageCompanies' },
  { test: (p) => p === '/dashboard/products/add', permission: 'canManageProducts' },
  { test: (p) => p === '/dashboard/categories/add', permission: 'canManageCategories' },
]

function permissionGateFor(pathname) {
  return PERMISSION_GATED_PATHS.find((entry) => entry.test(pathname))?.permission || null
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

// Where a logged-in admin lands when redirected away from a page they
// can't use - the root '/' redirect for any already-logged-in admin, and
// the fallback when an employee is bounced off an owner-only or
// permission-gated page. Must never itself be a page the admin can't
// reach, or the redirect would loop.
function landingPathFor(user) {
  return user.role === 'owner' || hasPermission(user, 'canViewStats')
    ? '/dashboard'
    : '/dashboard/orders'
}

export async function middleware(request) {
  const { pathname } = request.nextUrl
  const user = await verifySession(request)

  if (user && pathname === '/') {
    return NextResponse.redirect(new URL(landingPathFor(user), request.url))
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
    return NextResponse.redirect(new URL(landingPathFor(user), request.url))
  }

  const requiredPermission = permissionGateFor(pathname)
  if (user && requiredPermission && !hasPermission(user, requiredPermission)) {
    if (pathname.startsWith('/api')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    return NextResponse.redirect(new URL(landingPathFor(user), request.url))
  }

  return NextResponse.next()
}
