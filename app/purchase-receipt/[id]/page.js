"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { format } from "date-fns";
import { Package, Calendar, Loader2, Receipt } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const fetchPublicPurchase = async (id) => {
  const res = await fetch(`/api/public/purchases/${id}`);
  if (!res.ok) throw new Error("Failed to fetch purchase");
  return res.json();
};

// Public, unauthenticated, read-only purchase receipt meant for sharing
// with a supplier (e.g. via a WhatsApp link). No sidebar, no links
// elsewhere in the app - intentionally a dead end, mirroring
// app/invoice/[id]/page.js.
export default function PublicPurchaseReceiptPage() {
  const { id } = useParams();

  const { data: purchase, isLoading, isError } = useQuery({
    queryKey: ["public-purchase", id],
    queryFn: () => fetchPublicPurchase(id),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (isError || !purchase) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-gray-600">This receipt link is invalid or no longer available.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const lineSubtotal = purchase.unitPrice * purchase.quantity;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-xl mx-auto">
        <Card className="shadow-sm border-gray-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-xl">
                <Receipt className="h-5 w-5 text-blue-600" />
                Purchase Receipt
              </CardTitle>
              <Badge className={purchase.paid ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                {purchase.paid ? "Paid" : "Unpaid"}
              </Badge>
            </div>
            <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
              <Calendar className="h-3.5 w-3.5" />
              {format(new Date(purchase.createdAt), "MMMM d, yyyy 'at' h:mm a")}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-gray-500">Supplier</p>
              <p className="font-medium text-gray-900">{purchase.companyName}</p>
            </div>

            <Separator />

            <div>
              <p className="text-sm font-medium text-gray-700 flex items-center gap-2 mb-2">
                <Package className="h-4 w-4" />
                Item
              </p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-center">Qty</TableHead>
                    <TableHead className="text-center">Discount</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">{purchase.productName}</TableCell>
                    <TableCell className="text-center">
                      {purchase.quantity} x ${purchase.unitPrice.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-center text-amber-700">
                      {purchase.discount ? `-$${purchase.discount.toFixed(2)}` : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      ${(lineSubtotal - (purchase.discount || 0)).toFixed(2)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            <Separator />

            <div className="space-y-2">
              {purchase.discount > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Discount</span>
                  <span className="text-amber-700 font-medium">-${purchase.discount.toFixed(2)}</span>
                </div>
              )}
              {purchase.taxAmount > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Tax ({purchase.taxRate}%)</span>
                  <span className="text-gray-900 font-medium">+${purchase.taxAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-600">Total</span>
                <span className="font-semibold text-gray-900">${purchase.total.toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
