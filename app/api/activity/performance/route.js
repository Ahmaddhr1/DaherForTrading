import { connectToDB } from "@/lib/connectDb";
import { getEmployeePerformance } from "@/lib/employeePerformance";
import { NextResponse } from "next/server";

// Owner-only (enforced in middleware.js, under the /api/activity prefix).
export async function GET(req) {
  await connectToDB();

  try {
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;

    const performance = await getEmployeePerformance({ startDate, endDate });
    return NextResponse.json({ performance }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: "Error fetching employee performance", error: error.message },
      { status: 500 }
    );
  }
}
