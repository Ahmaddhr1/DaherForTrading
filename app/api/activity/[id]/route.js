import mongoose from "mongoose";
import { connectToDB } from "@/lib/connectDb";
import ActivityLog from "@/models/ActivityLog";
import { NextResponse } from "next/server";

// Owner-only (enforced in middleware.js under the /api/activity prefix).
// One audit entry with its full field-by-field changes, plus the other
// entries recorded against the same record so the detail page can show
// that record's whole history.
export async function GET(_, { params }) {
  await connectToDB();
  try {
    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ message: "Activity entry not found" }, { status: 404 });
    }

    const entry = await ActivityLog.findById(id).lean();
    if (!entry) {
      return NextResponse.json({ message: "Activity entry not found" }, { status: 404 });
    }

    const related = entry.entityId
      ? await ActivityLog.find({ entityId: entry.entityId, _id: { $ne: entry._id } })
          .sort({ createdAt: -1 })
          .limit(25)
          .select("action adminName summary createdAt changes.field")
          .lean()
      : [];

    return NextResponse.json({
      entry,
      related: related.map(({ changes, ...rest }) => ({ ...rest, changeCount: changes?.length || 0 })),
    });
  } catch (error) {
    return NextResponse.json(
      { message: "Error fetching activity entry", error: error.message },
      { status: 500 }
    );
  }
}
