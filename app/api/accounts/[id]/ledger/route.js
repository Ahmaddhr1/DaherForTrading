import { NextResponse } from "next/server";

// See app/api/accounts/route.js - the accounts feature was removed.
export async function GET() {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}
