import mongoose from "mongoose";

// Tracks failed login attempts for rate limiting. Backed by the database
// (rather than in-memory) because this app runs on serverless functions,
// where in-process state doesn't reliably persist between invocations.
const loginAttemptSchema = new mongoose.Schema({
  key: { type: String, required: true, index: true }, // `${ip}:${adminname}`
  createdAt: { type: Date, default: Date.now },
});

// Auto-delete documents 15 minutes after creation - keeps the collection
// small and makes the window a rolling one automatically.
loginAttemptSchema.index({ createdAt: 1 }, { expireAfterSeconds: 15 * 60 });

const LoginAttempt =
  mongoose.models.LoginAttempt || mongoose.model("LoginAttempt", loginAttemptSchema);
export default LoginAttempt;
