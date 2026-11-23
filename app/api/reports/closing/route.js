import { connectToDB } from "@/lib/connectDb";
import Order from "@/models/Orders";
import Payment from "@/models/Payment";
import SupplierPayment from "@/models/SupplierPayment";
import Disbursement from "@/models/Disbursement";
import Company from "@/models/Company";
import Customer from "@/models/Customers";
import AppSettings from "@/models/AppSettings";
import { NextResponse } from "next/server";

// End-of-day closing for one day (start/end are the local day's bounds as
// ISO strings): sales made, money collected from customers, money paid out
// (supplier payments + expenses), and what's still owed both ways.
// Gated by canViewStats in middleware.js (/api/reports/*).
// GET /api/reports/closing?start=...&end=...
export async function GET(req) {
  await connectToDB();
  try {
    const { searchParams } = new URL(req.url);
    const start = new Date(searchParams.get("start"));
    const end = new Date(searchParams.get("end"));
    if (isNaN(start) || isNaN(end) || end < start) {
      return NextResponse.json({ message: "Invalid day" }, { status: 400 });
    }
    const inDay = { createdAt: { $gte: start, $lte: end } };

    const [orders, payments, supplierPayments, expenses, owedToSuppliers, owedByCustomers, settings] = await Promise.all([
      Order.find({ ...inDay, status: { $ne: "draft" } }).select("total amountpaid remainingBalance status").lean(),
      Payment.find(inDay).populate({ path: "customer", select: "fullName" }).select("amount source createdAt customer").sort({ createdAt: 1 }).lean(),
      SupplierPayment.find(inDay).populate({ path: "company", select: "name" }).select("amount createdAt company").sort({ createdAt: 1 }).lean(),
      Disbursement.find(inDay).select("description amount category createdAt").sort({ createdAt: 1 }).lean(),
      Company.aggregate([{ $group: { _id: null, total: { $sum: "$debt" } } }]),
      Customer.aggregate([{ $group: { _id: null, total: { $sum: "$debt" } } }]),
      AppSettings.findOne({ key: "app" }).select("dollarRate").lean(),
    ]);

    const sum = (list) => list.reduce((s, x) => s + (Number(x.amount) || 0), 0);
    const expensesByCategory = Object.entries(
      expenses.reduce((acc, e) => ({ ...acc, [e.category]: (acc[e.category] || 0) + e.amount }), {})
    ).map(([category, amount]) => ({ category, amount }));

    const collected = sum(payments);
    const paidToSuppliers = sum(supplierPayments);
    const expensesTotal = sum(expenses);

    return NextResponse.json({
      sales: {
        count: orders.length,
        total: orders.reduce((s, o) => s + (o.total || 0), 0),
        unpaid: orders.reduce((s, o) => s + (o.remainingBalance || 0), 0),
      },
      collected,
      paidToSuppliers,
      expensesTotal,
      expensesByCategory,
      netCash: collected - paidToSuppliers - expensesTotal,
      owedToSuppliers: owedToSuppliers[0]?.total || 0,
      owedByCustomers: owedByCustomers[0]?.total || 0,
      dollarRate: settings?.dollarRate || 0,
      payments: payments.map((p) => ({ _id: p._id, amount: p.amount, source: p.source, createdAt: p.createdAt, name: p.customer?.fullName || "" })),
      supplierPayments: supplierPayments.map((p) => ({ _id: p._id, amount: p.amount, createdAt: p.createdAt, name: p.company?.name || "" })),
      expenses: expenses.map((e) => ({ _id: e._id, amount: e.amount, createdAt: e.createdAt, name: e.description, category: e.category })),
    });
  } catch (error) {
    return NextResponse.json({ message: "Error building the daily closing", error: error.message }, { status: 500 });
  }
}
