"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Modal } from "@/components/ui/modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useHasPermission } from "@/lib/useHasPermission";
import axios from "axios";
import { format } from "date-fns";
import { Search, Building2, History, ChevronLeft, ChevronRight, X, CheckCircle, Plus } from "lucide-react";
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
  const [payOpen, setPayOpen] = useState(false);
  const { hasPermission: canRecordPurchases } = useHasPermission("canRecordPurchases");
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
      {canRecordPurchases && (
        <div className="flex justify-end -mt-2 mb-4">
          <Button onClick={() => setPayOpen(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Pay a Supplier
          </Button>
        </div>
      )}

      <Modal
        open={payOpen}
        onClose={() => setPayOpen(false)}
        title="Pay a Supplier"
        description="Record money paid to a company. It's applied to their oldest unpaid purchases first."
        maxWidth="max-w-xl"
      >
        <PaySupplierForm onSuccess={() => setPayOpen(false)} />
      </Modal>

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
                    {p.purchase ? (
                      `${p.purchase.quantity} x ${p.purchase.productName}`
                    ) : p.allocations?.length > 0 ? (
                      <div className="space-y-0.5">
                        {p.allocations.map((a) => (
                          <div key={String(a.purchase)} className="text-xs">
                            {a.productName} · ${a.amount.toLocaleString()}
                          </div>
                        ))}
                      </div>
                    ) : (
                      "Balance payment"
                    )}
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

function PaySupplierForm({ onSuccess }) {
  const queryClient = useQueryClient();
  const [companyId, setCompanyId] = useState("");
  const [amount, setAmount] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Companies we currently owe money to.
  const { data: companies = [], isLoading } = useQuery({
    queryKey: ["companies-owed"],
    queryFn: async () => {
      const res = await axios.get("/api/companies", { params: { all: true, debtFilter: "hasDebt" } });
      return Array.isArray(res.data) ? res.data : [];
    },
  });

  const company = companies.find((c) => c._id === companyId);
  const owed = company?.debt || 0;

  useEffect(() => {
    if (company) setAmount(String(company.debt));
  }, [companyId]); // eslint-disable-line react-hooks/exhaustive-deps

  const value = parseFloat(amount) || 0;
  const valid = !!company && value > 0 && value <= owed + 0.005;

  const mutation = useMutation({
    mutationFn: async () => (await axios.post("/api/supplier-payments", { companyId, amount: value })).data,
    onSuccess: () => {
      toast.success("Supplier payment recorded");
      queryClient.invalidateQueries({ queryKey: ["supplier-payments"] });
      queryClient.invalidateQueries({ queryKey: ["companies-owed"] });
      queryClient.invalidateQueries({ queryKey: ["company-purchases"] });
      setConfirmOpen(false);
      onSuccess();
    },
    onError: (err) => toast.error(err.response?.data?.error || "Failed to record supplier payment"),
  });

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Company</label>
        <select
          value={companyId}
          onChange={(e) => setCompanyId(e.target.value)}
          className="w-full border rounded-md text-sm px-3 py-2 bg-transparent"
          disabled={isLoading}
        >
          <option value="">{isLoading ? "Loading..." : companies.length ? "Select a company you owe" : "You don't owe any company"}</option>
          {companies.map((c) => (
            <option key={c._id} value={c._id}>
              {c.name} — owed ${c.debt.toLocaleString()}
            </option>
          ))}
        </select>
      </div>

      {company && (
        <>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Amount ($)</label>
            <Input type="number" min="0" max={owed} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Defaults to everything you owe them. Enter less for a partial payment.
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-950 rounded-lg p-4 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Still owed after payment</span>
            <span className={`font-bold ${owed - value > 0 ? "text-red-600" : "text-green-600"}`}>
              ${Math.max(0, owed - value).toLocaleString()}
            </span>
          </div>
          <Button className="w-full" disabled={!valid || mutation.isPending} onClick={() => setConfirmOpen(true)}>
            Record Supplier Payment
          </Button>
        </>
      )}

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Record supplier payment?"
        description={`Pay ${company?.name} $${value.toFixed(2)}? It will be applied to their oldest unpaid purchases first.`}
        confirmLabel="Record Payment"
        variant="default"
        loading={mutation.isPending}
        onConfirm={() => mutation.mutate()}
      />
    </div>
  );
}
