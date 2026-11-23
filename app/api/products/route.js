import { connectToDB } from "@/core/platform/connectDb";
import Product from "@/core/products/models/Products";
import { NextResponse } from "next/server";

export async function GET() {
  await connectToDB();
  try {
    const products = await Product.find({});
    return NextResponse.json(products, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: "Error fetching products", error: error.message },
      { status: 500 }
    );
  }
}
