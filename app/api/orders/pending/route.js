import { connectToDB } from "@/lib/connectDb";
import Order from "@/models/Orders";
import { NextResponse } from "next/server";

export async function GET(req) {
  try {
    await connectToDB();

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 10;
    const skip = (page - 1) * limit;

    const query = { status: "pending" };

    const total = await Order.countDocuments(query);
    const pendingOrders = await Order.find(query)
      .populate({
        path: "customer",
        select: "fullName",
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return NextResponse.json(
      {
        pendingOrders,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch pending orders." },
      { status: 500 }
    );
  }
}
