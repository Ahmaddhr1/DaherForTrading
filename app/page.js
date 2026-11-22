"use client";
import { t } from "@/lib/i18n";
import { useT } from "@/lib/i18n/LangProvider";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Lock, User, Mail, ArrowLeft } from "lucide-react";
import { toast } from "@/lib/i18n/toast";

const OTP_RESEND_COOLDOWN_SECONDS = 30;

export default function LoginPage() {
  const t = useT();
  const [formData, setFormData] = useState({ username: "", password: "" });
  const [otpStage, setOtpStage] = useState(null); // { adminname, maskedEmail } | null
  const [otpCode, setOtpCode] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const router = useRouter();

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => setResendCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const loginMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminname: formData.username, password: formData.password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Login failed");
      return data;
    },
    onSuccess: (data) => {
      if (data.otpRequired) {
        setOtpStage({ adminname: data.adminname, maskedEmail: data.maskedEmail });
        setResendCooldown(OTP_RESEND_COOLDOWN_SECONDS);
        toast.success(t("Code sent to {0}", {
          0: data.maskedEmail
        }));
        return;
      }
      toast.success("Logged in successfully!");
      router.push("/dashboard");
    },
    onError: (error) => {
      toast.error(error.message || "An error occurred during login");
    },
  });

  const verifyMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/admin/login/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminname: otpStage.adminname, code: otpCode }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Verification failed");
      return data;
    },
    onSuccess: () => {
      toast.success("Logged in successfully!");
      router.push("/dashboard");
    },
    onError: (error) => {
      toast.error(error.message || "Invalid code");
    },
  });

  const resendMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/admin/login/resend-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminname: otpStage.adminname }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Couldn't resend code");
      return data;
    },
    onSuccess: () => {
      toast.success("A new code has been sent");
      setResendCooldown(OTP_RESEND_COOLDOWN_SECONDS);
    },
    onError: (error) => {
      toast.error(error.message || "Couldn't resend code");
    },
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.username.trim() || !formData.password.trim()) {
      toast.error("Please enter both username/email and password");
      return;
    }
    loginMutation.mutate();
  };

  const handleVerify = (e) => {
    e.preventDefault();
    if (otpCode.trim().length !== 6) {
      toast.error("Enter the 6-digit code from your email");
      return;
    }
    verifyMutation.mutate();
  };

  const handleBack = () => {
    setOtpStage(null);
    setOtpCode("");
  };

  const isLoading = loginMutation.isPending;
  const isFormValid = formData.username.trim() && formData.password.trim();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-6">
          <svg width="56" height="56" viewBox="0 0 160 160" className="mb-3">
            <rect width="160" height="160" rx="36" fill="#0B0B35" />
            <rect x="38" y="86" width="22" height="46" rx="6" fill="#F5F5F7" />
            <rect x="69" y="64" width="22" height="68" rx="6" fill="#F5F5F7" />
            <rect x="100" y="38" width="22" height="94" rx="6" fill="#E8A33D" />
          </svg>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t("Invento")}</h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">{t("Sign in to manage your business")}</p>
        </div>

        {!otpStage ? (
          <Card className="shadow-sm border-gray-200 dark:border-gray-800">
            <CardHeader>
              <CardTitle className="text-lg">{t("Welcome back")}</CardTitle>
              <CardDescription>{t("Enter your credentials to continue")}</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-sm font-medium flex items-center gap-2">
                    <User className="h-4 w-4" />
                    {t("Username or Email")}
                  </Label>
                  <Input
                    id="username"
                    type="text"
                    name="username"
                    placeholder={t("Enter your username or email")}
                    value={formData.username}
                    onChange={handleChange}
                    disabled={isLoading}
                    autoComplete="username"
                    autoFocus
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    {t("Password")}
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    name="password"
                    placeholder={t("Enter your password")}
                    value={formData.password}
                    onChange={handleChange}
                    disabled={isLoading}
                    autoComplete="current-password"
                    required
                  />
                </div>

                <Button type="submit" size="lg" disabled={isLoading || !isFormValid} className="w-full">
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t("Logging In...")}
                    </span>
                  ) : (
                    t("Login")
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : (
          <Card className="shadow-sm border-gray-200 dark:border-gray-800">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Mail className="h-5 w-5 text-blue-600" />
                {t("Check your email")}
              </CardTitle>
              <CardDescription>
                {t("We sent a 6-digit code to")} <span className="font-medium text-gray-700 dark:text-gray-300">{otpStage.maskedEmail}</span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleVerify} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="otp" className="text-sm font-medium">
                    {t("Verification code")}
                  </Label>
                  <Input
                    id="otp"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="000000"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    disabled={verifyMutation.isPending}
                    className="text-center text-2xl tracking-[0.5em] font-semibold"
                    autoFocus
                    required
                  />
                </div>

                <Button
                  type="submit"
                  size="lg"
                  disabled={verifyMutation.isPending || otpCode.length !== 6}
                  className="w-full"
                >
                  {verifyMutation.isPending ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t("Verifying...")}
                    </span>
                  ) : (
                    t("Verify & Log In")
                  )}
                </Button>

                <div className="flex items-center justify-between text-sm">
                  <button
                    type="button"
                    onClick={handleBack}
                    className="flex items-center gap-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                  >
                    <ArrowLeft className="rtl-flip h-3.5 w-3.5" />
                    {t("Back")}
                  </button>
                  <button
                    type="button"
                    onClick={() => resendMutation.mutate()}
                    disabled={resendCooldown > 0 || resendMutation.isPending}
                    className="text-blue-600 hover:text-blue-700 disabled:text-gray-400 dark:disabled:text-gray-600 disabled:cursor-not-allowed"
                  >
                    {resendCooldown > 0 ? t("Resend code ({0}s)", {
                      0: resendCooldown
                    }) : t("Resend code")}
                  </button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-6">
          {t("Access is restricted to authorized administrators only.")}
        </p>
      </div>
    </div>
  );
}
