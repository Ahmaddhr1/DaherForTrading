import { connectToDB } from "@/lib/connectDb";
import Admin from "@/models/Admin";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { getUserFromCookie } from "@/lib/auth";

// Owner-only (enforced in middleware.js). Both handlers guard against an
// owner locking the business out of its own dashboard: you can never act
// on your own account here (use Settings > Change Password for that), and
// the last remaining "owner" can never be demoted, deactivated, or deleted.

async function countOtherOwners(excludingId) {
  return Admin.countDocuments({ role: "owner", _id: { $ne: excludingId } });
}

// Update role, active status, and/or reset another admin's password.
export async function PATCH(req, { params }) {
  await connectToDB();

  try {
    const { id } = await params;
    const actingUser = await getUserFromCookie();

    if (actingUser?.id === id) {
      return NextResponse.json(
        { message: "You can't change your own role, status, or password here" },
        { status: 400 }
      );
    }

    const target = await Admin.findById(id);
    if (!target) {
      return NextResponse.json({ message: "Admin not found" }, { status: 404 });
    }

    const { role, active, newPassword } = await req.json();
    const update = {};

    if (role !== undefined) {
      if (!["owner", "employee"].includes(role)) {
        return NextResponse.json({ message: "Invalid role" }, { status: 400 });
      }
      if (target.role === "owner" && role !== "owner") {
        const otherOwners = await countOtherOwners(id);
        if (otherOwners === 0) {
          return NextResponse.json(
            { message: "Can't remove the last owner - promote another admin first" },
            { status: 400 }
          );
        }
      }
      update.role = role;
    }

    if (active !== undefined) {
      const resolvedRole = update.role ?? target.role;
      if (!active && resolvedRole === "owner") {
        const otherOwners = await countOtherOwners(id);
        if (otherOwners === 0) {
          return NextResponse.json(
            { message: "Can't deactivate the last owner - promote another admin first" },
            { status: 400 }
          );
        }
      }
      update.active = !!active;
    }

    if (newPassword !== undefined) {
      if (typeof newPassword !== "string" || newPassword.length < 8) {
        return NextResponse.json(
          { message: "New password must be at least 8 characters" },
          { status: 400 }
        );
      }
      update.password = await bcrypt.hash(newPassword, 10);
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ message: "Nothing to update" }, { status: 400 });
    }

    const updated = await Admin.findByIdAndUpdate(id, update, { new: true }).select(
      "adminname role active createdAt"
    );

    return NextResponse.json({ message: "Admin updated successfully", admin: updated });
  } catch (error) {
    return NextResponse.json(
      { message: "Error updating admin", error: error.message },
      { status: 500 }
    );
  }
}

// Permanently remove an admin account.
export async function DELETE(_, { params }) {
  await connectToDB();

  try {
    const { id } = await params;
    const actingUser = await getUserFromCookie();

    if (actingUser?.id === id) {
      return NextResponse.json({ message: "You can't delete your own account" }, { status: 400 });
    }

    const target = await Admin.findById(id);
    if (!target) {
      return NextResponse.json({ message: "Admin not found" }, { status: 404 });
    }

    if (target.role === "owner") {
      const otherOwners = await countOtherOwners(id);
      if (otherOwners === 0) {
        return NextResponse.json(
          { message: "Can't delete the last owner - promote another admin first" },
          { status: 400 }
        );
      }
    }

    await Admin.findByIdAndDelete(id);

    return NextResponse.json({ message: "Admin deleted successfully" });
  } catch (error) {
    return NextResponse.json(
      { message: "Error deleting admin", error: error.message },
      { status: 500 }
    );
  }
}
