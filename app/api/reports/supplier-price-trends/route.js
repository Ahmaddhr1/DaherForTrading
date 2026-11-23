import { connectToDB } from "@/core/platform/connectDb";
import { getSupplierPriceTrend } from "@/core/reports/supplierPriceTrends";
import { NextResponse } from "next/server";

export async function GET(req) {
  await connectToDB();

  try {
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get("productId");

    if (!productId) {
      return NextResponse.json({ companies: [] }, { status: 200 });
    }

    const report = await getSupplierPriceTrend(productId);
    return NextResponse.json(report, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: "Failed to build supplier price trend report", error: error.message },
      { status: 500 }
    );
  }
}
