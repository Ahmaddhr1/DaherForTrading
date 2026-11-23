import { connectToDB } from "@/lib/connectDb";
import Product from "@/models/Products";
import Purchase from "@/models/Purchase";
import { NextResponse } from "next/server";
import { batchesInStock } from "@/lib/batches";

// Dated batches of one product that are still in stock (earliest expiry
// first) - shown on the product's page.
export async function GET(req, { params }) {
  await connectToDB();
  try {
    const { id } = await params;
    const product = await Product.findById(id).select("quantity").lean();
    if (!product) return NextResponse.json({ message: "Product not found" }, { status: 404 });
    const batches = await Purchase.find({ product: id, expiryDate: { $ne: null } })
      .select("quantity expiryDate createdAt company")
      .populate({ path: "company", select: "name" })
      .lean();
    const inStock = batchesInStock(product.quantity, batches).map((b) => ({
      _id: b._id,
      expiryDate: b.expiryDate,
      purchasedAt: b.createdAt,
      quantity: b.quantity,
      remaining: b.remaining,
      supplier: b.company?.name || "",
    }));
    return NextResponse.json({ batches: inStock }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ message: "Error fetching batches", error: error.message }, { status: 500 });
  }
}
