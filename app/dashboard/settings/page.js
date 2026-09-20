"use client";

import React, { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "sonner";
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
} from "lucide-react";
import { useSettings } from "@/lib/currency";

const RESTORE_WARNING =
  "This will permanently replace all current customers, orders, products, categories, companies, purchases, payments, and disbursements with the contents of this file. This cannot be undone. Continue?";

export default function SettingsPage() {
  const queryClient = useQueryClient();

  // Backup/restore is owner-only server-side (middleware.js) - this just
  // avoids showing an employee controls they'd get a 403 from.
  const { data: me } = useQuery({
    queryKey: ["admin", "me"],
    queryFn: async () => (await axios.get("/api/admin/me")).data,
  });
  const isOwner = me?.role === "owner";

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // Business settings (Dollar Rate / default Tax Rate)
  const { data: settings, isLoading: settingsLoading } = useSettings();
  const [dollarRate, setDollarRate] = useState("");
  const [taxRate, setTaxRate] = useState("");

  useEffect(() => {
    if (settings) {
      setDollarRate(settings.dollarRate?.toString() ?? "");
      setTaxRate(settings.taxRate?.toString() ?? "");
    }
  }, [settings]);

  const settingsMutation = useMutation({
    mutationFn: async () => {
      const res = await axios.put("/api/settings/business", {
        dollarRate: parseFloat(dollarRate),
        taxRate: parseFloat(taxRate),
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
    settingsMutation.mutate();
  };
  const [isDownloading, setIsDownloading] = useState(false);
  const [restoreFile, setRestoreFile] = useState(null);
  const [restoreSummary, setRestoreSummary] = useState(null);
  const fileInputRef = useRef(null);

  const sendTestBackupMutation = useMutation({
    mutationFn: async () => (await axios.post("/api/settings/backup/send-test")).data,
    onSuccess: (data) => {
      toast.success(`Backup emailed to ${data.to}`);
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
    } catch (error) {
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

  const handleRestore = () => {
    if (!restoreFile) return;
    if (!window.confirm(RESTORE_WARNING)) return;

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
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="container mx-auto px-4 max-w-2xl">
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <SettingsIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
              <p className="text-gray-600">Manage your account and data</p>
            </div>
          </div>
        </div>

        {/* Business Settings: Dollar Rate + default Tax Rate */}
        <Card className="shadow-sm border-gray-200 mb-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              Business Settings
            </CardTitle>
            <CardDescription>
              Used to show an LL equivalent on receipts and order/purchase forms, and to
              pre-fill tax on new orders and purchases
            </CardDescription>
          </CardHeader>
          <CardContent>
            {settingsLoading ? (
              <p className="text-sm text-gray-500">Loading...</p>
            ) : (
              <form onSubmit={handleSettingsSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="dollarRate" className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Dollar Rate (LL per $1)
                  </Label>
                  <Input
                    id="dollarRate"
                    type="number"
                    min="0"
                    step="1"
                    value={dollarRate}
                    onChange={(e) => setDollarRate(e.target.value)}
                    placeholder="90000"
                  />
                  <p className="text-xs text-gray-500">
                    e.g. 90000 means $1 = 90,000 LL. Update this whenever the rate moves.
                  </p>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="taxRate" className="flex items-center gap-2">
                    <Percent className="h-4 w-4" />
                    Default Tax Rate (%)
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
                  />
                  <p className="text-xs text-gray-500">
                    Pre-fills the tax field when creating an order or purchase - it can
                    still be changed per transaction.
                  </p>
                </div>

                <Button
                  type="submit"
                  disabled={settingsMutation.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {settingsMutation.isPending ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </span>
                  ) : (
                    "Save Business Settings"
                  )}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        {/* Change Password */}
        <Card className="shadow-sm border-gray-200 mb-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Lock className="h-5 w-5 text-blue-600" />
              Change Password
            </CardTitle>
            <CardDescription>Update the password used to log in to this dashboard</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
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
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  name="newPassword"
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={handleChange}
                  autoComplete="new-password"
                  required
                />
                <p className="text-xs text-gray-500">At least 8 characters</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
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
                type="submit"
                disabled={changePasswordMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {changePasswordMutation.isPending ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Updating...
                  </span>
                ) : (
                  "Update Password"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Database Backup - owner only (see middleware.js) */}
        {isOwner && (
          <Card className="shadow-sm border-gray-200 mb-6">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <DatabaseBackup className="h-5 w-5 text-green-600" />
                Database Backup
              </CardTitle>
              <CardDescription>
                Download a full copy of your business data (customers, orders, products,
                categories, companies, purchases, payments, and disbursements) as a JSON file
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={handleDownloadBackup}
                disabled={isDownloading}
                variant="outline"
                className="flex items-center gap-2"
              >
                {isDownloading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Preparing Backup...
                  </>
                ) : (
                  <>
                    <DatabaseBackup className="h-4 w-4" />
                    Download Backup
                  </>
                )}
              </Button>
              <p className="text-xs text-gray-500 mt-3 flex items-start gap-1">
                <ShieldCheck className="h-3.5 w-3.5 shrink-0 mt-0.5 text-gray-400" />
                Login credentials are never included in this backup file.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Automated Backups - owner only (see middleware.js) */}
        {isOwner && (
          <Card className="shadow-sm border-gray-200 mb-6">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Mail className="h-5 w-5 text-blue-600" />
                Automated Backups
              </CardTitle>
              <CardDescription>
                A copy of the same backup above, emailed automatically on a schedule
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {settings?.lastScheduledBackupAt ? (
                <div
                  className={`rounded-lg p-3 flex items-start gap-2 border ${
                    settings.lastScheduledBackupStatus === "failed"
                      ? "bg-red-50 border-red-200"
                      : "bg-green-50 border-green-200"
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
                          ? "text-red-800 font-medium"
                          : "text-green-800 font-medium"
                      }
                    >
                      Last backup email {settings.lastScheduledBackupStatus === "failed" ? "failed" : "sent"}
                      {" - "}
                      {new Date(settings.lastScheduledBackupAt).toLocaleString()}
                    </p>
                    {settings.lastScheduledBackupStatus === "failed" && settings.lastScheduledBackupError && (
                      <p className="text-red-700 mt-1">{settings.lastScheduledBackupError}</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800">
                    No automated backup has run yet. Once the schedule is configured on the
                    server (see below), or you send a test email, it will show up here.
                  </p>
                </div>
              )}

              <Button
                onClick={() => sendTestBackupMutation.mutate()}
                disabled={sendTestBackupMutation.isPending}
                variant="outline"
                className="flex items-center gap-2"
              >
                {sendTestBackupMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Send Backup Email Now
                  </>
                )}
              </Button>

              <p className="text-xs text-gray-500">
                Runs automatically once a day. This needs a few things set up on the server
                once (SMTP credentials for sending mail, a recipient address, and a schedule
                secret) - ask your developer if the status above says a backup email failed.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Import / Restore Backup - owner only (see middleware.js) */}
        {isOwner && (
          <Card className="shadow-sm border-amber-200">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Upload className="h-5 w-5 text-amber-600" />
                Import Backup
              </CardTitle>
              <CardDescription>
                Restore your business data from a previously downloaded backup file. This
                replaces all current data.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800">{RESTORE_WARNING}</p>
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
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2"
                  >
                    <FileJson className="h-4 w-4" />
                    Choose Backup File
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
                onClick={handleRestore}
                disabled={!restoreFile || restoreMutation.isPending}
                variant="destructive"
                className="flex items-center gap-2"
              >
                {restoreMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Restoring...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Restore from Backup
                  </>
                )}
              </Button>

              {restoreSummary && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-sm font-medium text-green-800 mb-2">Restored:</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(restoreSummary).map(([key, count]) => (
                      <Badge key={key} variant="outline" className="bg-white">
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
    </div>
  );
}
