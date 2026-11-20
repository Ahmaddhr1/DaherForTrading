import { connectToDB } from "@/lib/connectDb";
import Admin from "@/models/Admin";
import { NextResponse } from "next/server";
import { checkLoginRateLimit, recordFailedLogin, clearLoginAttempts } from "@/lib/rateLimit";
import { verifyOtpCode } from "@/lib/otp";
import { issueSession } from "@/lib/session";

// Second step of the email 2FA flow - called after /api/admin/login
// responds with { otpRequired: true }. Reuses the same DB-backed rate
// limiter as the password step, under its own key prefix, so guessing
// codes is throttled independently of password attempts.
export async function POST(req) {
  await connectToDB();

  const { adminname, code } = await req.json();

  if (!adminname || !code) {
    return NextResponse.json({ error: "Admin name and code are required" }, { status: 400 });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rateLimitKey = `otp:${ip}:${adminname}`;

  const { blocked, retryAfterSeconds } = await checkLoginRateLimit(rateLimitKey);
  if (blocked) {
    return NextResponse.json(
      { error: `Too many attempts. Try again in ${Math.ceil(retryAfterSeconds / 60)} minute(s).` },
      { status: 429 }
    );
  }

  const admin = await Admin.findOne({ adminname }).select("+otpHash +otpExpiresAt");

  if (!admin || !admin.otpHash || !admin.otpExpiresAt || admin.otpExpiresAt < new Date()) {
    await recordFailedLogin(rateLimitKey);
    return NextResponse.json({ error: "Code expired or invalid - request a new one" }, { status: 401 });
  }

  if (admin.active === false) {
    return NextResponse.json({ error: "This account has been deactivated" }, { status: 403 });
  }

  const isValid = await verifyOtpCode(code, admin.otpHash);
  if (!isValid) {
    await recordFailedLogin(rateLimitKey);
    return NextResponse.json({ error: "Invalid code" }, { status: 401 });
  }

  await clearLoginAttempts(rateLimitKey);

  admin.otpHash = null;
  admin.otpExpiresAt = null;
  admin.otpLastSentAt = null;
  await admin.save();

  await issueSession(admin);

  return NextResponse.json({ message: "Logged in" });
}
