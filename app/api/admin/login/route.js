import { connectToDB } from '@/lib/connectDb'
import Admin from '@/models/Admin'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { checkLoginRateLimit, recordFailedLogin, clearLoginAttempts } from '@/lib/rateLimit'

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

  await clearLoginAttempts(rateLimitKey);

  const token = jwt.sign(
    { id: admin._id, adminname: admin.adminname },
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

  return NextResponse.json({ message: "Logged in" });
}
