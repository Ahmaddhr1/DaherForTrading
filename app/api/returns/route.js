import { connectToDB } from "@/core/platform/connectDb";
import Return from "@/core/orders/models/Return";
import { NextResponse } from "next/server";

export async function GET(req) {
  await connectToDB();
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 20;
    const skip = (page - 1) * limit;

    const total = await Return.countDocuments({});
    const returns = await Return.find({})
      .populate({ path: "customer", select: "fullName phoneNumber" })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return NextResponse.json(
      { returns, total, page, totalPages: Math.max(1, Math.ceil(total / limit)) },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: "Error fetching returns", error: error.message },
      { status: 500 }
    );
  }
}
