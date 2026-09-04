import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/connectDb";
import Customer from "@/models/Customers";

export async function GET(req) {
  try {
    await connectToDB();

    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get("limit")) || 10, 50);
    const minDebt = parseFloat(searchParams.get("minDebt")) || 0;

    const topCustomers = await Customer.find({ debt: { $gt: minDebt } })
      .sort({ debt: -1 })
      .limit(limit)
      .select("fullName phoneNumber debt");

    return NextResponse.json(
      {
        success: true,
        topCustomers,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching top customers:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch top customers" },
      { status: 500 }
    );
  }
}
