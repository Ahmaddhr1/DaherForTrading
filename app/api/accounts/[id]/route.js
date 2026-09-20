import { connectToDB } from "@/lib/connectDb";
import Account from "@/models/Account";
import { NextResponse } from "next/server";
import { getUserFromCookie } from "@/lib/auth";
import { logActivity } from "@/lib/activityLog";
import { computeAccountMovements, balanceFor } from "@/lib/accountBalances";

// GET one account with its live balance. Open to any logged-in admin.
export async function GET(_, { params }) {
  await connectToDB();
  try {
    const { id } = params;
    const account = await Account.findById(id);
    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    const movements = await computeAccountMovements();

    return NextResponse.json(
      { ...account.toObject(), balance: balanceFor(account, movements) },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: "Error fetching account", error: error.message },
      { status: 500 }
    );
  }
}

// Edit an account's name/type/opening balance, or activate/deactivate it.
// Owner-only (enforced in middleware.js).
export async function PATCH(req, { params }) {
  await connectToDB();
  try {
    const { id } = params;
    const body = await req.json();
    const update = {};

    if (body.name !== undefined) {
      if (!body.name.trim()) {
        return NextResponse.json({ error: "Account name cannot be empty" }, { status: 400 });
      }
      update.name = body.name.trim();
    }
    if (body.type !== undefined) {
      update.type = body.type === "bank" ? "bank" : "cash";
    }
    if (body.openingBalance !== undefined) {
      const parsed = parseFloat(body.openingBalance);
      if (isNaN(parsed)) {
        return NextResponse.json({ error: "Opening balance must be a number" }, { status: 400 });
      }
      update.openingBalance = parsed;
    }
    if (body.notes !== undefined) {
      update.notes = body.notes?.trim() || undefined;
    }
    if (body.active !== undefined) {
      update.active = !!body.active;
    }

    const account = await Account.findByIdAndUpdate(id, update, { new: true });
    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    await logActivity({
      admin: await getUserFromCookie(),
      action: "account.edit",
      entityType: "Account",
      entityId: account._id,
      summary: `Updated account "${account.name}"`,
      metadata: update,
    });

    return NextResponse.json({ message: "Account updated successfully", account }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: "Error updating account", error: error.message },
      { status: 500 }
    );
  }
}
