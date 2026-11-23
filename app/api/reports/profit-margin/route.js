import { connectToDB } from "@/core/platform/connectDb";
import { getProfitMarginReport } from "@/core/reports/profitMargin";
import { NextResponse } from "next/server";

export async function GET(req) {
  await connectToDB();

  try {
    const { searchParams } = new URL(req.url);
    const months = parseInt(searchParams.get("months")) || 6;

    const report = await getProfitMarginReport({ months });
    return NextResponse.json(report, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: "Failed to build profit margin report", error: error.message },
      { status: 500 }
    );
  }
}
