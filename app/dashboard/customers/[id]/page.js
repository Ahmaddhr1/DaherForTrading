"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { User, Phone, Layers, StickyNote, Pencil, Package, Eye, FileText, PhoneCall, DollarSign, CalendarDays } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeaderSkeleton, FormSkeleton } from "@/components/ui/skeleton-patterns";
import { useT } from "@/lib/i18n/LangProvider";
import { format } from "@/lib/i18n/date";
import { useHasPermission } from "@/lib/useHasPermission";
import { getTierLabel } from "@/lib/priceTiers";
import { whatsappUrl } from "@/lib/whatsapp";

// Read-only customer profile. Editing lives at /dashboard/customers/[id]/edit
// (needs canEditCustomers - see middleware.js); the Edit button only shows
// for admins who have it.
export default function CustomerViewPage() {
  const t = useT();
  const { id } = useParams();
  const { hasPermission: canEdit } = useHasPermission("canEditCustomers");
  const { hasPermission: canCreateOrders } = useHasPermission("canCreateOrders");

  const { data: customer, isLoading, isError } = useQuery({
    queryKey: ["customer", id],
    queryFn: async () => (await axios.get(`/api/customers/${id}`)).data,
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50/30 dark:bg-gray-900/30 py-8">
        <div className="container mx-auto px-4">
          <PageHeaderSkeleton />
          <Card><CardContent className="pt-6"><FormSkeleton fields={4} /></CardContent></Card>
        </div>
      </div>
    );
  }
  if (isError || !customer) {
    return <p className="p-10 text-center text-red-600">{t("Customer not found")}</p>;
  }

  const debt = Number(customer.debt || 0);
  const ordersCount = customer.orders?.length || 0;
  const Field = ({ icon: Icon, label, children }) => (
    <div className="flex items-start gap-3 py-3 border-b border-gray-100 dark:border-gray-800 last:border-0">
      <Icon className="h-4 w-4 mt-0.5 text-gray-400 shrink-0" />
      <div className="min-w-0">
        <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
        <div className="text-gray-900 dark:text-gray-100 break-words">{children}</div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50/30 dark:bg-gray-900/30 py-8">
      <div className="container mx-auto px-4">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg shrink-0">
              <User className="h-6 w-6 text-blue-600" />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 truncate">{customer.fullName}</h1>
              <p className="text-gray-600 dark:text-gray-400 text-sm">{t("Customer profile")}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {canCreateOrders && (
              <Link href={`/dashboard/customers/${id}/addorder`}>
                <Button className="flex items-center gap-2"><Package className="h-4 w-4" />{t("Create Order")}</Button>
              </Link>
            )}
            {canEdit && (
              <Link href={`/dashboard/customers/${id}/edit`}>
                <Button variant="outline" className="flex items-center gap-2"><Pencil className="h-4 w-4" />{t("Edit")}</Button>
              </Link>
            )}
          </div>
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          {customer.phoneNumber && (
            <a href={whatsappUrl(customer.phoneNumber)} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" className="flex items-center gap-2"><PhoneCall className="h-4 w-4" />{t("Contact via WhatsApp")}</Button>
            </a>
          )}
          <Link href={`/dashboard/customers/${id}/orders`}>
            <Button variant="outline" className="flex items-center gap-2"><Eye className="h-4 w-4" />{t("View Orders (")}{ordersCount})</Button>
          </Link>
          <Link href={`/dashboard/customers/${id}/statement`}>
            <Button variant="outline" className="flex items-center gap-2"><FileText className="h-4 w-4" />{t("Statement")}</Button>
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2 shadow-sm border-gray-200 dark:border-gray-800">
            <CardHeader className="pb-2"><CardTitle className="text-lg">{t("Customer Information")}</CardTitle></CardHeader>
            <CardContent>
              <Field icon={User} label={t("Full Name")}>{customer.fullName}</Field>
              <Field icon={Phone} label={t("Phone Number")}><span className="ltr-text">{customer.phoneNumber || "—"}</span></Field>
              <Field icon={Layers} label={t("Price Tier")}>{t(getTierLabel(customer.priceTier))}</Field>
              <Field icon={StickyNote} label={t("Notes")}><span className="whitespace-pre-line">{customer.notes || "—"}</span></Field>
              {customer.createdAt && (
                <Field icon={CalendarDays} label={t("Customer since")}>{format(new Date(customer.createdAt), "MMM d, yyyy")}</Field>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-sm border-gray-200 dark:border-gray-800">
            <CardHeader className="pb-2"><CardTitle className="text-lg">{t("Customer Summary")}</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className={`rounded-lg border p-4 ${debt > 0 ? "border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-900/20" : "border-green-200 bg-green-50 dark:border-green-900/50 dark:bg-green-900/20"}`}>
                <p className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400"><DollarSign className="h-4 w-4" />{t("Amount Owed")}</p>
                <p className={`text-2xl font-bold ${debt > 0 ? "text-red-600 dark:text-red-400" : "text-green-700 dark:text-green-400"}`}>${debt.toLocaleString()}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{debt > 0 ? t("Customer Has Debt") : t("No Outstanding Debt")}</p>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">{t("Total Orders")}</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">{ordersCount}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
