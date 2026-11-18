import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/connectDb";
import Product from "@/models/Products";
import Category from "@/models/Category";

// Every product with its category name, no pagination - used by the
// Products page's "Generate PDF" catalog export, which needs the whole
// inventory grouped by category in one request rather than paginated.
export async function GET() {
  await connectToDB();
  try {
    const products = await Product.find({})
      .populate({ path: "category", select: "name" })
      .sort({ name: 1 });

    return NextResponse.json({ products }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: "Error fetching products", error: error.message },
      { status: 500 }
    );
  }
}
