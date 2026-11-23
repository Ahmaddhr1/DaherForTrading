// Named imports - see core/platform/scheduledBackup.js for why (node-cron's default
// export doesn't survive webpack's CJS/ESM interop here).
import { schedule as scheduleCron, validate as validateCron } from "node-cron";
import { runDueRecurringDisbursements } from "@/core/expenses/recurringDisbursements";

let started = false;

// In-process fallback for a self-hosted, always-on `next start` process -
// skipped entirely on Vercel, same as core/platform/scheduledBackup.js (Vercel Cron,
// configured in vercel.json, handles that case there instead).
export function startScheduledRecurringDisbursements() {
  if (started) return;
  started = true;

  // Daily is enough - runDueRecurringDisbursements() only actually creates
  // something once a given template's day-of-month has arrived, and is a
  // no-op otherwise.
  const schedule = process.env.RECURRING_DISBURSEMENTS_CRON_SCHEDULE || "0 5 * * *";

  if (!validateCron(schedule)) {
    console.error(
      `[recurring-disbursements] invalid RECURRING_DISBURSEMENTS_CRON_SCHEDULE "${schedule}" - not scheduling`
    );
    return;
  }

  scheduleCron(schedule, async () => {
    try {
      const result = await runDueRecurringDisbursements();
      if (result.created > 0) {
        console.log(`[recurring-disbursements] created ${result.created} disbursement(s)`);
      }
    } catch (error) {
      console.error("[recurring-disbursements] failed:", error);
    }
  });

  console.log(`[recurring-disbursements] scheduled with cron expression "${schedule}" (server time)`);
}
