import { connectToDB } from "@/lib/connectDb";
import ActivityLog from "@/models/ActivityLog";
import { NextResponse } from "next/server";

// Owner-only (enforced in middleware.js). Paginated/filterable activity
// log, following the same pagination shape as /api/orders.
export async function GET(req) {
  await connectToDB();
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 20;
    const admin = searchParams.get("admin") || "";
    const entityType = searchParams.get("entityType") || "";
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");
    const skip = (page - 1) * limit;

    const query = {};
    if (admin) query.adminName = admin;
    if (entityType) query.entityType = entityType;
    if (startDateParam || endDateParam) {
      query.createdAt = {};
      if (startDateParam) query.createdAt.$gte = new Date(startDateParam);
      if (endDateParam) query.createdAt.$lte = new Date(endDateParam);
    }

    const total = await ActivityLog.countDocuments(query);
    const entries = await ActivityLog.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const admins = await ActivityLog.distinct("adminName");

    return NextResponse.json({
      entries,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      admins,
    });
  } catch (error) {
    return NextResponse.json(
      { message: "Error fetching activity log", error: error.message },
      { status: 500 }
    );
  }
}
