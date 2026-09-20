// Kicks off the in-process scheduled-backup fallback (lib/scheduledBackup.js)
// on a self-hosted, always-on `next start` process (e.g. a VPS). Skipped on
// Vercel (VERCEL=1 is set automatically there) - a serverless function
// isn't a long-running process, so an interval registered here can't be
// relied on to keep ticking; Vercel Cron (vercel.json) handles that case
// instead. See app/api/cron/backup/route.js for the full picture.
if (!process.env.VERCEL) {
  // Dynamic import rather than require(): lib/scheduledBackup.js pulls in
  // node-cron, an ESM-only package that webpack can only load via an async
  // import() under the hood, which makes scheduledBackup.js itself an
  // async module. require()-ing an async module synchronously hands back
  // exports that haven't been populated yet (startScheduledBackup was
  // `undefined`, crashing every request at server startup) - import()
  // correctly waits for it to finish evaluating first.
  import("./lib/scheduledBackup.js").then(({ startScheduledBackup }) => {
    startScheduledBackup();
  });
}

module.exports = {};
