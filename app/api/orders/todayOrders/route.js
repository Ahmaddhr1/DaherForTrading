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

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    const query = {
      status: { $ne: "draft" },
      createdAt: {
        $gte: startOfToday,
        $lt: startOfTomorrow,
      },
    };

    const total = await Order.countDocuments(query);
    const todayOrders = await Order.find(query)
      .populate({
        path: "customer",
        select: "fullName",
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return NextResponse.json(
      {
        todayOrders,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json({ error: error.message || "Something went wrong." }, { status: 500 });
  }
}
