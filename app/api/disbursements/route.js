import { connectToDB } from "@/lib/connectDb";
import Disbursement from "@/models/Disbursement";
import { NextResponse } from "next/server";

export async function POST(req) {
  await connectToDB();
  try {
    const { description, amount, category } = await req.json();

    if (!description?.trim()) {
      return NextResponse.json({ error: "Description is required" }, { status: 400 });
    }

    const numericAmount = parseFloat(amount);
    if (!numericAmount || numericAmount <= 0) {
      return NextResponse.json(
        { error: "Amount must be greater than 0" },
        { status: 400 }
      );
    }

    const disbursement = await Disbursement.create({
      description: description.trim(),
      amount: numericAmount,
      category: category || "Other",
    });

    return NextResponse.json(
      { message: "Disbursement recorded successfully", disbursement },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: "Error recording disbursement", error: error.message },
      { status: 500 }
    );
  }
}

export async function GET(req) {
  await connectToDB();
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 10;
    const search = searchParams.get("search")?.trim() || "";
    const category = searchParams.get("category") || "";
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");
    const sort = searchParams.get("sort") || "newest";
    const skip = (page - 1) * limit;

    const SORT_MAP = {
      newest: { createdAt: -1 },
      oldest: { createdAt: 1 },
      amountDesc: { amount: -1 },
      amountAsc: { amount: 1 },
    };

    const query = {};
    if (search) {
      query.description = { $regex: new RegExp(search, "i") };
    }
    if (category) {
      query.category = category;
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

    const total = await Disbursement.countDocuments(query);
    const disbursements = await Disbursement.find(query)
      .sort(SORT_MAP[sort] || SORT_MAP.newest)
      .skip(skip)
      .limit(limit);

    const totalsAgg = await Disbursement.aggregate([
      { $match: query },
      { $group: { _id: null, totalAmount: { $sum: "$amount" } } },
    ]);

    return NextResponse.json(
      {
        disbursements,
        total,
        page,
        totalPages: Math.ceil(total / limit),
        totalAmount: totalsAgg[0]?.totalAmount || 0,
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: "Error fetching disbursements", error: error.message },
      { status: 500 }
    );
  }
}
