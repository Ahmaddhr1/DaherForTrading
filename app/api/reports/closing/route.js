import { connectToDB } from "@/core/platform/connectDb";
import { dailyClosing } from "@/core/reports/dailyClosing";
import { NextResponse } from "next/server";

// End-of-day closing for one day (start/end are the local day's bounds as
// ISO strings) - see core/reports/dailyClosing.js.
// Gated by canViewStats in middleware.js (/api/reports/*).
// GET /api/reports/closing?start=...&end=...
export async function GET(req) {
  await connectToDB();
  try {
    const { searchParams } = new URL(req.url);
    const start = new Date(searchParams.get("start"));
    const end = new Date(searchParams.get("end"));
    if (isNaN(start) || isNaN(end) || end < start) {
      return NextResponse.json({ message: "Invalid day" }, { status: 400 });
    }
    return NextResponse.json(await dailyClosing(start, end));
  } catch (error) {
    return NextResponse.json({ message: "Error building the daily closing", error: error.message }, { status: 500 });
  }
}
