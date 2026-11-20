import { connectToDB } from '@/lib/connectDb'
import Admin from '@/models/Admin'
import bcrypt from 'bcryptjs'
import { NextResponse } from 'next/server'
import { checkLoginRateLimit, recordFailedLogin, clearLoginAttempts } from '@/lib/rateLimit'
import { generateOtpCode, hashOtpCode, OTP_TTL_MS } from '@/lib/otp'
import { sendOtpEmail } from '@/lib/mailer'
import { issueSession } from '@/lib/session'

export async function POST(req) {
  await connectToDB();

  const { adminname, password } = await req.json();

  if (!adminname || !password) {
    return NextResponse.json({ error: "Admin name and password are required" }, { status: 400 });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rateLimitKey = `${ip}:${adminname}`;

  const { blocked, retryAfterSeconds } = await checkLoginRateLimit(rateLimitKey);
  if (blocked) {
    return NextResponse.json(
      { error: `Too many failed attempts. Try again in ${Math.ceil(retryAfterSeconds / 60)} minute(s).` },
      { status: 429 }
    );
  }

  const admin = await Admin.findOne({ adminname });
  const isValid = admin && (await bcrypt.compare(password, admin.password));

  if (!isValid) {
    await recordFailedLogin(rateLimitKey);
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  if (admin.active === false) {
    // Don't record this as a failed attempt for rate-limiting purposes -
    // the credentials were correct, the account is just deactivated.
    return NextResponse.json({ error: "This account has been deactivated" }, { status: 403 });
  }

  await clearLoginAttempts(rateLimitKey);

  // No email on file (an admin created before this feature existed, or an
  // owner hasn't set one yet) - log straight in, same as before.
  if (!admin.email) {
    await issueSession(admin);
    return NextResponse.json({ message: "Logged in" });
  }

  // Email on file - credentials alone aren't enough. Send a one-time code
  // and tell the client to show the OTP step instead of a session cookie.
  const code = generateOtpCode();
  admin.otpHash = await hashOtpCode(code);
  admin.otpExpiresAt = new Date(Date.now() + OTP_TTL_MS);
  admin.otpLastSentAt = new Date();
  await admin.save();

  try {
    await sendOtpEmail({ to: admin.email, adminname: admin.adminname, code });
  } catch (err) {
    return NextResponse.json(
      { error: "Couldn't send the login code email. Contact an owner to check the email settings." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    otpRequired: true,
    adminname: admin.adminname,
    // Masked so the UI can show "code sent to a***@gmail.com" without
    // exposing the full address to anyone intercepting this response.
    maskedEmail: maskEmail(admin.email),
  });
}

function maskEmail(email) {
  const [user, domain] = email.split("@");
  if (!domain) return email;
  const visible = user.slice(0, 1);
  return `${visible}${"*".repeat(Math.max(user.length - 1, 1))}@${domain}`;
}
