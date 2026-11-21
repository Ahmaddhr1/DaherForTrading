"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { format } from "date-fns";
import { Search, Building2, History, ChevronLeft, ChevronRight, X, CheckCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TableSkeleton } from "@/components/ui/skeleton-patterns";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getTodayDateString, localDayStartISO, localDayEndISO } from "@/lib/dateUtils";

// "Supplier payments" view of the Payments tab: money paid to companies,
// created when an unpaid purchase is marked as paid.
export default function SupplierPaymentsView() {
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);
  const [hasInteracted, setHasInteracted] = useState(false);
  const limit = 10;

  useEffect(() => {
    const t = setTimeout(() => setSearchTerm(searchInput.trim()), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => setPage(1), [searchTerm, startDate, endDate]);

  // Same default as customer payments: today only until a filter is touched.
  const effectiveStart = hasInteracted ? startDate : getTodayDateString();
  const effectiveEnd = hasInteracted ? endDate : getTodayDateString();

  const { data, isLoading, error } = useQuery({
    queryKey: ["supplier-payments", page, searchTerm, effectiveStart, effectiveEnd],
    queryFn: async () =>
      (
        await axios.get("/api/supplier-payments", {
          params: {
            page,
            limit,
            search: searchTerm || undefined,
            startDate: effectiveStart ? localDayStartISO(effectiveStart) : undefined,
            endDate: effectiveEnd ? localDayEndISO(effectiveEnd) : undefined,
          },
        })
      ).data,
  });

  const payments = data?.payments || [];
  const totalPages = data?.totalPages || 1;
  const hasFilters = searchTerm || startDate || endDate;
  const touch = (fn) => (e) => {
    setHasInteracted(true);
    fn(e.target.value);
  };

  return (
    <>
      <Card className="shadow-sm border-gray-200 dark:border-gray-800 mb-6">
        <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
            <History className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            <span className="text-sm font-medium">
              {data?.total || 0} supplier payment{data?.total === 1 ? "" : "s"} matching current filters
            </span>
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Total Paid Out:{" "}
            <span className="font-bold text-violet-600">${(data?.totalPaid || 0).toLocaleString()}</span>
          </div>
        </CardContent>
      </Card>

      {!hasInteracted && (
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Showing today&apos;s supplier payments only. Pick a date range below to see more.
        </p>
      )}

      <Card className="shadow-sm border-gray-200 dark:border-gray-800 mb-6">
        <CardContent className="p-4 flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3">
          <div className="relative w-full sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search by company name..."
              value={searchInput}
              onChange={touch(setSearchInput)}
              className="pl-10"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">From</span>
            <input type="date" value={startDate} onChange={touch(setStartDate)} className="border rounded-md text-sm px-2 py-1.5 bg-transparent" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">To</span>
            <input type="date" value={endDate} onChange={touch(setEndDate)} className="border rounded-md text-sm px-2 py-1.5 bg-transparent" />
          </div>
          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setHasInteracted(true);
                setSearchInput("");
                setStartDate("");
                setEndDate("");
              }}
              className="flex items-center gap-1 text-gray-500"
            >
              <X className="h-3 w-3" />
              Clear Filters
            </Button>
          )}
        </CardContent>
      </Card>

      {isLoading ? (
        <TableSkeleton rows={limit} cols={6} />
      ) : error ? (
        <Card>
          <CardContent className="pt-6 text-center text-red-500">Failed to load supplier payments.</CardContent>
        </Card>
      ) : payments.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center">
            <CheckCircle className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400 text-lg mb-1">No supplier payments found</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Mark an unpaid purchase as paid from a company&apos;s purchase history to record one.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="shadow-sm border-gray-200 dark:border-gray-800">
          <Table>
            <TableCaption>Supplier payment history</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>For</TableHead>
                <TableHead className="text-center">Amount Paid</TableHead>
                <TableHead className="text-center">Owed Before</TableHead>
                <TableHead className="text-center">Owed After</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((p, i) => (
                <TableRow key={p._id}>
                  <TableCell className="text-gray-500 dark:text-gray-400">{(page - 1) * limit + i + 1}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 font-medium text-gray-900 dark:text-gray-100">
                      <Building2 className="h-4 w-4 text-violet-500" />
                      {p.company ? (
                        <Link href={`/dashboard/companies/${p.company._id}/purchases`} className="hover:underline">
                          {p.company.name}
                        </Link>
                      ) : (
                        "Deleted Company"
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-gray-600 dark:text-gray-400">
                    {p.purchase ? `${p.purchase.quantity} x ${p.purchase.productName}` : "—"}
                  </TableCell>
                  <TableCell className="text-center font-semibold text-violet-600">
                    -${p.amount.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-center text-gray-600 dark:text-gray-400">
                    ${p.previousDebt.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      variant={p.newDebt > 0 ? "destructive" : "default"}
                      className={p.newDebt === 0 ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400" : ""}
                    >
                      ${p.newDebt.toLocaleString()}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-gray-500 dark:text-gray-400">
                    {format(new Date(p.createdAt), "MMM d, yyyy HH:mm")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 p-4 border-t">
              <Button onClick={() => setPage((x) => x - 1)} disabled={page === 1} variant="outline" size="sm">
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Page {page} of {totalPages}
              </span>
              <Button onClick={() => setPage((x) => x + 1)} disabled={page === totalPages} variant="outline" size="sm">
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </Card>
      )}
    </>
  );
}
