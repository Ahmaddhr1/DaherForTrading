import mongoose from "mongoose";
import { connectToDB } from "@/lib/connectDb";
import Customer from "@/models/Customers";
import Payment from "@/models/Payment";
import { NextResponse } from "next/server";

// Create a payment against a customer's outstanding debt.
export async function POST(req) {
  await connectToDB();
  try {
    const { customerId, amount } = await req.json();

    if (!customerId) {
      return NextResponse.json({ error: "Customer is required" }, { status: 400 });
    }

    const paymentAmount = parseFloat(amount);
    if (!paymentAmount || paymentAmount <= 0) {
      return NextResponse.json(
        { error: "Payment amount must be greater than 0" },
        { status: 400 }
      );
    }

    const customer = await Customer.findById(customerId);
    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    const previousDebt = customer.debt || 0;

    if (paymentAmount > previousDebt) {
      return NextResponse.json(
        { error: `Payment cannot exceed the current debt of $${previousDebt}` },
        { status: 400 }
      );
    }

    const newDebt = previousDebt - paymentAmount;

    customer.debt = newDebt;
    await customer.save();

    const payment = await Payment.create({
      customer: customerId,
      amount: paymentAmount,
      previousDebt,
      newDebt,
    });

    return NextResponse.json(
      { message: "Payment recorded successfully", payment, newDebt, remaining: newDebt },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: "Error recording payment", error: error.message },
      { status: 500 }
    );
  }
}

// List payments across all customers (or one customer), paginated & filterable.
export async function GET(req) {
  await connectToDB();
  try {
    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get("customerId");
    const search = searchParams.get("search")?.trim() || "";
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");
    const sort = searchParams.get("sort") || "newest";
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 10;
    const skip = (page - 1) * limit;

    const SORT_MAP = {
      newest: { createdAt: -1 },
      oldest: { createdAt: 1 },
      amountDesc: { amount: -1 },
      amountAsc: { amount: 1 },
    };

    const query = {};

    if (customerId) {
      query.customer = new mongoose.Types.ObjectId(customerId);
    } else if (search) {
      const matchingCustomers = await Customer.find({
        fullName: { $regex: new RegExp(search, "i") },
      }).select("_id");
      query.customer = { $in: matchingCustomers.map((c) => c._id) };
    }

    if (startDateParam || endDateParam) {
      // The client resolves these to precise instants (see
      // lib/dateUtils.js localDayStartISO/localDayEndISO) before sending
      // them, so they're parsed directly here rather than re-derived
      // from a bare calendar date.
      query.createdAt = {};
      if (startDateParam) {
        query.createdAt.$gte = new Date(startDateParam);
      }
      if (endDateParam) {
        query.createdAt.$lte = new Date(endDateParam);
      }
    }

    const total = await Payment.countDocuments(query);
    const payments = await Payment.find(query)
      .populate({ path: "customer", select: "fullName phoneNumber" })
      .sort(SORT_MAP[sort] || SORT_MAP.newest)
      .skip(skip)
      .limit(limit);

    // Sum of all payments matching the filters (not just the current page)
    const totalsAgg = await Payment.aggregate([
      { $match: query },
      { $group: { _id: null, totalCollected: { $sum: "$amount" } } },
    ]);

    return NextResponse.json(
      {
        payments,
        total,
        page,
        totalPages: Math.ceil(total / limit),
        totalCollected: totalsAgg[0]?.totalCollected || 0,
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: "Error fetching payments", error: error.message },
      { status: 500 }
    );
  }
}
