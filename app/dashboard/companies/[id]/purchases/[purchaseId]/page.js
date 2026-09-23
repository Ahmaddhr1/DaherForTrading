"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { format } from "date-fns";
import { Package, Building2, Calendar, Printer, MessageCircle, Receipt, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import PurchaseThermalReceipt from "./PurchaseThermalReceipt";

import {
  Table,
  TableBody,
  TableCaption,
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

const fetchPurchase = async (purchaseId) => {
  const res = await fetch(`/api/purchases/${purchaseId}`);
  if (!res.ok) throw new Error("Failed to fetch purchase");
  return res.json();
};

export default function PurchaseDetailsPage() {
  const { id: companyId, purchaseId } = useParams();

  const { data: purchase, isLoading, isError } = useQuery({
    queryKey: ["purchase", purchaseId],
    queryFn: () => fetchPurchase(purchaseId),
    enabled: !!purchaseId,
  });

  const { data: settings } = useSettings();

  useEffect(() => {
    const handleAfterPrint = () => document.body.classList.remove("printing-thermal");
    window.addEventListener("afterprint", handleAfterPrint);
    return () => window.removeEventListener("afterprint", handleAfterPrint);
  }, []);

  const handlePrintThermal = () => {
    document.body.classList.add("printing-thermal");
    window.print();
  };

  const handleShareWhatsApp = () => {
    const phoneDigits = purchase.company?.phoneNumber?.toString().replace(/\D/g, "");
    const shareUrl = `${window.location.origin}/purchase-receipt/${purchase._id}`;
    const message = `Purchase receipt from ${purchase.company?.name || "us"}: ${shareUrl}`;

    if (!phoneDigits) {
      // No phone on file for this supplier - open WhatsApp's contact picker
      // instead of failing outright.
      window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
      return;
    }

    const waUrl = `https://wa.me/${phoneDigits}?text=${encodeURIComponent(message)}`;
    window.open(waUrl, "_blank", "noopener,noreferrer");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50/30 py-8">
        <div className="container mx-auto px-4 max-w-4xl">
          <PageHeaderSkeleton />
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <TableSkeleton rows={2} cols={4} />
            </div>
            <div className="space-y-6">
              <Skeleton className="h-40 w-full rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isError || !purchase) {
    return (
      <div className="flex justify-center items-center min-h-96">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Purchase</h3>
            <p className="text-gray-600">Unable to load this purchase. Please try again.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const lineSubtotal = purchase.unitPrice * purchase.quantity;

  return (
    <div className="min-h-screen bg-gray-50/30 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="mb-8">
          <Link href={`/dashboard/companies/${companyId}/purchases`}>
            <Button variant="ghost" className="mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-900">
              <ArrowLeft className="h-4 w-4" />
              Back to Purchase History
            </Button>
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-2">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Purchase Receipt</h1>
              <p className="text-gray-600 mt-1">Purchase #{purchase._id}</p>
            </div>
            <Badge className={`px-3 py-1 text-sm font-medium self-start sm:self-auto ${purchase.paid ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
              {purchase.paid ? "Paid" : "Unpaid"}
            </Badge>
          </div>
          <div className="flex items-center text-gray-500 text-sm">
            <Calendar className="h-4 w-4 mr-1" />
            {format(new Date(purchase.createdAt), "EEEE, MMMM d, yyyy 'at' h:mm a")}
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            <Button variant="outline" onClick={() => window.print()} className="flex items-center gap-2">
              <Printer className="h-4 w-4" />
              Print
            </Button>
            <Button variant="outline" onClick={handlePrintThermal} className="flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              Thermal Receipt
            </Button>
            <Button
              onClick={handleShareWhatsApp}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
            >
              <MessageCircle className="h-4 w-4" />
              Share via WhatsApp
            </Button>
          </div>
        </div>

        <PurchaseThermalReceipt purchase={purchase} />

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card className="shadow-sm border-gray-200">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center text-lg">
                  <Package className="h-5 w-5 mr-2 text-blue-600" />
                  Purchase Item
                </CardTitle>
                <CardDescription>Product included in this purchase</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-gray-50/50">
                    <TableRow>
                      <TableHead className="font-semibold text-gray-700">Product</TableHead>
                      <TableHead className="text-center font-semibold text-gray-700">Quantity</TableHead>
                      <TableHead className="text-center font-semibold text-gray-700">Unit Price</TableHead>
                      <TableHead className="text-center font-semibold text-gray-700">Discount</TableHead>
                      <TableHead className="text-right font-semibold text-gray-700">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium text-gray-900">{purchase.productName}</TableCell>
                      <TableCell className="text-center text-gray-600">{purchase.quantity}</TableCell>
                      <TableCell className="text-center text-gray-600">${purchase.unitPrice.toFixed(2)}</TableCell>
                      <TableCell className="text-center text-amber-700">
                        {purchase.discount ? `-$${purchase.discount.toFixed(2)}` : "—"}
                      </TableCell>
                      <TableCell className="text-right font-medium text-gray-900">
                        ${(lineSubtotal - (purchase.discount || 0)).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="shadow-sm border-gray-200">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center text-lg">
                  <Building2 className="h-5 w-5 mr-2 text-blue-600" />
                  Supplier
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-gray-500">Company</p>
                  <p className="text-gray-900">{purchase.company?.name || "Unknown"}</p>
                </div>
                <Separator />
                <div>
                  <p className="text-sm font-medium text-gray-500">Phone Number</p>
                  <p className="text-gray-900">{purchase.company?.phoneNumber || "Not provided"}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-gray-200">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Payment Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium text-gray-900">${lineSubtotal.toFixed(2)}</span>
                </div>
                {purchase.discount > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Discount</span>
                    <span className="text-amber-700 font-medium">-${purchase.discount.toFixed(2)}</span>
                  </div>
                )}
                {purchase.taxAmount > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Tax ({purchase.taxRate}%)</span>
                    <span className="text-gray-900 font-medium">+${purchase.taxAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="text-gray-600 font-medium">Grand Total</span>
                  <span className="font-semibold text-gray-900">${purchase.total.toFixed(2)}</span>
                </div>
                {settings?.dollarRate > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-400">≈</span>
                    <span className="text-gray-500">{formatLL(purchase.total, settings.dollarRate)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between items-center pt-2">
                  <span className="font-semibold text-gray-900">Status</span>
                  <Badge variant="outline" className={purchase.paid ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                    {purchase.paid ? "Paid" : "Unpaid"}
                  </Badge>
                </div>
                {typeof purchase.company?.debt === "number" && (
                  <div className="flex justify-between items-center pt-2 border-t">
                    <span className="text-gray-600">Supplier&apos;s Total Debt</span>
                    <span className={`font-semibold ${purchase.company.debt > 0 ? "text-red-600" : "text-gray-900"}`}>
                      ${purchase.company.debt.toFixed(2)}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
