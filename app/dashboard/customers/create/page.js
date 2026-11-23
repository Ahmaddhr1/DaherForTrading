"use client";
import { t } from "@/core/shared/i18n";
import { useT } from "@/core/shared/i18n/LangProvider";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import { Loader2, UserPlus, DollarSign, Phone, User, Scale, Layers, StickyNote } from "lucide-react";
import { toast } from "@/core/shared/i18n/toast";
import { useRouter } from "next/navigation";
import { PRICE_TIERS } from "@/core/products/priceTiers";

const AddCustomerPage = () => {
  const t = useT();
  const router = useRouter();
  const [form, setForm] = useState({
    fullName: "",
    phoneNumber: "",
    debt: "",
    priceTier: "1",
    notes: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    const numericFields = ["phoneNumber", "debt"];
    const cleanValue = numericFields.includes(name) ? value.replace(/\D/g, "") : value;
    
    setForm((prev) => ({
      ...prev,
      [name]: cleanValue,
    }));
  };

  const mutation = useMutation({
    mutationFn: async (data) => {
      const res = await axios.post("/api/customers/create", data);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success("Customer Created Successfully!", {
        description: `${form.fullName} has been added to the system.`
      });
      router.push("/dashboard/customers");
    },
    onError: (error) => {
      const message = error.response?.data?.error || "Failed to create customer.";
      toast.error("Creation Failed", {
        description: message
      });
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!form.fullName.trim()) {
      toast.error("Validation Error", {
        description: "Full name is required."
      });
      return;
    }

    if (!form.phoneNumber.trim()) {
      toast.error("Validation Error", {
        description: "Phone number is required."
      });
      return;
    }

    mutation.mutate({
      ...form,
      debt: form.debt || "0",
    });
  };

  const hasAnyDebt = parseInt(form.debt) > 0;

  return (
    <div className="min-h-screen bg-gray-50/30 dark:bg-gray-900/30 py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <UserPlus className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{t("Add New Customer")}</h1>
              <p className="text-gray-600 dark:text-gray-400">{t("Create a new customer profile in the system")}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Form */}
          <div className="lg:col-span-2">
            <Card className="shadow-sm border-gray-200 dark:border-gray-800">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl flex items-center gap-2">
                  <User className="h-5 w-5" />
                  {t("Customer Information")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Personal Information Section */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      <div className="w-1 h-4 bg-blue-600 rounded"></div>
                      {t("Personal Details")}
                    </div>
                    
                    <div className="grid gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="fullName" className="text-sm font-medium flex items-center gap-2">
                          <User className="h-4 w-4" />
                          {t("Full Name *")}
                        </Label>
                        <Input
                          id="fullName"
                          type="text"
                          placeholder={t("Enter full name")}
                          name="fullName"
                          value={form.fullName}
                          onChange={handleChange}
                          className="focus:border-blue-500 transition-colors"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="phoneNumber" className="text-sm font-medium flex items-center gap-2">
                          <Phone className="h-4 w-4" />
                          {t("Phone Number *")}
                        </Label>
                        <Input
                          id="phoneNumber"
                          type="text"
                          inputMode="numeric"
                          placeholder={t("Enter phone number")}
                          name="phoneNumber"
                          value={form.phoneNumber}
                          onChange={handleChange}
                          className="focus:border-blue-500 transition-colors"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Pricing Section */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      <div className="w-1 h-4 bg-teal-600 rounded"></div>
                      {t("Pricing")}
                    </div>

                    <div className="space-y-2 max-w-xs">
                      <Label htmlFor="priceTier" className="text-sm font-medium flex items-center gap-2">
                        <Layers className="h-4 w-4" />
                        {t("Price Tier")}
                      </Label>
                      <select
                        id="priceTier"
                        name="priceTier"
                        value={form.priceTier}
                        onChange={handleChange}
                        className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded-md focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-colors"
                      >
                        {PRICE_TIERS.map((tier) => (
                          <option key={tier.value} value={tier.value}>
                            {t(tier.label)}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {t("Which product price this customer is charged when creating an order")}
                      </p>
                    </div>
                  </div>

                  <Separator />

                  {/* Notes Section */}
                  <div className="space-y-2">
                    <Label htmlFor="notes" className="text-sm font-medium flex items-center gap-2">
                      <StickyNote className="h-4 w-4" />
                      {t("Notes")}
                    </Label>
                    <textarea
                      id="notes"
                      name="notes"
                      rows={3}
                      maxLength={1000}
                      value={form.notes}
                      onChange={handleChange}
                      placeholder={t("Anything worth remembering about this customer")}
                      className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded-md bg-transparent text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    />
                  </div>

                  <Separator />

                  {/* Debt Information Section */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      <div className="w-1 h-4 bg-amber-600 rounded"></div>
                      {t("Debt Information")}
                    </div>
                    
                    <div className="space-y-6">
                      {/* Monetary Debt */}
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="debt" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {t("Amount Owed ($)")}
                          </Label>
                          <Input
                            id="debt"
                            type="text"
                            inputMode="numeric"
                            placeholder="0"
                            name="debt"
                            value={form.debt}
                            onChange={handleChange}
                            className="focus:border-amber-500 transition-colors max-w-xs"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Submit Button */}
                  <div className="flex gap-3 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => router.back()}
                      className="flex-1"
                    >
                      {t("Cancel")}
                    </Button>
                    <Button
                      type="submit"
                      disabled={mutation.isPending}
                      className="flex-1"
                    >
                      {mutation.isPending ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="animate-spin h-4 w-4" />
                          {t("Creating Customer...")}
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <UserPlus className="h-4 w-4" />
                          {t("Create Customer")}
                        </span>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Summary Sidebar */}
          <div className="lg:col-span-1">
            <Card className="shadow-sm border-gray-200 dark:border-gray-800 sticky top-6">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">{t("Debt Summary")}</CardTitle>
                <CardDescription>{t("Customer obligation overview")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Customer Info */}
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <User className="h-4 w-4" />
                    {t("Customer")}
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 dark:text-gray-400">{t("Name")}</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100 truncate max-w-[120px] text-end">
                        {form.fullName || t("Not provided")}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 dark:text-gray-400">{t("Phone")}</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {form.phoneNumber || t("Not provided")}
                      </span>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Monetary Debt Summary */}
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    {t("Money Debt")}
                  </h4>
                  <div className="flex justify-between items-center p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/50">
                    <span className="text-sm font-medium text-amber-800 dark:text-amber-400">{t("Amount Owed")}</span>
                    <div className="text-end">
                      <span className="text-lg font-bold text-amber-900 dark:text-amber-300">
                        ${(parseInt(form.debt) || 0).toLocaleString()}
                      </span>
                      <Badge
                        variant={hasAnyDebt ? "default" : "outline"}
                        className={`ms-2 ${hasAnyDebt ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400' : ''}`}
                      >
                        {hasAnyDebt ? t("Owes Money") : t("No Money Debt")}
                      </Badge>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Overall Status */}
                <div className="bg-gray-50 dark:bg-gray-950 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-2">
                    <Scale className="h-4 w-4" />
                    {t("Overall Status")}
                  </h4>
                  <div className="text-center">
                    <Badge 
                      variant={hasAnyDebt ? "destructive" : "default"} 
                      className="text-sm px-3 py-1"
                    >
                      {hasAnyDebt ? t("Customer Has Debt") : t("Debt-Free Customer")}
                    </Badge>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                      {hasAnyDebt
                        ? t("This customer has an outstanding balance")
                        : t("No current debt")
                      }
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddCustomerPage;