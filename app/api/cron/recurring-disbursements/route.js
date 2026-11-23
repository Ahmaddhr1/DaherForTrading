import { NextResponse } from "next/server";
import { runDueRecurringDisbursements } from "@/core/expenses/recurringDisbursements";

// Same secret-header auth as /api/cron/backup - see that route for the
// full picture of what can call this (Vercel Cron via vercel.json, the
// in-process fallback in core/expenses/scheduledRecurringDisbursements.js, or any
// external cron service hitting this URL with the same Authorization
// header).
export async function GET(req) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured on the server." },
      { status: 500 }
    );
  }

  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runDueRecurringDisbursements();
    return NextResponse.json({ message: "Recurring disbursements checked", ...result });
  } catch (error) {
    console.error("Recurring disbursements cron failed:", error);
    return NextResponse.json(
      { message: "Recurring disbursements check failed", error: error.message },
      { status: 500 }
    );
  }
}
