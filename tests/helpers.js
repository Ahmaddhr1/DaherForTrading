// Small helpers so tests read like the app's real flows.
import jwt from "jsonwebtoken";
import { emptyPermissions } from "@/core/platform/permissions";

// Act as a user for the following API calls.
//   loginAs("owner")                          - full access
//   loginAs("employee", { canCreateOrders: true })
//   loginAs(null)                             - logged out
export function loginAs(role, permissions = {}) {
  if (!role) {
    globalThis.__testSession = null;
    return;
  }
  const payload = {
    id: role === "owner" ? "64b000000000000000000001" : "64b000000000000000000002",
    adminname: role === "owner" ? "owner" : "employee",
    role,
    permissions: { ...emptyPermissions(), ...permissions },
  };
  globalThis.__testSession = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1h" });
}

// Call a route handler the way Next does: call(POST, { body, params, query }).
export async function call(handler, { body, params = {}, query = {}, method } = {}) {
  const url = new URL("http://test.local/api");
  for (const [k, v] of Object.entries(query)) url.searchParams.set(k, String(v));
  const req = new Request(url, {
    method: method || (body !== undefined ? "POST" : "GET"),
    headers: { "content-type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  req.nextUrl = url; // some routes read req.nextUrl.searchParams
  const res = await handler(req, { params });
  let json = null;
  try {
    json = await res.json();
  } catch {
    /* empty body */
  }
  return { status: res.status, body: json };
}

export const money = (n) => Math.round(n * 100) / 100;
