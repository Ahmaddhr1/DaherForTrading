import mongoose from "mongoose";
import { connectToDB } from "@/core/platform/connectDb";
import ActivityLog from "@/core/audit/models/ActivityLog";
import { NextResponse } from "next/server";
import { getUserFromCookie } from "@/core/platform/auth";
import { logActivity } from "@/core/audit/activityLog";

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
    const entityId = searchParams.get("entityId") || "";
    const search = (searchParams.get("search") || "").trim();
    const skip = (page - 1) * limit;

    const query = {};
    if (admin) query.adminName = admin;
    if (entityType) query.entityType = entityType;
    if (entityId && mongoose.isValidObjectId(entityId)) {
      query.entityId = new mongoose.Types.ObjectId(entityId);
    }
    if (search) {
      const pattern = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      query.$or = [{ summary: pattern }, { entityLabel: pattern }, { "changes.label": pattern }];
    }
    if (startDateParam || endDateParam) {
      query.createdAt = {};
      if (startDateParam) query.createdAt.$gte = new Date(startDateParam);
      if (endDateParam) query.createdAt.$lte = new Date(endDateParam);
    }

    const total = await ActivityLog.countDocuments(query);
    // Rows only need a count and a short preview of the changes - the full
    // list (which can be long for bulk actions) loads on the detail page.
    const entries = await ActivityLog.aggregate([
      { $match: query },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $addFields: {
          changeCount: { $size: { $ifNull: ["$changes", []] } },
          changes: { $slice: [{ $ifNull: ["$changes", []] }, 3] },
        },
      },
    ]);

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

// Owner-only (enforced in middleware.js). Wipes the entire activity log -
// there's no filtered/partial clear, since the point is letting an owner
// reset a log that's grown too large to be useful, not curate it. A fresh
// entry is written immediately after, recording who cleared it and how
// many entries were removed, so the log isn't left with zero trace that a
// clear ever happened.
export async function DELETE() {
  await connectToDB();
  try {
    const admin = await getUserFromCookie();
    const { deletedCount } = await ActivityLog.deleteMany({});

    await logActivity({
      admin,
      action: "activityLog.clear",
      entityType: "Settings",
      summary: `Cleared the activity log (${deletedCount} ${
        deletedCount === 1 ? "entry" : "entries"
      } removed)`,
      metadata: { deletedCount },
    });

    return NextResponse.json({ message: "Activity log cleared", deletedCount });
  } catch (error) {
    return NextResponse.json(
      { message: "Error clearing activity log", error: error.message },
      { status: 500 }
    );
  }
}
