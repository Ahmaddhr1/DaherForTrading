"use client";
import { t } from "@/lib/i18n";
import { useT } from "@/lib/i18n/LangProvider";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FormSkeleton, PageHeaderSkeleton } from "@/components/ui/skeleton-patterns";
import { Eye, Loader2, User, Phone, DollarSign, UserCog, Package, PhoneCall, Lock, FileText, Layers, AlertTriangle, StickyNote } from "lucide-react";
import { format } from "@/lib/i18n/date";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "@/lib/i18n/toast";
import { useParams } from "next/navigation";
import Link from "next/link";
import { PRICE_TIERS } from "@/lib/priceTiers";
import { useHasPermission } from "@/lib/useHasPermission";

const EditCustomerPage = () => {
  const t = useT();
  const router = useRouter();
  const { id } = useParams();
  const queryClient = useQueryClient();
  const { hasPermission: canEditCustomers } = useHasPermission("canEditCustomers");
  const { hasPermission: canCreateOrders } = useHasPermission("canCreateOrders");

  const [form, setForm] = useState({
    fullName: "",
    phoneNumber: "",
    debt: "",
    priceTier: "1",
    notes: "",
    orders: [],
  });

  // Fetch existing customer data
  const { data, isLoading, isError } = useQuery({
    queryKey: ["customer", id],
    queryFn: async () => {
      const res = await axios.get(`/api/customers/${id}`);
      return res.data;
    },
    enabled: !!id,
  });

  useEffect(() => {
    if (data) {
      setForm({
        fullName: data.fullName || "",
        phoneNumber: data.phoneNumber || "",
        debt: data.debt?.toString() || "",
        priceTier: data.priceTier?.toString() || "1",
        notes: data.notes || "",
        orders: data?.orders || [],
      });
    }
    if (isError) {
      toast.error("Failed to fetch customer data.");
    }
  }, [data, isError]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    const numericFields = ["phoneNumber"];
    const cleanValue = numericFields.includes(name) ? value.replace(/\D/g, "") : value;

    setForm((prev) => ({ ...prev, [name]: cleanValue }));
  };

  // Mutation for updating customer info
  const mutation = useMutation({
    mutationFn: async (updatedData) => {
      const res = await axios.put(`/api/customers/${id}`, updatedData);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success("Customer Updated Successfully!", {
        description: `${form.fullName}'s information has been updated.`
      });
      queryClient.invalidateQueries(["customer", id]);
    },
    onError: (error) => {
      const message = error.response?.data?.error || "Failed to update customer.";
      toast.error("Update Failed", {
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

    if (!form.phoneNumber) {
      toast.error("Validation Error", {
        description: "Phone number is required."
      });
      return;
    }

    // Debt and orders aren't editable from this form - debt is managed
    // separately, and `orders` here is just the populated list this page
    // fetched to show the order count/summary, not something to write back.
    const { debt, orders, ...editableFields } = form;
    mutation.mutate(editableFields);
  };

  const hasAnyDebt = parseInt(form.debt) > 0;
  const ordersCount = form.orders?.length || 0;
  const isOverdue = hasAnyDebt && data?.isOverdue;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50/30 dark:bg-gray-900/30 py-8">
        <div className="container mx-auto px-4">
          <PageHeaderSkeleton />
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <Card className="shadow-sm border-gray-200 dark:border-gray-800">
                <CardContent className="pt-6">
                  <FormSkeleton fields={4} />
                </CardContent>
              </Card>
            </div>
            <div className="lg:col-span-1">
              <Card className="shadow-sm border-gray-200 dark:border-gray-800">
                <CardContent className="pt-6 space-y-4">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-20 w-full rounded-lg" />
                  <Skeleton className="h-20 w-full rounded-lg" />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/30 dark:bg-gray-900/30 py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg shrink-0">
                <UserCog className="h-6 w-6 text-blue-600" />
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 truncate">{t("Edit Customer")}</h1>
                <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base truncate">{t("Update customer profile and debt information")}</p>
              </div>
            </div>

            {canCreateOrders && (
              <div className="flex items-center gap-3">
                <Link href={`/dashboard/customers/${id}/addorder`} className="flex-1 sm:flex-none">
                  <Button className="flex items-center gap-2 w-full sm:w-auto justify-center">
                    <Package className="h-4 w-4" />
                    {t("Create Order")}
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {/* Customer Quick Actions */}
          <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 sm:gap-4 mb-4">
            <a
              href={`https://wa.me/${form.phoneNumber}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" className="flex items-center justify-center gap-2 w-full sm:w-auto">
                <PhoneCall className="h-4 w-4" />
                {t("Contact via WhatsApp")}
              </Button>
            </a>

            {ordersCount > 0 && (
              <Link href={`/dashboard/customers/${id}/orders`}>
                <Button variant="outline" className="flex items-center justify-center gap-2 w-full sm:w-auto">
                  <Eye className="h-4 w-4" />
                  {t("View Orders (")}{ordersCount})
                </Button>
              </Link>
            )}

            <Link href={`/dashboard/customers/${id}/statement`}>
              <Button variant="outline" className="flex items-center justify-center gap-2 w-full sm:w-auto">
                <FileText className="h-4 w-4" />
                {t("Statement")}
              </Button>
            </Link>
          </div>

          {ordersCount === 0 && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-amber-800 dark:text-amber-400">
                <Package className="h-4 w-4" />
                <span className="font-medium">{t("No Orders Yet")}</span>
              </div>
              <p className="text-amber-700 text-sm mt-1">
                {t(
                  "This customer doesn't have any orders. Create their first order to get started."
                )}
              </p>
            </div>
          )}
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
                <CardDescription>
                  {t("Update customer details and debt information")}
                </CardDescription>
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
                          disabled={!canEditCustomers}
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
                          disabled={!canEditCustomers}
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
                        disabled={!canEditCustomers}
                        className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded-md focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
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
                      disabled={!canEditCustomers}
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

                    <div className="space-y-2">
                      <Label htmlFor="debt" className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                        {t("Amount Owed ($)")}
                        <Lock className="h-3 w-3 text-gray-400 dark:text-gray-500" />
                      </Label>
                      <Input
                        id="debt"
                        type="text"
                        name="debt"
                        value={form.debt}
                        disabled
                        readOnly
                        className="max-w-xs bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {t(
                          "Debt is managed automatically through orders and payments and can no longer be edited directly here."
                        )}
                      </p>
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
                      disabled={mutation.isPending || !canEditCustomers}
                      className="flex-1"
                    >
                      {mutation.isPending ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="animate-spin h-4 w-4" />
                          {t("Updating Customer...")}
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <UserCog className="h-4 w-4" />
                          {t("Update Customer")}
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
                <CardTitle className="text-lg">{t("Customer Summary")}</CardTitle>
                <CardDescription>{t("Current customer overview")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Customer Info */}
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <User className="h-4 w-4" />
                    {t("Customer Details")}
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

                    <div className="flex justify-between items-center pt-2 border-t">
                      <span className="text-sm text-gray-600 dark:text-gray-400">{t("Total Orders")}</span>
                      <Badge variant="outline">{ordersCount}</Badge>
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
                  {isOverdue && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 text-red-800 dark:text-red-400 text-sm">
                      <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                      <span>
                        {t("Overdue - hasn't paid in")} {data.daysSincePayment} {t("days")}
                        {data.lastPaymentDate
                          ? t(" (last payment {0})", {
                          0: format(new Date(data.lastPaymentDate), "MMM d, yyyy")
                        })
                          : t(" (never made a payment)")}
                      </span>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Overall Status */}
                <div className="bg-gray-50 dark:bg-gray-950 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-2">
                    <UserCog className="h-4 w-4" />
                    {t("Overall Status")}
                  </h4>
                  <div className="text-center">
                    <Badge 
                      variant={hasAnyDebt ? "destructive" : "default"} 
                      className="text-sm px-3 py-1 mb-2"
                    >
                      {hasAnyDebt ? t("Customer Has Debt") : t("Debt-Free Customer")}
                    </Badge>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
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

export default EditCustomerPage;