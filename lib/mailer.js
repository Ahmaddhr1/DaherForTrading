import nodemailer from "nodemailer";

let transporter = null;

// Lazily built so a missing SMTP config only breaks the backup email path
// (with a clear error) instead of crashing the whole app at import time.
function getTransporter() {
  if (transporter) return transporter;

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    throw new Error(
      "Email is not configured - set SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS in your environment."
    );
  }

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT ? parseInt(SMTP_PORT, 10) : 587,
    // true for port 465 (implicit TLS), false for 587/25 (STARTTLS) - most
    // providers (Gmail, SendGrid, Mailgun, etc.) use 587.
    secure: SMTP_SECURE === "true",
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  return transporter;
}

// Emails a backup JSON file as an attachment. `jsonContent` is the raw
// JSON string from lib/backup.js's generateBackupPayload() - kept as a
// plain string/attachment rather than re-parsed, so this stays a thin
// "send whatever backup was generated" function.
export async function sendBackupEmail({ to, filename, jsonContent, generatedAt }) {
  const transport = getTransporter();
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;

  await transport.sendMail({
    from,
    to,
    subject: `DaherForTrading backup - ${new Date(generatedAt).toLocaleDateString()}`,
    text: `Automated DaherForTrading backup generated at ${generatedAt}.\n\nThe full backup is attached as ${filename}. Keep it somewhere safe - it can be restored from the Settings page (Import Backup).`,
    attachments: [
      {
        filename,
        content: jsonContent,
        contentType: "application/json",
      },
    ],
  });
}
