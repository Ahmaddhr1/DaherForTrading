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

const fetchPublicOrder = async (id) => {
  const res = await fetch(`/api/public/orders/${id}`);
  if (!res.ok) throw new Error("Failed to fetch order");
  return res.json();
};

// Public, unauthenticated, read-only invoice view meant for sharing (e.g.
// via a WhatsApp link). No sidebar, no links elsewhere in the app -
// intentionally a dead end.
export default function PublicInvoicePage() {
  const { id } = useParams();

  const { data: order, isLoading, isError } = useQuery({
    queryKey: ["public-order", id],
    queryFn: () => fetchPublicOrder(id),
    enabled: !!id,
  });

  const statusConfig = {
    paid: { label: "Paid", color: "bg-green-100 text-green-800" },
    partiallyPaid: { label: "Partially Paid", color: "bg-yellow-100 text-yellow-800" },
    pending: { label: "Pending", color: "bg-red-100 text-red-800" },
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (isError || !order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-gray-600">This invoice link is invalid or no longer available.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const status = statusConfig[order.status] || statusConfig.pending;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-xl mx-auto">
        <Card className="shadow-sm border-gray-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-xl">
                <Receipt className="h-5 w-5 text-blue-600" />
                Invoice
              </CardTitle>
              <Badge className={status.color}>{status.label}</Badge>
            </div>
            <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
              <Calendar className="h-3.5 w-3.5" />
              {format(new Date(order.createdAt), "MMMM d, yyyy 'at' h:mm a")}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-gray-500">Billed To</p>
              <p className="font-medium text-gray-900">{order.customerName}</p>
            </div>

            <Separator />

            <div>
              <p className="text-sm font-medium text-gray-700 flex items-center gap-2 mb-2">
                <Package className="h-4 w-4" />
                Items
              </p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-center">Qty</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.products.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="text-center">{item.quantity}</TableCell>
                      <TableCell className="text-right">
                        ${(item.price * item.quantity).toFixed(3)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <Separator />

            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Total</span>
                <span className="font-semibold text-gray-900">${order.total.toFixed(3)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Paid</span>
                <span className="text-green-600 font-medium">${order.amountpaid.toFixed(3)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Remaining</span>
                <span className={`font-medium ${order.remainingBalance > 0 ? "text-red-600" : "text-gray-900"}`}>
                  ${order.remainingBalance.toFixed(3)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
