import { connectToDB } from "@/lib/connectDb";
import Company from "@/models/Company";
import Purchase from "@/models/Purchase";
import { NextResponse } from "next/server";

// Full statement for one company: every purchase made from them with
// whether it's been paid, plus running totals. Used both by the
// authenticated dashboard statement page and as the source the public
// share link is built from.
export async function GET(_, { params }) {
  await connectToDB();
  try {
    const { id } = await params;

    const company = await Company.findById(id).select("name phoneNumber debt");
    if (!company) {
      return NextResponse.json({ message: "Company not found" }, { status: 404 });
    }

    const purchases = await Purchase.find({ company: company._id })
      .select("productName quantity unitPrice total paid createdAt")
      .sort({ createdAt: -1 });

    const totals = purchases.reduce(
      (acc, p) => ({
        totalPurchased: acc.totalPurchased + p.total,
        totalPaid: acc.totalPaid + (p.paid ? p.total : 0),
        totalOwed: acc.totalOwed + (p.paid ? 0 : p.total),
      }),
      { totalPurchased: 0, totalPaid: 0, totalOwed: 0 }
    );

    return NextResponse.json(
      {
        name: company.name,
        phoneNumber: company.phoneNumber,
        debt: company.debt,
        purchases: purchases.map((p) => ({
          _id: p._id,
          productName: p.productName,
          quantity: p.quantity,
          unitPrice: p.unitPrice,
          total: p.total,
          paid: p.paid,
          createdAt: p.createdAt,
        })),
        totals,
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: "Error fetching company statement", error: error.message },
      { status: 500 }
    );
  }
}
