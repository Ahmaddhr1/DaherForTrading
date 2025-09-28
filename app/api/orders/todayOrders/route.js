import { connectToDB } from "@/lib/connectDb";
import Order from "@/models/Orders";
import { NextResponse } from "next/server";

export async function GET(req, { params }) {
  try {
    await connectToDB();

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    const todayOrders = await Order.find({
      createdAt: {
        $gte: startOfToday,
        $lt: startOfTomorrow,
      },
    }).populate({
      path: "customer",
      select: "fullName",
    });

    return NextResponse.json({ todayOrders }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Something went wrong." }, { status: 500 });
  }
}
