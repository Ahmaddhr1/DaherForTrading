import { NextResponse } from "next/server";

// The cash/bank accounts feature was removed at Ahmad's request. This route
// is kept only so it 404s instead of exposing removed functionality - the
// underlying files (models/Account.js, lib/accountBalances.js, etc.) are
// safe to delete from disk whenever convenient; nothing references them.
export async function GET() {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}

export async function POST() {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}
