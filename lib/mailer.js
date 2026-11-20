import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";

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
    subject: `Invento backup - ${new Date(generatedAt).toLocaleDateString()}`,
    text: `Automated Invento backup generated at ${generatedAt}.\n\nThe full backup is attached as ${filename}. Keep it somewhere safe - it can be restored from the Settings page (Import Backup).`,
    attachments: [
      {
        filename,
        content: jsonContent,
        contentType: "application/json",
      },
    ],
  });
}

// Sends the one-time login code used by the email-based 2FA step (see
// app/api/admin/login/route.js). Branded with the app's own icon, inlined
// via a cid attachment so it renders in the email body without depending
// on any external image host.
export async function sendOtpEmail({ to, adminname, code }) {
  const transport = getTransporter();
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  const logoPath = path.join(process.cwd(), "public", "icons", "icon-512.png");
  const logoBuffer = fs.existsSync(logoPath) ? fs.readFileSync(logoPath) : null;

  await transport.sendMail({
    from,
    to,
    subject: `Your Invento login code: ${code}`,
    text: `Hi ${adminname},\n\nYour Invento login code is: ${code}\n\nThis code expires in 5 minutes. If you didn't try to log in, you can ignore this email.`,
    html: `
      <div style="font-family: Arial, Helvetica, sans-serif; background-color: #f4f4f5; padding: 32px 16px;">
        <div style="max-width: 420px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">
          <div style="background-color: #0B0B35; padding: 24px; text-align: center;">
            ${logoBuffer ? '<img src="cid:inventologo" alt="Invento" width="48" height="48" style="border-radius: 10px;" />' : ""}
            <div style="color: #ffffff; font-size: 20px; font-weight: bold; margin-top: 12px;">Invento</div>
          </div>
          <div style="padding: 32px 24px; text-align: center;">
            <p style="color: #374151; font-size: 15px; margin: 0 0 8px;">Hi ${adminname},</p>
            <p style="color: #374151; font-size: 15px; margin: 0 0 24px;">Use this code to finish logging in:</p>
            <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #0B0B35; margin: 0 0 24px;">${code}</div>
            <p style="color: #9ca3af; font-size: 13px; margin: 0;">This code expires in 5 minutes.</p>
            <p style="color: #9ca3af; font-size: 13px; margin: 8px 0 0;">Didn't try to log in? You can safely ignore this email.</p>
          </div>
        </div>
      </div>
    `,
    attachments: logoBuffer
      ? [{ filename: "logo.png", content: logoBuffer, cid: "inventologo" }]
      : [],
  });
}
