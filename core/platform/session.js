import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

// Issues the actual logged-in session cookie - shared by the plain login
// path (no email on file) and the OTP verification step (email on file),
// so both end up with an identical session once the admin is authenticated.
export async function issueSession(admin) {
  // role/permissions are embedded here (rather than looked up per-request)
  // so middleware.js can gate owner-only/permission-gated routes on the
  // Edge runtime without a DB round-trip. A role/permission change takes
  // effect on this admin's next login, not on their current session.
  const token = jwt.sign(
    {
      id: admin._id,
      adminname: admin.adminname,
      role: admin.role || "employee",
      permissions: admin.permissions || {},
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
  const cookieStore = await cookies();
  cookieStore.set("session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}
