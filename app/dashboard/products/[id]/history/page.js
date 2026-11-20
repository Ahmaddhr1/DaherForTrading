"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableSkeleton } from "@/components/ui/skeleton-patterns";
import {
  History,
  ShoppingCart,
  Truck,
  Wrench,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { localDayStartISO, localDayEndISO } from "@/lib/dateUtils";

const ADJUSTMENT_LABELS = {
  damaged: "Damaged",
  lost: "Lost",
  expired: "Expired",
  correction: "Correction",
  other: "Other",
};

export default function ProductStockHistoryPage() {
  const { id } = useParams();

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const { data, isLoading, isError } = useQuery({
    queryKey: ["product-ledger", id, startDate, endDate, page],
    queryFn: async () => {
      const res = await axios.get(`/api/products/${id}/ledger`, {
        params: {
          startDate: localDayStartISO(startDate),
          endDate: localDayEndISO(endDate),
          page,
          limit: pageSize,
        },
      });
      return res.data;
    },
    enabled: !!id,
  });

  const product = data?.product;
  const events = data?.events || [];
  const totalPages = data?.totalPages || 1;
  const hasDateFilter = startDate || endDate;

  const clearFilter = () => {
    setStartDate("");
    setEndDate("");
    setPage(1);
  };

  const typeBadge = (type) => {
    if (type === "purchase") {
      return (
        <Badge className="bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-400 flex items-center gap-1 w-fit">
          <Truck className="h-3 w-3" /> Purchase
        </Badge>
      );
    }
    if (type === "sale") {
      return (
        <Badge className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 flex items-center gap-1 w-fit">
          <ShoppingCart className="h-3 w-3" /> Sale
        </Badge>
      );
    }
    return (
      <Badge className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 flex items-center gap-1 w-fit">
        <Wrench className="h-3 w-3" /> Adjustment
      </Badge>
    );
  };

  const detail = (e) => {
    const unit = product?.unit || "pcs";
    if (e.type === "purchase") {
      return (
        <div>
          <div>
            {e.quantity} {unit} @ ${e.unitPrice.toFixed(2)}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Total ${e.total.toFixed(2)}
            {e.company ? ` · from ${e.company}` : ""}
          </div>
        </div>
      );
    }
    if (e.type === "sale") {
      return (
        <div>
          <div>
            {e.quantity} {unit} @ ${e.price.toFixed(2)}
            {e.free && (
              <Badge variant="outline" className="ml-1.5 text-[10px] px-1.5 py-0">
                FREE
              </Badge>
            )}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">to {e.customer}</div>
        </div>
      );
    }
    return (
      <div>
        <div>
          {e.delta > 0 ? "+" : ""}
          {e.delta} {unit} ({ADJUSTMENT_LABELS[e.adjustmentType] || e.adjustmentType})
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {e.reason ? `${e.reason} · ` : ""}
          {e.adminName || "unknown"}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-6">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <History className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Stock History{product ? ` — ${product.name}` : ""}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Every purchase, sale, and stock adjustment, in order, with the stock level before and after each one
            </p>
          </div>
        </div>

        <Card className="shadow-sm border-gray-200 dark:border-gray-800 mb-6">
          <CardContent className="p-4 flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2 w-full sm:w-auto">
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
            <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2 w-full sm:w-auto">
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
            {hasDateFilter && (
              <Button variant="ghost" size="sm" onClick={clearFilter} className="text-gray-500 dark:text-gray-400 self-start sm:self-auto">
                Clear
              </Button>
            )}
            {product && (
              <div className="sm:ml-auto text-sm text-gray-600 dark:text-gray-400">
                Current stock: <span className="font-semibold text-gray-900 dark:text-gray-100">{product.quantity} {product.unit}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {isLoading ? (
          <TableSkeleton rows={pageSize} cols={4} />
        ) : isError ? (
          <div className="text-center py-12 text-red-600">Failed to load stock history.</div>
        ) : events.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <History className="h-12 w-12 mx-auto mb-3" />
            <p>No stock movements found{hasDateFilter ? " in this date range" : ""}</p>
          </div>
        ) : (
          <>
            <Card className="shadow-sm border-gray-200 dark:border-gray-800">
              <Table>
                <TableCaption>
                  Starting stock before the earliest recorded event: {data.startingStock} {product?.unit || ""}
                </TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead className="text-center">Stock Before</TableHead>
                    <TableHead className="text-center">Stock After</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map((e) => (
                    <TableRow key={`${e.type}-${e.sourceId}`} className="hover:bg-gray-50 dark:hover:bg-gray-800/60">
                      <TableCell className="text-gray-500 dark:text-gray-400 text-sm whitespace-nowrap">
                        {format(new Date(e.date), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>{typeBadge(e.type)}</TableCell>
                      <TableCell className="text-sm">{detail(e)}</TableCell>
                      <TableCell className="text-center text-gray-600 dark:text-gray-400">{e.stockBefore}</TableCell>
                      <TableCell className="text-center font-medium text-gray-900 dark:text-gray-100">{e.stockAfter}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 pt-4">
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
          </>
        )}
      </div>
    </div>
  );
}
