"use client";
import { t } from "@/lib/i18n";
import { useT } from "@/lib/i18n/LangProvider";
import { whatsappNumber } from "@/lib/whatsapp";
import { isTouchDevice } from "@/lib/isTouchDevice";
import { applyThermalPageSize } from "@/lib/thermalPageSize";
import DirectPrintButton, { useDirectPrint } from "@/components/DirectPrintButton";
import { useRouter } from "next/navigation";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { format } from "@/lib/i18n/date";
import { User, Package, CreditCard, Calendar, Tag, Printer, MessageCircle, Receipt, RotateCcw, StickyNote } from "lucide-react";
import { toast } from "@/lib/i18n/toast";
import ThermalReceipt from "./ThermalReceipt";
import ProcessReturnModal from "./ProcessReturnModal";
import { useHasPermission } from "@/lib/useHasPermission";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeaderSkeleton, TableSkeleton } from "@/components/ui/skeleton-patterns";
import { useSettings, formatLL } from "@/lib/currency";

const fetchOrder = async (id) => {
  const res = await fetch(`/api/orders/${id}`);
  if (!res.ok) throw new Error("Failed to fetch order");
  return res.json();
};

export default function OrderDetailsPage() {
  const t = useT();
  // Computers with Chrome/Edge print straight to the thermal printer.
  const directPrint = useDirectPrint();
  const router = useRouter();
  const { id } = useParams();

  const { data: order, isLoading, isError } = useQuery({
    queryKey: ["order", id],
    queryFn: () => fetchOrder(id),
    enabled: !!id,
  });

  const { data: settings } = useSettings();
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const { hasPermission: canProcessReturns } = useHasPermission("canProcessReturns");

  const { data: returnsData } = useQuery({
    queryKey: ["order-returns", id],
    queryFn: async () => (await fetch(`/api/orders/${id}/returns`)).json(),
    enabled: !!id,
  });
  const returns = returnsData?.returns || [];

  // Cleans up the thermal-print body class if the user cancels the print
  // dialog instead of completing it.
  useEffect(() => {
    const handleAfterPrint = () => document.body.classList.remove("printing-thermal");
    window.addEventListener("afterprint", handleAfterPrint);
    return () => window.removeEventListener("afterprint", handleAfterPrint);
  }, []);

  const handlePrintThermal = () => {
    if (isTouchDevice()) {
      router.push(`/print/order/${id}`);
      return;
    }
    document.body.classList.add("printing-thermal");
    applyThermalPageSize();
    window.print();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50/30 dark:bg-gray-900/30 py-8">
        <div className="container mx-auto px-4">
          <PageHeaderSkeleton />
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <TableSkeleton rows={4} cols={4} />
            </div>
            <div className="space-y-6">
              <Skeleton className="h-40 w-full rounded-lg" />
              <Skeleton className="h-48 w-full rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isError || !order) {
    return (
      <div className="flex justify-center items-center min-h-96">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <div className="text-red-500 bg-red-50 dark:bg-red-900/20 rounded-full p-3 w-12 h-12 mx-auto mb-4 flex items-center justify-center">
              <Tag className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">{t("Error Loading Order")}</h3>
            <p className="text-gray-600 dark:text-gray-400">{t("Unable to load order details. Please try again.")}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusConfig = {
    paid: { label: "Paid", color: "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400" },
    partiallyPaid: { label: "Partially Paid", color: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400" },
    unpaid: { label: "Unpaid", color: "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400" },
  };

  const status = statusConfig[order.status] || statusConfig.unpaid;

  const handleShareWhatsApp = () => {
    const phoneDigits = whatsappNumber(order.customer?.phoneNumber);
    if (!phoneDigits) {
      toast.error("This customer has no phone number on file");
      return;
    }

    const shareUrl = `${window.location.origin}/invoice/${order._id}`;
    const message = `Hello ${order.customer?.fullName || ""}, here is your invoice: ${shareUrl}`;
    const waUrl = `https://wa.me/${phoneDigits}?text=${encodeURIComponent(message)}`;
    window.open(waUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="min-h-screen bg-gray-50/30 dark:bg-gray-900/30 py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-2">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{t("Order Details")}</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">{t("Order #")}{order._id}</p>

            </div>
            <Badge className={`px-3 py-1 text-sm font-medium ${status.color} self-start sm:self-auto`}>
              {t(status.label)}
            </Badge>

          </div>
          <div className="flex items-center text-gray-500 dark:text-gray-400 text-sm">
            <Calendar className="h-4 w-4 me-1" />
            {format(new Date(order.createdAt), "EEEE, MMMM d, yyyy 'at' h:mm a")}
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {/* Direct (one-click) printing on computers, plus the normal
                thermal print through the print dialog - e.g. for a wired
                printer installed in Windows. */}
            {directPrint && <DirectPrintButton />}
            <Button variant="outline" onClick={handlePrintThermal} className="flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              {t("Thermal Receipt")}
            </Button>
            <Button
              onClick={handleShareWhatsApp}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
            >
              <MessageCircle className="h-4 w-4" />
              {t("Share via WhatsApp")}
            </Button>
            {order.status !== "draft" && canProcessReturns && (
              <Button
                variant="outline"
                onClick={() => setReturnModalOpen(true)}
                className="flex items-center gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                {t("Process Return")}
              </Button>
            )}
          </div>
        </div>

        <ThermalReceipt order={order} />

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {order.notes && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-900/20 px-4 py-3 text-sm text-amber-900 dark:text-amber-100">
                <StickyNote className="h-4 w-4 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium">{t("Notes")}</p>
                  <p dir="auto" className="whitespace-pre-line">{order.notes}</p>
                </div>
              </div>
            )}
            {/* Products Table */}
            <Card className="shadow-sm border-gray-200 dark:border-gray-800">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center text-lg">
                  <Package className="h-5 w-5 me-2 text-blue-600" />
                  {t("Order Items")}
                </CardTitle>
                <CardDescription>{t("Products included in this order")}</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-gray-50/50 dark:bg-gray-900/40">
                    <TableRow>
                      <TableHead className="font-semibold text-gray-700 dark:text-gray-300">{t("Product")}</TableHead>
                      <TableHead className="text-center font-semibold text-gray-700 dark:text-gray-300">{t("Quantity")}</TableHead>
                      <TableHead className="text-center font-semibold text-gray-700 dark:text-gray-300">{t("Unit Price")}</TableHead>
                      <TableHead className="text-center font-semibold text-gray-700 dark:text-gray-300">{t("Discount")}</TableHead>
                      <TableHead className="text-end font-semibold text-gray-700 dark:text-gray-300">{t("Total")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {order.products.map((item, index) => (
                      <TableRow key={item.productId} className={index % 2 === 0 ? "bg-gray-50/30 dark:bg-gray-900/30" : ""}>
                        <TableCell className="font-medium text-gray-900 dark:text-gray-100">{item.name}</TableCell>
                        <TableCell className="text-center text-gray-600 dark:text-gray-400">{item.quantity}</TableCell>
                        <TableCell className="text-center text-gray-600 dark:text-gray-400">
                          ${item.price.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-center text-amber-700">
                          {item.discount ? `-$${item.discount.toFixed(2)}` : "—"}
                        </TableCell>
                        <TableCell className="text-end font-medium text-gray-900 dark:text-gray-100">
                          ${(item.price * item.quantity - (item.discount || 0)).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {returns.length > 0 && (
              <Card className="shadow-sm border-gray-200 dark:border-gray-800">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center text-lg">
                    <RotateCcw className="h-5 w-5 me-2 text-amber-600" />
                    {t("Returns")}
                  </CardTitle>
                  <CardDescription>{t("Stock this customer has sent back from this order")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {returns.map((ret) => (
                    <div
                      key={ret._id}
                      className="flex items-start justify-between gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800"
                    >
                      <div className="min-w-0">
                        <p className="text-sm text-gray-900 dark:text-gray-100">
                          {ret.items.map((i) => `${i.quantity}x ${i.name}`).join(", ")}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {format(new Date(ret.createdAt), "MMM d, yyyy h:mm a")}
                          {ret.reason ? ` · ${ret.reason}` : ""}
                          {!ret.restocked ? t(" · not restocked") : ""}
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-green-600 whitespace-nowrap">
                        -${ret.totalRefundAmount.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Customer Info */}
            <Card className="shadow-sm border-gray-200 dark:border-gray-800">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center text-lg">
                  <User className="h-5 w-5 me-2 text-blue-600" />
                  {t("Customer Information")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{t("Full Name")}</p>
                  <p className="text-gray-900 dark:text-gray-100">{order.customer?.fullName || t("Not provided")}</p>
                </div>
                <Separator />
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{t("Phone Number")}</p>
                  <p className="text-gray-900 dark:text-gray-100">{order.customer?.phoneNumber || t("Not provided")}</p>
                </div>
              </CardContent>
            </Card>

            {/* Payment Summary */}
            <Card className="shadow-sm border-gray-200 dark:border-gray-800">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center text-lg">
                  <CreditCard className="h-5 w-5 me-2 text-blue-600" />
                  {t("Payment Summary")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">{t("Subtotal")}</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    ${order.products.reduce((s, i) => s + i.price * i.quantity, 0).toFixed(2)}
                  </span>
                </div>

                {order.discountTotal > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">{t("Discount")}</span>
                    <span className="text-amber-700 font-medium">-${order.discountTotal.toFixed(2)}</span>
                  </div>
                )}

                {order.taxAmount > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">{t("Tax (")}{order.taxRate}%)</span>
                    <span className="text-gray-900 dark:text-gray-100 font-medium">+${order.taxAmount.toFixed(2)}</span>
                  </div>
                )}

                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="text-gray-600 dark:text-gray-400 font-medium">{t("Grand Total")}</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">${Number(order.total).toFixed(2)}</span>
                </div>
                {settings?.dollarRate > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-400 dark:text-gray-500">≈</span>
                    <span className="text-gray-500 dark:text-gray-400">{formatLL(order.total, settings.dollarRate)}</span>
                  </div>
                )}

                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="text-gray-600 dark:text-gray-400">{t("Amount Paid")}</span>
                  <span className="text-green-600 font-medium">
                    ${Number(order.amountpaid || 0).toFixed(2)}
                  </span>
                </div>

                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="text-gray-600 dark:text-gray-400">{t("Remaining Balance")}</span>
                  <span className={`font-medium ${Number(order.remainingBalance || 0) > 0 ? "text-red-600" : "text-gray-900 dark:text-gray-100"
                    }`}>
                    ${Number(order.remainingBalance || 0).toFixed(2)}
                  </span>
                </div>

                <Separator />

                <div className="flex justify-between items-center pt-2">
                  <span className="font-semibold text-gray-900 dark:text-gray-100">{t("Status")}</span>
                  <Badge variant="outline" className={status.color}>
                    {t(status.label)}
                  </Badge>
                </div>

                {typeof order.customer?.debt === "number" && (
                  <div className="flex justify-between items-center pt-2 border-t">
                    <span className="text-gray-600 dark:text-gray-400">{t("Customer's Total Debt")}</span>
                    <span className={`font-semibold ${order.customer.debt > 0 ? "text-red-600" : "text-gray-900 dark:text-gray-100"}`}>
                      ${order.customer.debt.toFixed(2)}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-gray-200 dark:border-gray-800 text-center">
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            {t("Order management system • Powered by Ahmad Daher")}
          </p>
        </div>
      </div>
      <ProcessReturnModal
        open={returnModalOpen}
        onClose={() => setReturnModalOpen(false)}
        order={order}
      />
    </div>
  );
}