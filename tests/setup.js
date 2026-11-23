// Runs before every test file.
//  - points the app at a throwaway test database (TEST_MONGO_URL)
//  - replaces Next's request cookies with whichever user the test logged in as
//  - wipes the database before each file so tests never depend on each other
import { vi, beforeAll, afterAll } from "vitest";
import mongoose from "mongoose";

const url = process.env.TEST_MONGO_URL || "mongodb://127.0.0.1:27017/invento_test";
if (!/test/i.test(url)) {
  // Safety: never let the suite run against a real database.
  throw new Error(`TEST_MONGO_URL must point at a test database (got ${url})`);
}
process.env.DATABASE_CONNECTION = url;
process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret";

// The token of the user the current test acts as (see loginAs in helpers.js).
globalThis.__testSession = null;
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name) => (name === "session" && globalThis.__testSession ? { value: globalThis.__testSession } : undefined),
  }),
  headers: async () => new Headers(),
}));

beforeAll(async () => {
  const { connectToDB } = await import("@/lib/connectDb");
  await connectToDB();
  await mongoose.connection.db.dropDatabase();
});

afterAll(async () => {
  globalThis.__testSession = null;
});
