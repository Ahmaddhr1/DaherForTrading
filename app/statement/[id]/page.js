"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { format } from "date-fns";
import { FileText, Calendar, Loader2 } from "lucide-react";
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

const fetchPublicStatement = async (id) => {
  const res = await fetch(`/api/public/customers/${id}/statement`);
  if (!res.ok) throw new Error("Failed to fetch statement");
  return res.json();
};

const statusConfig = {
  paid: { label: "Paid", color: "bg-green-100 text-green-800" },
  partiallyPaid: { label: "Partially Paid", color: "bg-yellow-100 text-yellow-800" },
  pending: { label: "Pending", color: "bg-red-100 text-red-800" },
};

// Public, unauthenticated, read-only statement view meant for sharing (e.g.
// via a WhatsApp link). No sidebar, no links elsewhere in the app -
// intentionally a dead end.
export default function PublicStatementPage() {
  const { id } = useParams();

  const { data: statement, isLoading, isError } = useQuery({
    queryKey: ["public-statement", id],
    queryFn: () => fetchPublicStatement(id),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (isError || !statement) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-gray-600">This statement link is invalid or no longer available.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { fullName, orders, totals } = statement;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <Card className="shadow-sm border-gray-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-xl">
                <FileText className="h-5 w-5 text-blue-600" />
                Account Statement
              </CardTitle>
            </div>
            <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
              <Calendar className="h-3.5 w-3.5" />
              Generated {format(new Date(), "MMMM d, yyyy")}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-gray-500">Customer</p>
              <p className="font-medium text-gray-900">{fullName}</p>
            </div>

            <Separator />

            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Orders</p>
              {orders.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">No orders on file.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="text-right">Paid</TableHead>
                        <TableHead className="text-right">Remaining</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orders.map((order) => {
                        const status = statusConfig[order.status] || statusConfig.pending;
                        return (
                          <TableRow key={order._id}>
                            <TableCell className="text-gray-600 text-sm whitespace-nowrap">
                              {format(new Date(order.createdAt), "MMM d, yyyy")}
                            </TableCell>
                            <TableCell className="text-right whitespace-nowrap">${order.total.toFixed(3)}</TableCell>
                            <TableCell className="text-right text-green-600 whitespace-nowrap">${order.amountpaid.toFixed(3)}</TableCell>
                            <TableCell className={`text-right whitespace-nowrap ${order.remainingBalance > 0 ? "text-red-600" : ""}`}>
                              ${order.remainingBalance.toFixed(3)}
                            </TableCell>
                            <TableCell className="text-center whitespace-nowrap">
                              <Badge className={status.color}>{status.label}</Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>

            <Separator />

            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Billed</span>
                <span className="font-semibold text-gray-900">${totals.totalAmount.toFixed(3)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total Paid</span>
                <span className="text-green-600 font-medium">${totals.totalPaid.toFixed(3)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 font-medium">Total Remaining (Debt)</span>
                <span className={`font-semibold ${totals.totalRemaining > 0 ? "text-red-600" : "text-gray-900"}`}>
                  ${totals.totalRemaining.toFixed(3)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
