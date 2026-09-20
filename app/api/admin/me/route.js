import { NextResponse } from "next/server";
import { getUserFromCookie } from "@/lib/auth";

// Returns the currently logged-in admin's identity and role. The session
// cookie is httpOnly, so client components can't decode the JWT themselves -
// this is how the sidebar/settings/admins pages know whether to show
// owner-only UI. Middleware.js is still the real enforcement layer; this
// only drives what gets shown.
export async function GET() {
  const user = await getUserFromCookie();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    id: user.id,
    adminname: user.adminname,
    role: user.role || "employee",
  });
}
