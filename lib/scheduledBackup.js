import cron from "node-cron";
import { connectToDB } from "@/lib/connectDb";
import AppSettings from "@/models/AppSettings";
import { generateBackupPayload } from "@/lib/backup";
import { sendBackupEmail } from "@/lib/mailer";

let started = false;

// In-process fallback for a self-hosted, always-on `next start` process
// (a VPS, for example) where nothing like Vercel Cron exists to call
// /api/cron/backup on a schedule from outside. Skipped entirely on Vercel
// (see instrumentation.js) - a serverless function isn't a long-running
// process, so an interval registered inside it can't be relied on to keep
// ticking, and Vercel's own Cron Jobs feature (vercel.json) already
// handles that case properly.
export function startScheduledBackup() {
  if (started) return;
  started = true;

  const schedule = process.env.BACKUP_CRON_SCHEDULE || "0 3 * * *"; // daily at 3am server time
  const to = process.env.BACKUP_EMAIL_TO || "ahmaddaher0981@gmail.com";

  if (!cron.validate(schedule)) {
    console.error(`[scheduled-backup] invalid BACKUP_CRON_SCHEDULE "${schedule}" - not scheduling`);
    return;
  }

  cron.schedule(schedule, async () => {
    const generatedAtFallback = new Date();
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

      console.log(`[scheduled-backup] emailed to ${to} at ${generatedAt}`);
    } catch (error) {
      console.error("[scheduled-backup] failed:", error);
      try {
        await connectToDB();
        await AppSettings.findOneAndUpdate(
          { key: "app" },
          {
            lastScheduledBackupAt: generatedAtFallback,
            lastScheduledBackupStatus: "failed",
            lastScheduledBackupError: error.message,
          },
          { upsert: true }
        );
      } catch {
        // Best-effort status tracking only.
      }
    }
  });

  console.log(
    `[scheduled-backup] scheduled with cron expression "${schedule}" (server time), emailing ${to}`
  );
}
