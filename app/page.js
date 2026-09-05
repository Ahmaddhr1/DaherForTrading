"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Lock, User, ShieldCheck, Languages } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/lib/i18n/LanguageContext";

export default function LoginPage() {
  const [formData, setFormData] = useState({
    username: "",
    password: ""
  });
  const router = useRouter();
  const { t, language, setLanguage } = useLanguage();

  const loginMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          adminname: formData.username,
          password: formData.password
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Login failed");
      }

      return data;
    },
    onSuccess: () => {
      toast.success("Logged in successfully!");
      router.push("/dashboard");
    },
    onError: (error) => {
      toast.error(error.message || "An error occurred during login");
    }
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.username.trim() || !formData.password.trim()) {
      toast.error("Please enter both username and password");
      return;
    }
    loginMutation.mutate();
  };

  const isLoading = loginMutation.isPending;
  const isFormValid = formData.username.trim() && formData.password.trim();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 relative">
      <button
        type="button"
        onClick={() => setLanguage(language === "ar" ? "en" : "ar")}
        className="absolute top-4 end-4 flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 bg-white border border-gray-200 rounded-lg px-3 py-1.5 shadow-sm"
      >
        <Languages className="h-4 w-4" />
        {language === "ar" ? "English" : "العربية"}
      </button>

      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-6">
          <div className="p-3 bg-blue-100 rounded-xl mb-3">
            <ShieldCheck className="h-8 w-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{t("login.title")}</h1>
          <p className="text-gray-600 text-sm mt-1">{t("login.subtitle")}</p>
        </div>

        <Card className="shadow-sm border-gray-200">
          <CardHeader>
            <CardTitle className="text-lg">{t("login.welcome")}</CardTitle>
            <CardDescription>{t("login.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-sm font-medium flex items-center gap-2">
                  <User className="h-4 w-4" />
                  {t("login.username")}
                </Label>
                <Input
                  id="username"
                  type="text"
                  name="username"
                  placeholder={t("login.usernamePlaceholder")}
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
                  {t("login.password")}
                </Label>
                <Input
                  id="password"
                  type="password"
                  name="password"
                  placeholder={t("login.passwordPlaceholder")}
                  value={formData.password}
                  onChange={handleChange}
                  disabled={isLoading}
                  autoComplete="current-password"
                  required
                />
              </div>

              <Button
                type="submit"
                size="lg"
                disabled={isLoading || !isFormValid}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t("login.loggingIn")}
                  </span>
                ) : (
                  t("login.submit")
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-gray-400 mt-6">
          {t("login.footer")}
        </p>
      </div>
    </div>
  );
}
