import mongoose from "mongoose";

// Singleton document (a single row identified by `key: "app"`) holding
// business-wide settings that aren't tied to any one admin. Read/written
// through app/api/settings/business/route.js - never edited directly.
const appSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: "app", unique: true },
    // Lebanese Lira per US Dollar. Manually updated as the rate moves -
    // used to show an LL equivalent alongside $ figures on receipts and
    // the order/purchase creation forms.
    dollarRate: { type: Number, default: 90000, min: 0 },
    // Default sales/purchase tax rate (%), pre-filled on new orders and
    // purchases but editable per transaction - see Order.taxRate /
    // Purchase.taxRate, which snapshot whatever rate was used at the time.
    taxRate: { type: Number, default: 0, min: 0, max: 100 },
    // Set by app/api/cron/backup/route.js after each successful automated
    // backup email, purely so the Settings page can show "last backup"
    // without needing its own model - not user-editable.
    lastScheduledBackupAt: { type: Date, default: null },
    lastScheduledBackupStatus: {
      type: String,
      enum: ["success", "failed", null],
      default: null,
    },
    lastScheduledBackupError: { type: String, default: null },
  },
  { timestamps: true }
);

const AppSettings =
  mongoose.models.AppSettings || mongoose.model("AppSettings", appSettingsSchema);
export default AppSettings;
