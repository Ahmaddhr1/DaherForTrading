import { NextResponse } from "next/server";

// This "pay down supplier debt from an account" route depended on the
// cash/bank accounts feature (models/Account.js, models/SupplierPayment.js),
// which was removed at Ahmad's request. It had no UI calling it any more
// (the company page's "Record Payment" flow was already taken out earlier),
// but the route itself was missed at the time and stayed live/functional -
// closed off here as part of fully removing the accounts feature. If a
// supplier-debt-payment feature is wanted again, it needs a fresh design
// that doesn't depend on the removed Account concept - see item 9 in
// daherfortrading-roadmap.md's "Remaining gap areas".
export async function GET() {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}

export async function POST() {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}
