import { connectToDB } from "@/core/platform/connectDb";
import Customer from "@/core/customers/models/Customers";
import Product from "@/core/products/models/Products";
import Company from "@/core/suppliers/models/Company";
import Order from "@/core/orders/models/Orders";
import { NextResponse } from "next/server";

const RESULT_LIMIT = 5;

// Cross-entity search for the global search bar - a handful of top matches
// per entity type, not a full paginated listing (each entity's own page
// already has that). Orders have no name of their own, so they're matched
// by the customer's name (or a draft's hand-typed customerNameText).
export async function GET(req) {
  await connectToDB();

  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim() || "";

    if (q.length < 2) {
      return NextResponse.json({ customers: [], products: [], companies: [], orders: [] }, { status: 200 });
    }

    const regex = new RegExp(q, "i");

    const [customers, products, companies, matchingCustomers] = await Promise.all([
      Customer.find({ fullName: regex }).select("fullName phoneNumber debt").limit(RESULT_LIMIT).lean(),
      Product.find({ name: regex }).select("name price quantity").limit(RESULT_LIMIT).lean(),
      Company.find({ name: regex }).select("name debt").limit(RESULT_LIMIT).lean(),
      Customer.find({ fullName: regex }).select("_id").lean(),
    ]);
    const matchingCustomerIds = matchingCustomers.map((c) => c._id);

    const orders = await Order.find({
      status: { $ne: "draft" },
      $or: [{ customer: { $in: matchingCustomerIds } }, { customerNameText: regex }],
    })
      .select("total status customer customerNameText createdAt")
      .populate({ path: "customer", select: "fullName" })
      .sort({ createdAt: -1 })
      .limit(RESULT_LIMIT)
      .lean();

    return NextResponse.json({ customers, products, companies, orders }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: "Search failed", error: error.message },
      { status: 500 }
    );
  }
}
