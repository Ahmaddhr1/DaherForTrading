"use client";
import { t } from "@/core/shared/i18n";
import { useT } from "@/core/shared/i18n/LangProvider";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import { Loader2, Building2, Phone, MapPin } from "lucide-react";
import { toast } from "@/core/shared/i18n/toast";
import { useRouter } from "next/navigation";

const AddCompanyPage = () => {
  const t = useT();
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    phoneNumber: "",
    address: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const mutation = useMutation({
    mutationFn: async (data) => {
      const res = await axios.post("/api/companies", data);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Company Created Successfully!", {
        description: `${form.name} has been added.`,
      });
      router.push("/dashboard/companies");
    },
    onError: (error) => {
      toast.error("Creation Failed", {
        description: error.response?.data?.error || "Failed to create company.",
      });
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Validation Error", { description: "Company name is required." });
      return;
    }
    mutation.mutate(form);
  };

  return (
    <div className="min-h-screen bg-gray-50/30 dark:bg-gray-900/30 py-8">
      <div className="container mx-auto px-4">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Building2 className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{t("Add New Company")}</h1>
              <p className="text-gray-600 dark:text-gray-400">{t("Register a new supplier")}</p>
            </div>
          </div>
        </div>

        <Card className="shadow-sm border-gray-200 dark:border-gray-800">
          <CardHeader>
            <CardTitle className="text-xl">{t("Company Information")}</CardTitle>
            <CardDescription>{t("Basic contact details for this supplier")}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  {t("Company Name *")}
                </Label>
                <Input
                  id="name"
                  name="name"
                  placeholder={t("Enter company name")}
                  value={form.name}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phoneNumber" className="text-sm font-medium flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  {t("Phone Number")}
                </Label>
                <Input
                  id="phoneNumber"
                  name="phoneNumber"
                  placeholder={t("Enter phone number")}
                  value={form.phoneNumber}
                  onChange={handleChange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address" className="text-sm font-medium flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  {t("Address")}
                </Label>
                <Input
                  id="address"
                  name="address"
                  placeholder={t("Enter address")}
                  value={form.address}
                  onChange={handleChange}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => router.back()} className="flex-1">
                  {t("Cancel")}
                </Button>
                <Button type="submit" disabled={mutation.isPending} className="flex-1">
                  {mutation.isPending ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="animate-spin h-4 w-4" />
                      {t("Creating...")}
                    </span>
                  ) : (
                    t("Create Company")
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AddCompanyPage;
