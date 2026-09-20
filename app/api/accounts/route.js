import { connectToDB } from "@/lib/connectDb";
import Account from "@/models/Account";
import { NextResponse } from "next/server";
import { getUserFromCookie } from "@/lib/auth";
import { logActivity } from "@/lib/activityLog";
import { computeAccountMovements, balanceFor } from "@/lib/accountBalances";

// List every account with its live computed balance. Open to any logged-in
// admin - both roles need this to pick an account when recording a
// payment/disbursement/purchase.
export async function GET() {
  await connectToDB();
  try {
    const accounts = await Account.find({}).sort({ createdAt: 1 });
    const movements = await computeAccountMovements();

    const withBalances = accounts.map((account) => ({
      ...account.toObject(),
      balance: balanceFor(account, movements),
    }));

    const totalBalance = withBalances.reduce((sum, a) => sum + a.balance, 0);

    return NextResponse.json({ accounts: withBalances, totalBalance }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: "Error fetching accounts", error: error.message },
      { status: 500 }
    );
  }
}

// Create a new cash/bank account. Owner-only (enforced in middleware.js).
export async function POST(req) {
  await connectToDB();
  try {
    const { name, type, openingBalance, notes } = await req.json();

    if (!name?.trim()) {
      return NextResponse.json({ error: "Account name is required" }, { status: 400 });
    }

    const existing = await Account.findOne({ name: name.trim() });
    if (existing) {
      return NextResponse.json({ error: "An account with this name already exists" }, { status: 400 });
    }

    const parsedOpeningBalance = openingBalance == null || openingBalance === "" ? 0 : parseFloat(openingBalance);
    if (isNaN(parsedOpeningBalance)) {
      return NextResponse.json({ error: "Opening balance must be a number" }, { status: 400 });
    }

    const account = await Account.create({
      name: name.trim(),
      type: type === "bank" ? "bank" : "cash",
      openingBalance: parsedOpeningBalance,
      notes: notes?.trim() || undefined,
    });

    await logActivity({
      admin: await getUserFromCookie(),
      action: "account.create",
      entityType: "Account",
      entityId: account._id,
      summary: `Created ${account.type} account "${account.name}" with an opening balance of $${parsedOpeningBalance}`,
    });

    return NextResponse.json({ message: "Account created successfully", account }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { message: "Error creating account", error: error.message },
      { status: 500 }
    );
  }
}
