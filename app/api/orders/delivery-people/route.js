import { connectToDB } from "@/lib/connectDb";
import Order from "@/models/Orders";
import { NextResponse } from "next/server";

// Names already used as delivery person (most used first) - suggestions for
// the delivery box on an order.
export async function GET() {
  await connectToDB();
  try {
    const rows = await Order.aggregate([
      { $match: { deliveryPerson: { $nin: [null, ""] } } },
      { $group: { _id: "$deliveryPerson", n: { $sum: 1 } } },
      { $sort: { n: -1 } },
      { $limit: 30 },
    ]);
    return NextResponse.json({ people: rows.map((r) => r._id) }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ people: [] }, { status: 200 });
  }
}
