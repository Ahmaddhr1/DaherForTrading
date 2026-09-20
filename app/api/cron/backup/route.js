import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/connectDb";
import AppSettings from "@/models/AppSettings";
import { generateBackupPayload } from "@/lib/backup";
import { sendBackupEmail } from "@/lib/mailer";

// Automated backup: generates the same backup file as the manual "Download
// Backup" button and emails it as an attachment. Nothing human logs in to
// trigger this, so it's authenticated by a shared secret instead of a
// session cookie (see middleware.js's PUBLIC_API_PREFIXES, which exempts
// /api/cron/ from the cookie check so this route can do its own).
//
// Three things can call this URL on a schedule, and only one needs to
// actually work for backups to arrive:
//   1. Vercel Cron (see vercel.json) - if deployed on Vercel, it calls this
//      automatically and sends CRON_SECRET as `Authorization: Bearer ...`.
//   2. lib/scheduledBackup.js - an in-process fallback for a self-hosted,
//      always-on `next start` process (skipped entirely on Vercel).
//   3. Any external cron service (e.g. cron-job.org) configured to GET
//      this URL with the same Authorization header - a fallback that
//      works regardless of hosting, if 1 and 2 don't apply.
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

    return NextResponse.json({ message: "Backup emailed successfully", to, generatedAt });
  } catch (error) {
    console.error("Scheduled backup failed:", error);

    try {
      await connectToDB();
      await AppSettings.findOneAndUpdate(
        { key: "app" },
        {
          lastScheduledBackupAt: new Date(),
          lastScheduledBackupStatus: "failed",
          lastScheduledBackupError: error.message,
        },
        { upsert: true }
      );
    } catch {
      // Best-effort status tracking - the backup failure itself is the
      // thing that matters and is already logged above.
    }

    return NextResponse.json(
      { message: "Scheduled backup failed", error: error.message },
      { status: 500 }
    );
  }
}
