import { connectToDB } from "@/lib/connectDb";
import Payment from "@/models/Payment";
import Disbursement from "@/models/Disbursement";
import Purchase from "@/models/Purchase";
import SupplierPayment from "@/models/SupplierPayment";
import { NextResponse } from "next/server";

// A merged, chronological statement of every transaction that touched
// this account - customer payments in, disbursements/purchases/supplier
// payments out. Each source collection is queried and sorted
// independently (they're small per-account slices for a business this
// size), then merged and paginated in memory.
const RECENT_CAP = 500;

export async function GET(req, { params }) {
  await connectToDB();
  try {
    const { id } = params;
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 20;

    const [payments, disbursements, purchases, supplierPayments] = await Promise.all([
      Payment.find({ account: id })
        .populate({ path: "customer", select: "fullName" })
        .sort({ createdAt: -1 })
        .limit(RECENT_CAP)
        .lean(),
      Disbursement.find({ account: id }).sort({ createdAt: -1 }).limit(RECENT_CAP).lean(),
      Purchase.find({ account: id, paid: true }).sort({ createdAt: -1 }).limit(RECENT_CAP).lean(),
      SupplierPayment.find({ account: id })
        .populate({ path: "company", select: "name" })
        .sort({ createdAt: -1 })
        .limit(RECENT_CAP)
        .lean(),
    ]);

    const entries = [
      ...payments.map((p) => ({
        _id: p._id,
        type: "customerPayment",
        label: `Payment from ${p.customer?.fullName || "a deleted customer"}`,
        amount: p.amount,
        createdAt: p.createdAt,
      })),
      ...disbursements.map((d) => ({
        _id: d._id,
        type: "disbursement",
        label: `${d.category}: ${d.description}`,
        amount: -d.amount,
        createdAt: d.createdAt,
      })),
      ...purchases.map((p) => ({
        _id: p._id,
        type: "purchase",
        label: `Purchase: ${p.quantity} x ${p.productName}`,
        amount: -p.total,
        createdAt: p.createdAt,
      })),
      ...supplierPayments.map((sp) => ({
        _id: sp._id,
        type: "supplierPayment",
        label: `Paid ${sp.company?.name || "a deleted supplier"}`,
        amount: -sp.amount,
        createdAt: sp.createdAt,
      })),
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const total = entries.length;
    const start = (page - 1) * limit;
    const pageEntries = entries.slice(start, start + limit);

    return NextResponse.json(
      { entries: pageEntries, total, page, totalPages: Math.max(1, Math.ceil(total / limit)) },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: "Error fetching account ledger", error: error.message },
      { status: 500 }
    );
  }
}
