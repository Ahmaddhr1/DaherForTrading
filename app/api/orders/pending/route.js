import { connectToDB } from "@/lib/connectDb";
import Order from "@/models/Orders";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    await connectToDB();

    const pendingOrders = await Order.find({ status: "pending" })
      .populate({
        path: "customer",
        select: "fullName",
      });

    return NextResponse.json({ pendingOrders }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch pending orders." },
      { status: 500 }
    );
  }
}
