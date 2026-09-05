"use client";

import React, { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
} from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";

export default function SettingsPage() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [isDownloading, setIsDownloading] = useState(false);
  const [restoreFile, setRestoreFile] = useState(null);
  const [restoreSummary, setRestoreSummary] = useState(null);
  const fileInputRef = useRef(null);

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
    if (!window.confirm(t("settings.restoreWarning"))) return;

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
              <h1 className="text-3xl font-bold text-gray-900">{t("settings.title")}</h1>
              <p className="text-gray-600">{t("settings.subtitle")}</p>
            </div>
          </div>
        </div>

        {/* Change Password */}
        <Card className="shadow-sm border-gray-200 mb-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Lock className="h-5 w-5 text-blue-600" />
              {t("settings.changePassword")}
            </CardTitle>
            <CardDescription>{t("settings.changePasswordDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">{t("settings.currentPassword")}</Label>
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
                <Label htmlFor="newPassword">{t("settings.newPassword")}</Label>
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
                <Label htmlFor="confirmPassword">{t("settings.confirmPassword")}</Label>
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
                  t("settings.updatePassword")
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Database Backup */}
        <Card className="shadow-sm border-gray-200 mb-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <DatabaseBackup className="h-5 w-5 text-green-600" />
              {t("settings.backup")}
            </CardTitle>
            <CardDescription>{t("settings.backupDesc")}</CardDescription>
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
                  {t("settings.downloadBackup")}
                </>
              )}
            </Button>
            <p className="text-xs text-gray-500 mt-3 flex items-start gap-1">
              <ShieldCheck className="h-3.5 w-3.5 shrink-0 mt-0.5 text-gray-400" />
              Login credentials are never included in this backup file.
            </p>
          </CardContent>
        </Card>

        {/* Import / Restore Backup */}
        <Card className="shadow-sm border-amber-200">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Upload className="h-5 w-5 text-amber-600" />
              {t("settings.restore")}
            </CardTitle>
            <CardDescription>{t("settings.restoreDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800">{t("settings.restoreWarning")}</p>
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
                  {t("settings.chooseFile")}
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
                  {t("settings.restoreButton")}
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
      </div>
    </div>
  );
}
