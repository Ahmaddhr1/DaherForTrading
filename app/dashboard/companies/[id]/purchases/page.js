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
import { ArrowLeft, ChevronLeft, ChevronRight, Plus, History, DollarSign, Package } from "lucide-react";
import { TableSkeleton } from "@/components/ui/skeleton-patterns";
import { format } from "date-fns";
import { useRouter, useParams } from "next/navigation";
import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { localDayStartISO, localDayEndISO } from "@/lib/dateUtils";
import ProductPurchaseBreakdown from "./ProductPurchaseBreakdown";

export default function CompanyPurchasesPage() {
  const router = useRouter();
  const { id } = useParams();
  const [page, setPage] = useState(1);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const limit = 10;

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
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="container mx-auto px-4 max-w-5xl">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Company
          </Button>

          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 bg-blue-100 rounded-lg shrink-0">
                <History className="h-6 w-6 text-blue-600" />
              </div>
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">
                  Purchase History {data?.companyName ? `— ${data.companyName}` : ""}
                </h1>
                <p className="text-gray-600 text-sm sm:text-base truncate">All restocking purchases from this company</p>
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
        <Card className="shadow-sm border-gray-200 mb-6">
          <CardContent className="p-4 grid grid-cols-2 gap-4">
            <div className="flex flex-col items-center sm:items-start gap-1">
              <span className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
                <DollarSign className="h-3.5 w-3.5" />
                Total Purchased
              </span>
              <span className="text-lg font-bold text-gray-900">
                ${summary.totalAmount.toLocaleString()}
              </span>
            </div>
            <div className="flex flex-col items-center sm:items-start gap-1">
              <span className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
                <Package className="h-3.5 w-3.5" />
                Units Purchased
              </span>
              <span className="text-lg font-bold text-gray-900">
                {summary.totalQuantity.toLocaleString()}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <FiltersPanel activeCount={activeFilterCount}>
          <Card className="shadow-sm border-gray-200 mb-6">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3 sm:gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2">
                  <span className="text-sm font-medium text-gray-700">From</span>
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
                  <span className="text-sm font-medium text-gray-700">To</span>
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
                    className="w-full sm:w-auto justify-center text-gray-500"
                  >
                    Clear Filters
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </FiltersPanel>

        {isLoading ? (
          <TableSkeleton rows={limit} cols={7} />
        ) : isError ? (
          <div className="text-center py-10 text-red-600">Failed to load purchases.</div>
        ) : (
          <div className="bg-white rounded-lg border">
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchases.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-6">
                      No purchases found.
                    </TableCell>
                  </TableRow>
                ) : (
                  purchases.map((purchase, index) => (
                    <TableRow key={purchase._id}>
                      <TableCell>{(page - 1) * limit + index + 1}</TableCell>
                      <TableCell className="font-medium">{purchase.productName}</TableCell>
                      <TableCell className="text-center">${purchase.unitPrice.toFixed(3)}</TableCell>
                      <TableCell className="text-center">{purchase.quantity}</TableCell>
                      <TableCell className="text-center font-medium">${purchase.total.toFixed(3)}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={purchase.paid ? "default" : "destructive"} className={purchase.paid ? "bg-green-100 text-green-800" : ""}>
                          {purchase.paid ? "Paid" : "Unpaid"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-gray-500 text-sm">
                        {format(new Date(purchase.createdAt), "MMM d, yyyy HH:mm")}
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
                <span className="text-sm text-gray-600">
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
    </div>
  );
}
