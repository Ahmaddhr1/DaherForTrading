import { connectToDB } from "@/core/platform/connectDb";
import Admin from "@/core/platform/models/Admin";
import { NextResponse } from "next/server";
import { generateOtpCode, hashOtpCode, OTP_TTL_MS, OTP_RESEND_COOLDOWN_MS } from "@/core/platform/otp";
import { sendOtpEmail } from "@/core/platform/mailer";

// Re-sends a fresh code for an in-progress login (password already
// verified by /api/admin/login). Gated by a short cooldown, tracked on the
// admin document itself, independent of the password-attempt rate limiter.
export async function POST(req) {
  await connectToDB();

  const { adminname } = await req.json();
  if (!adminname) {
    return NextResponse.json({ error: "Admin name is required" }, { status: 400 });
  }

  const admin = await Admin.findOne({ adminname }).select("+otpExpiresAt +otpLastSentAt");

  // Don't reveal whether this admin exists or has a pending OTP - same
  // generic response either way.
  if (!admin || !admin.email || !admin.otpExpiresAt || admin.otpExpiresAt < new Date()) {
    return NextResponse.json(
      { error: "No login in progress for this admin - start over" },
      { status: 400 }
    );
  }

  if (admin.otpLastSentAt && Date.now() - admin.otpLastSentAt.getTime() < OTP_RESEND_COOLDOWN_MS) {
    const waitSeconds = Math.ceil(
      (OTP_RESEND_COOLDOWN_MS - (Date.now() - admin.otpLastSentAt.getTime())) / 1000
    );
    return NextResponse.json({ error: `Wait ${waitSeconds}s before requesting another code` }, { status: 429 });
  }

  const code = generateOtpCode();
  admin.otpHash = await hashOtpCode(code);
  admin.otpExpiresAt = new Date(Date.now() + OTP_TTL_MS);
  admin.otpLastSentAt = new Date();
  await admin.save();

  try {
    await sendOtpEmail({ to: admin.email, adminname: admin.adminname, code });
  } catch (err) {
    return NextResponse.json({ error: "Couldn't send the login code email" }, { status: 500 });
  }

  return NextResponse.json({ message: "Code resent" });
}
