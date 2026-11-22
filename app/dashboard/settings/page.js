"use client";
import { t, dateLocale } from "@/lib/i18n";
import { useT } from "@/lib/i18n/LangProvider";

import React, { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "@/lib/i18n/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Settings as SettingsIcon,
  Lock,
  Loader2,
  DatabaseBackup,
  ShieldCheck,
  Upload,
  FileJson,
  AlertTriangle,
  DollarSign,
  Percent,
  Mail,
  CheckCircle2,
  XCircle,
  Send,
  Moon, CalendarClock } from "lucide-react";
import { useSettings } from "@/lib/currency";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageSwitch } from "@/components/LanguageSwitch";
import { Languages } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useHasPermission } from "@/lib/useHasPermission";

const restoreWarning = () =>
  t("This will permanently replace all current customers, orders, products, categories, companies, purchases, payments, and disbursements with the contents of this file. This cannot be undone. Continue?");

export default function SettingsPage() {
  const t = useT();
  const queryClient = useQueryClient();

  // Backup/restore is owner-only server-side (middleware.js) - this just
  // avoids showing an employee controls they'd get a 403 from.
  const { data: me } = useQuery({
    queryKey: ["admin", "me"],
    queryFn: async () => (await axios.get("/api/admin/me")).data,
  });
  const isOwner = me?.role === "owner";
  const { hasPermission: canManageSettings } = useHasPermission("canManageSettings");

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // Business settings (Dollar Rate / default Tax Rate)
  const { data: settings, isLoading: settingsLoading } = useSettings();
  const [dollarRate, setDollarRate] = useState("");
  const [taxRate, setTaxRate] = useState("");
  const [expiryAlertDays, setExpiryAlertDays] = useState("30");

  useEffect(() => {
    if (settings) {
      setDollarRate(settings.dollarRate?.toString() ?? "");
      setTaxRate(settings.taxRate?.toString() ?? "");
      setExpiryAlertDays(settings.expiryAlertDays?.toString() ?? "30");
    }
  }, [settings]);

  const settingsMutation = useMutation({
    mutationFn: async () => {
      const res = await axios.put("/api/settings/business", {
        dollarRate: parseFloat(dollarRate),
        taxRate: parseFloat(taxRate),
        expiryAlertDays: parseInt(expiryAlertDays, 10),
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success("Business settings updated");
      queryClient.invalidateQueries({ queryKey: ["settings", "business"] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || "Failed to update settings");
    },
  });

  const handleSettingsSubmit = (e) => {
    e.preventDefault();
    const rate = parseFloat(dollarRate);
    const tax = parseFloat(taxRate);
    if (!rate || rate <= 0) {
      toast.error("Enter a valid Dollar Rate greater than 0");
      return;
    }
    if (isNaN(tax) || tax < 0 || tax > 100) {
      toast.error("Enter a valid Tax Rate between 0 and 100");
      return;
    }
    const days = parseInt(expiryAlertDays, 10);
    if (isNaN(days) || days < 1 || days > 365) {
      toast.error("Enter an expiry alert between 1 and 365 days");
      return;
    }
    settingsMutation.mutate();
  };
  const [isDownloading, setIsDownloading] = useState(false);
  const [restoreFile, setRestoreFile] = useState(null);
  const [restoreSummary, setRestoreSummary] = useState(null);
  const fileInputRef = useRef(null);

  const sendTestBackupMutation = useMutation({
    mutationFn: async () => (await axios.post("/api/settings/backup/send-test")).data,
    onSuccess: (data) => {
      toast.success(t("Backup emailed to {0}", {
        0: data.to
      }));
      queryClient.invalidateQueries({ queryKey: ["settings", "business"] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || "Failed to send backup email");
    },
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setPasswordForm((prev) => ({ ...prev, [name]: value }));
  };

  const changePasswordMutation = useMutation({
    mutationFn: async () => {
      const res = await axios.put("/api/admin/change-password", {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success("Password updated successfully");
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || "Failed to update password");
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      toast.error("Please fill in all fields");
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      toast.error("New password must be at least 8 characters");
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error("New password and confirmation do not match");
      return;
    }

    changePasswordMutation.mutate();
  };

  const handleDownloadBackup = async () => {
    setIsDownloading(true);
    try {
      const res = await axios.get("/api/settings/backup", { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: "application/json" }));
      const disposition = res.headers["content-disposition"];
      const filenameMatch = disposition?.match(/filename="(.+)"/);
      const filename = filenameMatch?.[1] || `backup-${new Date().toISOString().slice(0, 10)}.json`;

      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success("Backup downloaded successfully");
    } catch {
      toast.error("Failed to download backup");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    setRestoreSummary(null);
    if (!file) {
      setRestoreFile(null);
      return;
    }
    if (!file.name.endsWith(".json")) {
      toast.error("Please select a .json backup file");
      e.target.value = "";
      setRestoreFile(null);
      return;
    }
    setRestoreFile(file);
  };

  const restoreMutation = useMutation({
    mutationFn: async (parsedBackup) => {
      const res = await axios.post("/api/settings/restore", parsedBackup);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success("Backup restored successfully");
      setRestoreSummary(data.summary);
      setRestoreFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      // Every page's data may have changed - drop all cached queries.
      queryClient.invalidateQueries();
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || "Failed to restore backup");
    },
  });

  const [confirmRestoreOpen, setConfirmRestoreOpen] = useState(false);

  const handleRestore = () => {
    if (!restoreFile) return;
    setConfirmRestoreOpen(true);
  };

  const confirmRestore = () => {
    setConfirmRestoreOpen(false);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        restoreMutation.mutate(parsed);
      } catch {
        toast.error("This file isn't valid JSON");
      }
    };
    reader.onerror = () => toast.error("Failed to read the file");
    reader.readAsText(restoreFile);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-6">
      <div className="container mx-auto px-4">
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <SettingsIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{t("Settings")}</h1>
              <p className="text-gray-600 dark:text-gray-400">{t("Manage your account and data")}</p>
            </div>
          </div>
        </div>

        {/* Language */}
        <Card className="shadow-sm border-gray-200 dark:border-gray-800 mb-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Languages className="h-5 w-5 text-blue-600" />
              {t("Language")}
            </CardTitle>
            <CardDescription>{t("Choose the dashboard language. Arabic switches the layout to right-to-left.")}</CardDescription>
          </CardHeader>
          <CardContent>
            <LanguageSwitch variant="segmented" />
          </CardContent>
        </Card>

        {/* Appearance */}
        <Card className="shadow-sm border-gray-200 dark:border-gray-800 mb-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Moon className="h-5 w-5 text-indigo-600" />
              {t("Appearance")}
            </CardTitle>
            <CardDescription>{t("Switch between light and dark mode")}</CardDescription>
          </CardHeader>
          <CardContent>
            <ThemeToggle className="border border-gray-200 dark:border-gray-800" />
          </CardContent>
        </Card>

        {/* Business Settings: Dollar Rate + default Tax Rate */}
        <Card className="shadow-sm border-gray-200 dark:border-gray-800 mb-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              {t("Business Settings")}
            </CardTitle>
            <CardDescription>
              {t(
                "Used to show an LL equivalent on receipts and order/purchase forms, and to pre-fill tax on new orders and purchases"
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {settingsLoading ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">{t("Loading...")}</p>
            ) : (
              <form onSubmit={handleSettingsSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="dollarRate" className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    {t("Dollar Rate (LL per $1)")}
                  </Label>
                  <Input
                    id="dollarRate"
                    type="number"
                    min="0"
                    step="1"
                    value={dollarRate}
                    onChange={(e) => setDollarRate(e.target.value)}
                    placeholder="90000"
                    disabled={!canManageSettings}
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {t("e.g. 90000 means $1 = 90,000 LL. Update this whenever the rate moves.")}
                  </p>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="taxRate" className="flex items-center gap-2">
                    <Percent className="h-4 w-4" />
                    {t("Default Tax Rate (%)")}
                  </Label>
                  <Input
                    id="taxRate"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={taxRate}
                    onChange={(e) => setTaxRate(e.target.value)}
                    placeholder="0"
                    disabled={!canManageSettings}
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {t(
                      "Pre-fills the tax field when creating an order or purchase - it can still be changed per transaction."
                    )}
                  </p>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="expiryAlertDays" className="flex items-center gap-2">
                    <CalendarClock className="h-4 w-4" />
                    {t("Expiry Alert (days before)")}
                  </Label>
                  <Input
                    id="expiryAlertDays"
                    type="number"
                    min="1"
                    max="365"
                    step="1"
                    value={expiryAlertDays}
                    onChange={(e) => setExpiryAlertDays(e.target.value)}
                    placeholder="30"
                    disabled={!canManageSettings}
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {t("Products expiring within this many days (and already expired ones) are listed on the dashboard.")}
                  </p>
                </div>

                <Button
                  data-keep-label
                  type="submit"
                  disabled={settingsMutation.isPending || !canManageSettings}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {settingsMutation.isPending ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t("Saving...")}
                    </span>
                  ) : (
                    t("Save Business Settings")
                  )}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        {/* Change Password */}
        <Card className="shadow-sm border-gray-200 dark:border-gray-800 mb-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Lock className="h-5 w-5 text-blue-600" />
              {t("Change Password")}
            </CardTitle>
            <CardDescription>{t("Update the password used to log in to this dashboard")}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">{t("Current Password")}</Label>
                <Input
                  id="currentPassword"
                  name="currentPassword"
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={handleChange}
                  autoComplete="current-password"
                  required
                />
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="newPassword">{t("New Password")}</Label>
                <Input
                  id="newPassword"
                  name="newPassword"
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={handleChange}
                  autoComplete="new-password"
                  required
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">{t("At least 8 characters")}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">{t("Confirm New Password")}</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={handleChange}
                  autoComplete="new-password"
                  required
                />
              </div>

              <Button
                data-keep-label
                type="submit"
                disabled={changePasswordMutation.isPending}
              >
                {changePasswordMutation.isPending ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t("Updating...")}
                  </span>
                ) : (
                  t("Update Password")
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Database Backup - owner only (see middleware.js) */}
        {isOwner && (
          <Card className="shadow-sm border-gray-200 dark:border-gray-800 mb-6">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <DatabaseBackup className="h-5 w-5 text-green-600" />
                {t("Database Backup")}
              </CardTitle>
              <CardDescription>
                {t(
                  "Download a full copy of your business data (customers, orders, products, categories, companies, purchases, payments, and disbursements) as a JSON file"
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                data-keep-label
                onClick={handleDownloadBackup}
                disabled={isDownloading}
                variant="outline"
                className="flex items-center gap-2"
              >
                {isDownloading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t("Preparing Backup...")}
                  </>
                ) : (
                  <>
                    <DatabaseBackup className="h-4 w-4" />
                    {t("Download Backup")}
                  </>
                )}
              </Button>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 flex items-start gap-1">
                <ShieldCheck className="h-3.5 w-3.5 shrink-0 mt-0.5 text-gray-400 dark:text-gray-500" />
                {t("Login credentials are never included in this backup file.")}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Automated Backups - owner only (see middleware.js) */}
        {isOwner && (
          <Card className="shadow-sm border-gray-200 dark:border-gray-800 mb-6">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Mail className="h-5 w-5 text-blue-600" />
                {t("Automated Backups")}
              </CardTitle>
              <CardDescription>
                {t("A copy of the same backup above, emailed automatically on a schedule")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {settings?.lastScheduledBackupAt ? (
                <div
                  className={`rounded-lg p-3 flex items-start gap-2 border ${
                    settings.lastScheduledBackupStatus === "failed"
                      ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-900/50"
                      : "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-900/50"
                  }`}
                >
                  {settings.lastScheduledBackupStatus === "failed" ? (
                    <XCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                  )}
                  <div className="text-xs">
                    <p
                      className={
                        settings.lastScheduledBackupStatus === "failed"
                          ? "text-red-800 dark:text-red-400 font-medium"
                          : "text-green-800 dark:text-green-400 font-medium"
                      }
                    >
                      {t("Last backup email")} {settings.lastScheduledBackupStatus === "failed" ? t("failed") : t("sent")}
                      {" - "}
                      {new Date(settings.lastScheduledBackupAt).toLocaleString(dateLocale())}
                    </p>
                    {settings.lastScheduledBackupStatus === "failed" && settings.lastScheduledBackupError && (
                      <p className="text-red-700 mt-1">{settings.lastScheduledBackupError}</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/50 rounded-lg p-3 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800 dark:text-amber-400">
                    {t(
                      "No automated backup has run yet. Once the schedule is configured on the server (see below), or you send a test email, it will show up here."
                    )}
                  </p>
                </div>
              )}

              <Button
                data-keep-label
                onClick={() => sendTestBackupMutation.mutate()}
                disabled={sendTestBackupMutation.isPending}
                variant="outline"
                className="flex items-center gap-2"
              >
                {sendTestBackupMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t("Sending...")}
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    {t("Send Backup Email Now")}
                  </>
                )}
              </Button>

              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t(
                  "Runs automatically once a day. This needs a few things set up on the server once (SMTP credentials for sending mail, a recipient address, and a schedule secret) - ask your developer if the status above says a backup email failed."
                )}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Import / Restore Backup - owner only (see middleware.js) */}
        {isOwner && (
          <Card className="shadow-sm border-amber-200 dark:border-amber-900/50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Upload className="h-5 w-5 text-amber-600" />
                {t("Import Backup")}
              </CardTitle>
              <CardDescription>
                {t(
                  "Restore your business data from a previously downloaded backup file. This replaces all current data."
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/50 rounded-lg p-3 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800 dark:text-amber-400">{restoreWarning()}</p>
              </div>

              <div className="space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="restore-file-input"
                />
                <div className="flex items-center gap-3 flex-wrap">
                  <Button
                    data-keep-label
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2"
                  >
                    <FileJson className="h-4 w-4" />
                    {t("Choose Backup File")}
                  </Button>
                  {restoreFile && (
                    <Badge variant="outline" className="flex items-center gap-1">
                      <FileJson className="h-3 w-3" />
                      {restoreFile.name}
                    </Badge>
                  )}
                </div>
              </div>

              <Button
                data-keep-label
                onClick={handleRestore}
                disabled={!restoreFile || restoreMutation.isPending}
                variant="destructive"
                className="flex items-center gap-2"
              >
                {restoreMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t("Restoring...")}
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    {t("Restore from Backup")}
                  </>
                )}
              </Button>

              {restoreSummary && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900/50 rounded-lg p-3">
                  <p className="text-sm font-medium text-green-800 dark:text-green-400 mb-2">{t("Restored:")}</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(restoreSummary).map(([key, count]) => (
                      <Badge key={key} variant="outline" className="bg-white dark:bg-gray-900">
                        {key}: {count}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
      <ConfirmDialog
        open={confirmRestoreOpen}
        onClose={() => setConfirmRestoreOpen(false)}
        title={t("Restore backup?")}
        description={restoreWarning()}
        confirmLabel={t("Restore")}
        onConfirm={confirmRestore}
        loading={restoreMutation.isPending}
      />
    </div>
  );
}
