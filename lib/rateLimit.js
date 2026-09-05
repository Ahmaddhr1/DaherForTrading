import LoginAttempt from "@/models/LoginAttempt";

// Database-backed rate limiter (rather than in-memory) so it actually works
// across serverless function invocations, not just within one warm process.
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 5;

// Call before attempting auth. Returns { blocked, retryAfterSeconds }.
export async function checkLoginRateLimit(key) {
  const windowStart = new Date(Date.now() - WINDOW_MS);
  const count = await LoginAttempt.countDocuments({
    key,
    createdAt: { $gte: windowStart },
  });

  if (count >= MAX_ATTEMPTS) {
    const oldest = await LoginAttempt.findOne({ key, createdAt: { $gte: windowStart } })
      .sort({ createdAt: 1 })
      .lean();
    const retryAfterSeconds = oldest
      ? Math.max(1, Math.ceil((oldest.createdAt.getTime() + WINDOW_MS - Date.now()) / 1000))
      : Math.ceil(WINDOW_MS / 1000);
    return { blocked: true, retryAfterSeconds };
  }

  return { blocked: false, retryAfterSeconds: 0 };
}

// Call after a failed login attempt.
export async function recordFailedLogin(key) {
  await LoginAttempt.create({ key });
}

// Call after a successful login to clear the counter for this key.
export async function clearLoginAttempts(key) {
  await LoginAttempt.deleteMany({ key });
}
