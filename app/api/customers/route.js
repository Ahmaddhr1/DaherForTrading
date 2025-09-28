import { connectToDB } from "@/lib/connectDb";
import Customer from "@/models/Customers";
import { NextResponse } from "next/server";

export async function GET(req) {
  await connectToDB();

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page")) || 1;
  const limit = parseInt(searchParams.get("limit")) || 20;
  const search = searchParams.get("search")?.toLowerCase() || "";
  const debtFilter = searchParams.get("debtFilter"); // "hasDebt" or "noDebt"

  const skip = (page - 1) * limit;

  try {
    // Build query object
    let query = {};

    // Add search filter
    if (search) {
      query.fullName = { $regex: new RegExp(search, "i") };
    }

    // Add debt filter
    if (debtFilter === "hasDebt") {
      query.$or = [
        { debt: { $gt: 0 } },
        { smallBottlesDebt: { $gt: 0 } },
        { bigBottlesDebt: { $gt: 0 } }
      ];
    } else if (debtFilter === "noDebt") {
      query.$and = [
        { debt: { $lte: 0 } },
        { smallBottlesDebt: { $lte: 0 } },
        { bigBottlesDebt: { $lte: 0 } }
      ];
    }

    const total = await Customer.countDocuments(query);
    const customers = await Customer.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return NextResponse.json(
      {
        customers,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      },
      { status: 200 }
    );
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      { message: "Failed to fetch customers", error: error.message },
      { status: 500 }
    );
  }
}