"use client";

import React, { useState } from "react";
import {
  Table,
  TableCaption,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { FiltersPanel } from "@/components/ui/filters-panel";
import { ChevronLeft, ChevronRight, Plus, History, DollarSign, Package, Eye, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useHasPermission } from "@/lib/useHasPermission";
import { TableSkeleton } from "@/components/ui/skeleton-patterns";
import { format } from "date-fns";
import { useParams } from "next/navigation";
import axios from "axios";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { localDayStartISO, localDayEndISO } from "@/lib/dateUtils";
import ProductPurchaseBreakdown from "./ProductPurchaseBreakdown";

export default function CompanyPurchasesPage() {
  const { id } = useParams();
  const [page, setPage] = useState(1);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const limit = 10;
  const [payTarget, setPayTarget] = useState(null);
  const queryClient = useQueryClient();
  const { hasPermission: canRecordPurchases } = useHasPermission("canRecordPurchases");

  // Paying an unpaid purchase reduces what we owe this company and records a
  // supplier payment (listed under Payments > Supplier payments).
  const markPaidMutation = useMutation({
    mutationFn: async (purchaseId) => (await axios.put(`/api/purchases/${purchaseId}/markpaid`)).data,
    onSuccess: () => {
      toast.success("Purchase marked as paid - supplier payment recorded");
      setPayTarget(null);
      queryClient.invalidateQueries({ queryKey: ["company-purchases", id] });
      queryClient.invalidateQueries({ queryKey: ["supplier-payments"] });
    },
    onError: (err) => toast.error(err.response?.data?.message || "Failed to mark purchase as paid"),
  });

  const { data, isLoading, isError } = useQuery({
    queryKey: ["company-purchases", id, page, startDate, endDate],
    queryFn: async () => {
      const res = await axios.get(`/api/companies/${id}/purchases`, {
        params: {
          page,
          limit,
          startDate: localDayStartISO(startDate),
          endDate: localDayEndISO(endDate),
        },
      });
      return res.data;
    },
    enabled: !!id,
  });

  const purchases = data?.purchases || [];
  const totalPages = data?.totalPages || 1;
  const summary = data?.summary || { totalAmount: 0, totalQuantity: 0 };
  const activeFilterCount = [startDate, endDate].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-6">
      <div className="container mx-auto px-4">
        <div className="mb-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg shrink-0">
                <History className="h-6 w-6 text-blue-600" />
              </div>
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 truncate">
                  Purchase History {data?.companyName ? `— ${data.companyName}` : ""}
                </h1>
                <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base truncate">All restocking purchases from this company</p>
              </div>
            </div>

            <Link href={`/dashboard/companies/${id}/addpurchase`} className="shrink-0">
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">New Purchase</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Per-product breakdown: amount purchased and expected profit per product */}
        <ProductPurchaseBreakdown companyId={id} />

        {/* Summary for the current filter scope */}
        <Card className="shadow-sm border-gray-200 dark:border-gray-800 mb-6">
          <CardContent className="p-4 grid grid-cols-2 gap-4">
            <div className="flex flex-col items-center sm:items-start gap-1">
              <span className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
                <DollarSign className="h-3.5 w-3.5" />
                Total Purchased
              </span>
              <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
                ${summary.totalAmount.toLocaleString()}
              </span>
            </div>
            <div className="flex flex-col items-center sm:items-start gap-1">
              <span className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
                <Package className="h-3.5 w-3.5" />
                Units Purchased
              </span>
              <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
                {summary.totalQuantity.toLocaleString()}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <FiltersPanel activeCount={activeFilterCount}>
          <Card className="shadow-sm border-gray-200 dark:border-gray-800 mb-6">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3 sm:gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">From</span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      setPage(1);
                    }}
                    className="w-full sm:w-auto border rounded-md text-sm px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">To</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      setPage(1);
                    }}
                    className="w-full sm:w-auto border rounded-md text-sm px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                {(startDate || endDate) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setStartDate("");
                      setEndDate("");
                      setPage(1);
                    }}
                    className="w-full sm:w-auto justify-center text-gray-500 dark:text-gray-400"
                  >
                    Clear Filters
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </FiltersPanel>

        {isLoading ? (
          <TableSkeleton rows={limit} cols={8} />
        ) : isError ? (
          <div className="text-center py-10 text-red-600">Failed to load purchases.</div>
        ) : (
          <div className="bg-white dark:bg-gray-900 rounded-lg border">
            <Table>
              <TableCaption>{purchases.length === 0 ? "No purchases yet." : "Purchase history"}</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px]">#</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-center">Unit Price</TableHead>
                  <TableHead className="text-center">Quantity</TableHead>
                  <TableHead className="text-center">Total</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchases.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-6">
                      No purchases found.
                    </TableCell>
                  </TableRow>
                ) : (
                  purchases.map((purchase, index) => (
                    <TableRow key={purchase._id}>
                      <TableCell>{(page - 1) * limit + index + 1}</TableCell>
                      <TableCell className="font-medium">{purchase.productName}</TableCell>
                      <TableCell className="text-center">${purchase.unitPrice.toFixed(2)}</TableCell>
                      <TableCell className="text-center">{purchase.quantity}</TableCell>
                      <TableCell className="text-center font-medium">${purchase.total.toFixed(2)}</TableCell>
                      <TableCell className="text-center">
                        {purchase.paid ? (
                          <Badge className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400">Paid</Badge>
                        ) : purchase.amountPaid > 0 ? (
                          <div className="flex flex-col items-center gap-0.5">
                            <Badge className="bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300">Partially paid</Badge>
                            <span className="text-[11px] text-gray-500 dark:text-gray-400">
                              ${purchase.amountPaid.toFixed(2)} of ${purchase.total.toFixed(2)}
                            </span>
                          </div>
                        ) : (
                          <Badge variant="destructive">Unpaid</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-gray-500 dark:text-gray-400 text-sm">
                        {format(new Date(purchase.createdAt), "MMM d, yyyy HH:mm")}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {!purchase.paid && canRecordPurchases && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setPayTarget(purchase)}
                              className="flex items-center gap-1 text-green-700 border-green-300 hover:bg-green-50 dark:text-green-400 dark:border-green-900 dark:hover:bg-green-950/40"
                            >
                              <CheckCircle className="h-3.5 w-3.5" />
                              Mark as paid
                            </Button>
                          )}
                          <Link href={`/dashboard/companies/${id}/purchases/${purchase._id}`}>
                            <Button variant="ghost" size="sm" className="flex items-center gap-1">
                              <Eye className="h-3.5 w-3.5" />
                              View
                            </Button>
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 p-4 border-t">
                <Button
                  onClick={() => setPage((p) => p - 1)}
                  disabled={page === 1}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Page {page} of {totalPages}
                </span>
                <Button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page === totalPages}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!payTarget}
        onClose={() => !markPaidMutation.isPending && setPayTarget(null)}
        title="Mark purchase as paid?"
        description={
          payTarget
            ? `Pay ${data?.companyName || "this company"} $${(payTarget.total - (payTarget.amountPaid || 0)).toFixed(2)}${
                payTarget.amountPaid > 0 ? " (the rest still owed)" : ""
              } for ${payTarget.quantity} x ${payTarget.productName}? This reduces what you owe them and records a supplier payment.`
            : ""
        }
        confirmLabel="Mark as Paid"
        variant="default"
        loading={markPaidMutation.isPending}
        onConfirm={() => markPaidMutation.mutate(payTarget._id)}
      />
    </div>
  );
}
