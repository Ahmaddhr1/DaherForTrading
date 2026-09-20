import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/connectDb";
import AppSettings from "@/models/AppSettings";
import { generateBackupPayload } from "@/lib/backup";
import { sendBackupEmail } from "@/lib/mailer";
import { getUserFromCookie } from "@/lib/auth";
import { logActivity } from "@/lib/activityLog";

// Lets an owner trigger the exact same backup+email pipeline as the
// scheduled job (see app/api/cron/backup/route.js), on demand, from the
// Settings page - mainly so email deliverability (SMTP config) can be
// verified without waiting for the next scheduled run. Owner-only via the
// normal session cookie, unlike the cron route.
export async function POST() {
  const to = process.env.BACKUP_EMAIL_TO || "ahmaddaher0981@gmail.com";

  try {
    const { generatedAt, filename, json } = await generateBackupPayload();
    await sendBackupEmail({ to, filename, jsonContent: json, generatedAt });

    await connectToDB();
    await AppSettings.findOneAndUpdate(
      { key: "app" },
      {
        lastScheduledBackupAt: new Date(generatedAt),
        lastScheduledBackupStatus: "success",
        lastScheduledBackupError: null,
      },
      { upsert: true }
    );

    await logActivity({
      admin: await getUserFromCookie(),
      action: "settings.update",
      entityType: "Settings",
      summary: `Sent a test backup email to ${to}`,
    });

    return NextResponse.json({ message: "Test backup emailed successfully", to, generatedAt });
  } catch (error) {
    console.error("Test backup email failed:", error);
    return NextResponse.json(
      { message: "Failed to send test backup email", error: error.message },
      { status: 500 }
    );
  }
}
