// Kicks off the in-process scheduled-backup fallback (lib/scheduledBackup.js)
// on a self-hosted, always-on `next start` process (e.g. a VPS). Skipped on
// Vercel (VERCEL=1 is set automatically there) - a serverless function
// isn't a long-running process, so an interval registered here can't be
// relied on to keep ticking; Vercel Cron (vercel.json) handles that case
// instead. See app/api/cron/backup/route.js for the full picture.
if (!process.env.VERCEL) {
  const { startScheduledBackup } = require("./lib/scheduledBackup.js");
  startScheduledBackup();
}

module.exports = {};
