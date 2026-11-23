import bcrypt from "bcryptjs";

export const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes
export const OTP_RESEND_COOLDOWN_MS = 30 * 1000; // 30 seconds

// 6-digit numeric code, e.g. "042817" - zero-padded so it always displays
// as 6 digits.
export function generateOtpCode() {
  return String(Math.floor(Math.random() * 1_000_000)).padStart(6, "0");
}

export async function hashOtpCode(code) {
  return bcrypt.hash(code, 10);
}

export async function verifyOtpCode(code, hash) {
  if (!code || !hash) return false;
  return bcrypt.compare(code, hash);
}
