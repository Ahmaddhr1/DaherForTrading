import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/connectDb";
import Customer from "@/models/Customers";
import Order from "@/models/Orders";
import Product from "@/models/Products";
import Category from "@/models/Category";
import Company from "@/models/Company";
import Purchase from "@/models/Purchase";
import Payment from "@/models/Payment";
import Disbursement from "@/models/Disbursement";

// Protected by middleware (requires a logged-in session). Deliberately
// excludes the Admin collection - password hashes should never leave the
// server in a file a browser downloads to disk.
export async function GET() {
  try {
    await connectToDB();

    const [
      customers,
      orders,
      products,
      categories,
      companies,
      purchases,
      payments,
      disbursements,
    ] = await Promise.all([
      Customer.find({}).lean(),
      Order.find({}).lean(),
      Product.find({}).lean(),
      Category.find({}).lean(),
      Company.find({}).lean(),
      Purchase.find({}).lean(),
      Payment.find({}).lean(),
      Disbursement.find({}).lean(),
    ]);

    const backup = {
      generatedAt: new Date().toISOString(),
      collections: {
        customers,
        orders,
        products,
        categories,
        companies,
        purchases,
        payments,
        disbursements,
      },
    };

    const filename = `daherfortrading-backup-${new Date().toISOString().slice(0, 10)}.json`;

    return new NextResponse(JSON.stringify(backup, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Backup failed:", error);
    return NextResponse.json(
      { message: "Backup failed", error: error.message },
      { status: 500 }
    );
  }
}
