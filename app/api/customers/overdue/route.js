import { connectToDB } from "@/lib/connectDb";
import { getOverdueCustomers, DEFAULT_OVERDUE_DAYS } from "@/lib/overdueCustomers";
import { NextResponse } from "next/server";

export async function GET(req) {
  await connectToDB();

  try {
    const { searchParams } = new URL(req.url);
    const minDays = parseInt(searchParams.get("minDays")) || DEFAULT_OVERDUE_DAYS;
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 20;

    const result = await getOverdueCustomers({ minDays, page, limit });
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: "Failed to fetch overdue customers", error: error.message },
      { status: 500 }
    );
  }
}
