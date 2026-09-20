import { connectToDB } from "@/lib/connectDb";
import AppSettings from "@/models/AppSettings";
import { NextResponse } from "next/server";
import { getUserFromCookie } from "@/lib/auth";
import { logActivity } from "@/lib/activityLog";

// Business-wide settings (dollar->LL rate, default tax rate). Open to any
// logged-in admin (owner or employee) - see middleware.js, which does not
// list this path as owner-only, since the exchange rate is day-to-day
// operational data rather than an admin/security setting.

async function getOrCreateSettings() {
  let settings = await AppSettings.findOne({ key: "app" });
  if (!settings) {
    settings = await AppSettings.create({ key: "app" });
  }
  return settings;
}

export async function GET() {
  await connectToDB();
  try {
    const settings = await getOrCreateSettings();
    return NextResponse.json(settings, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: "Error fetching settings", error: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(req) {
  await connectToDB();
  try {
    const { dollarRate, taxRate } = await req.json();

    if (dollarRate !== undefined && (typeof dollarRate !== "number" || isNaN(dollarRate) || dollarRate < 0)) {
      return NextResponse.json({ error: "Dollar rate must be a non-negative number" }, { status: 400 });
    }
    if (taxRate !== undefined && (typeof taxRate !== "number" || isNaN(taxRate) || taxRate < 0 || taxRate > 100)) {
      return NextResponse.json({ error: "Tax rate must be a number between 0 and 100" }, { status: 400 });
    }

    const settings = await getOrCreateSettings();
    const before = { dollarRate: settings.dollarRate, taxRate: settings.taxRate };
    if (dollarRate !== undefined) settings.dollarRate = dollarRate;
    if (taxRate !== undefined) settings.taxRate = taxRate;
    await settings.save();

    await logActivity({
      admin: await getUserFromCookie(),
      action: "settings.update",
      entityType: "Settings",
      entityId: settings._id,
      summary: `Updated business settings (dollar rate ${before.dollarRate} -> ${settings.dollarRate}, tax rate ${before.taxRate}% -> ${settings.taxRate}%)`,
      metadata: { before, after: { dollarRate: settings.dollarRate, taxRate: settings.taxRate } },
    });

    return NextResponse.json(settings, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: "Error updating settings", error: error.message },
      { status: 500 }
    );
  }
}
