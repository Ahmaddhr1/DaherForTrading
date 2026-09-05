import { connectToDB } from "@/lib/connectDb";
import Company from "@/models/Company";
import Purchase from "@/models/Purchase";
import { NextResponse } from "next/server";

export async function POST(req) {
  await connectToDB();
  try {
    const { name, phoneNumber, address } = await req.json();

    if (!name) {
      return NextResponse.json({ error: "Company name is required" }, { status: 400 });
    }

    const existing = await Company.findOne({ name });
    if (existing) {
      return NextResponse.json({ error: "Company already exists" }, { status: 400 });
    }

    const company = await new Company({ name, phoneNumber, address });
    await company.save();

    return NextResponse.json(
      { message: "Company created successfully", company },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: "Error creating company", error: error.message },
      { status: 500 }
    );
  }
}

export async function GET(req) {
  await connectToDB();

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page")) || 1;
  const limit = parseInt(searchParams.get("limit")) || 20;
  const search = searchParams.get("search")?.toLowerCase() || "";
  const debtFilter = searchParams.get("debtFilter"); // "hasDebt" or "noDebt"
  const sort = searchParams.get("sort") || "newest";
  const startDateParam = searchParams.get("startDate");
  const endDateParam = searchParams.get("endDate");

  const skip = (page - 1) * limit;

  const SORT_MAP = {
    newest: { createdAt: -1 },
    oldest: { createdAt: 1 },
    debtDesc: { debt: -1 },
    debtAsc: { debt: 1 },
    nameAsc: { name: 1 },
    nameDesc: { name: -1 },
  };

  try {
    let query = {};

    if (search) {
      query.name = { $regex: new RegExp(search, "i") };
    }

    if (debtFilter === "hasDebt") {
      query.debt = { $gt: 0 };
    } else if (debtFilter === "noDebt") {
      query.debt = { $lte: 0 };
    }

    const total = await Company.countDocuments(query);
    const companies = await Company.find(query)
      .sort(SORT_MAP[sort] || SORT_MAP.newest)
      .skip(skip)
      .limit(limit);

    // Debt is a live running balance, so it's summed across every company
    // matching the current search/debt filter regardless of date. Spending
    // and expected profit are purchase-based, so they're scoped to the date
    // range instead (and to every company, independent of the search box).
    const dateMatch = {};
    if (startDateParam) dateMatch.$gte = new Date(startDateParam);
    if (endDateParam) dateMatch.$lte = new Date(endDateParam);
    const hasDateFilter = Object.keys(dateMatch).length > 0;

    const [debtAgg, purchaseAgg] = await Promise.all([
      Company.aggregate([
        { $match: query },
        { $group: { _id: null, totalDebt: { $sum: "$debt" } } },
      ]),
      Purchase.aggregate([
        ...(hasDateFilter ? [{ $match: { createdAt: dateMatch } }] : []),
        {
          $lookup: {
            from: "products",
            localField: "product",
            foreignField: "_id",
            as: "productInfo",
          },
        },
        { $unwind: { path: "$productInfo", preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: null,
            totalSpent: { $sum: "$total" },
            // Expected revenue if the purchased stock sells at each
            // product's CURRENT price - an approximation, since prices can
            // change between purchase and sale.
            expectedRevenue: {
              $sum: { $multiply: ["$quantity", { $ifNull: ["$productInfo.price", 0] }] },
            },
          },
        },
      ]),
    ]);

    const totalDebt = debtAgg[0]?.totalDebt || 0;
    const totalSpent = purchaseAgg[0]?.totalSpent || 0;
    const expectedRevenue = purchaseAgg[0]?.expectedRevenue || 0;

    return NextResponse.json(
      {
        companies,
        total,
        page,
        totalPages: Math.ceil(total / limit),
        summary: {
          totalDebt,
          totalSpent,
          expectedProfit: expectedRevenue - totalSpent,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: "Failed to fetch companies", error: error.message },
      { status: 500 }
    );
  }
}
