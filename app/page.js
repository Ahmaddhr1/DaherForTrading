"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Lock, User, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

export default function LoginPage() {
  const [formData, setFormData] = useState({
    username: "",
    password: ""
  });
  const router = useRouter();

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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-6">
          <div className="p-3 bg-blue-100 rounded-xl mb-3">
            <ShieldCheck className="h-8 w-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">MDT Admin Panel</h1>
          <p className="text-gray-600 text-sm mt-1">Sign in to manage your business</p>
        </div>

        <Card className="shadow-sm border-gray-200">
          <CardHeader>
            <CardTitle className="text-lg">Welcome back</CardTitle>
            <CardDescription>Enter your credentials to continue</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-sm font-medium flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Username
                </Label>
                <Input
                  id="username"
                  type="text"
                  name="username"
                  placeholder="Enter your username"
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
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  name="password"
                  placeholder="Enter your password"
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
                    Logging In...
                  </span>
                ) : (
                  "Login"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-gray-400 mt-6">
          Access is restricted to authorized administrators only.
        </p>
      </div>
    </div>
  );
}
