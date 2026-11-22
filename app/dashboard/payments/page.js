// app/dashboard/payments/page.jsx
"use client";
import { t } from "@/lib/i18n";
import { useT } from "@/lib/i18n/LangProvider";

import React, { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "@/lib/i18n/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { TableSkeleton } from "@/components/ui/skeleton-patterns";
import { FiltersPanel } from "@/components/ui/filters-panel";
import { getTodayDateString, localDayStartISO, localDayEndISO } from "@/lib/dateUtils";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Search,
  User,
  Phone,
  Wallet,
  Loader2,
  CheckCircle,
  Plus,
  Filter,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  X,
  History,
} from "lucide-react";
import { format } from "@/lib/i18n/date";
import { useHasPermission } from "@/lib/useHasPermission";
import Link from "next/link";
import SupplierPaymentsView from "@/components/payments/SupplierPaymentsView";

const SORT_OPTIONS = [
  { value: "newest", label: "Newest First" },
  { value: "oldest", label: "Oldest First" },
  { value: "amountDesc", label: "Amount: High to Low" },
  { value: "amountAsc", label: "Amount: Low to High" },
];

const PAGE_SIZE_OPTIONS = [10, 20, 50];

export default function PaymentsPage() {
  const t = useT();
  // History filters
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  // Stays false until the user actually touches a filter. While false, the
  // list is scoped to today behind the scenes (effectiveStartDate/EndDate
  // below) without that showing up as an "active filter" - the date boxes
  // themselves stay empty and Clear Filters stays hidden.
  const [hasInteracted, setHasInteracted] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  // "customers" = payments collected from customers (manual + from orders);
  // "suppliers" = payments made to companies when a purchase is marked paid.
  const [view, setView] = useState("customers");
  const { hasPermission: canManagePayments } = useHasPermission("canManagePayments");

  const queryClient = useQueryClient();

  const effectiveStartDate = hasInteracted ? startDate : getTodayDateString();
  const effectiveEndDate = hasInteracted ? endDate : getTodayDateString();

  const { data, isLoading, error } = useQuery({
    queryKey: ["payments-history", currentPage, pageSize, searchTerm, effectiveStartDate, effectiveEndDate, sortBy],
    queryFn: async () => {
      const params = {
        page: currentPage,
        limit: pageSize,
        search: searchTerm || undefined,
        startDate: localDayStartISO(effectiveStartDate),
        endDate: localDayEndISO(effectiveEndDate),
        sort: sortBy,
      };
      Object.keys(params).forEach((key) => params[key] === undefined && delete params[key]);

      const res = await axios.get("/api/payments", { params });
      return res.data;
    },
  });

  // Debounce the raw typed input before it drives the request.
  useEffect(() => {
    const timer = setTimeout(() => setSearchTerm(searchInput), 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, effectiveStartDate, effectiveEndDate, sortBy, pageSize]);

  useEffect(() => {
    if (error) toast.error("Failed to load payment history");
  }, [error]);

  const handleSearchInputChange = (value) => {
    setHasInteracted(true);
    setSearchInput(value);
  };

  const handleStartDateChange = (value) => {
    setHasInteracted(true);
    setStartDate(value);
  };

  const handleEndDateChange = (value) => {
    setHasInteracted(true);
    setEndDate(value);
  };

  const handleSortChange = (value) => {
    setHasInteracted(true);
    setSortBy(value);
  };

  const handleClearFilters = () => {
    setHasInteracted(true);
    setSearchInput("");
    setSearchTerm("");
    setStartDate("");
    setEndDate("");
    setSortBy("newest");
  };

  const handlePaymentRecorded = () => {
    setIsModalOpen(false);
    queryClient.invalidateQueries(["payments-history"]);
    queryClient.invalidateQueries(["customers"]);
  };

  const payments = data?.payments || [];
  const totalPages = data?.totalPages || 1;
  const totalCount = data?.total || 0;
  const totalCollected = data?.totalCollected || 0;
  const hasActiveFilters = searchTerm || startDate || endDate || sortBy !== "newest";
  const activeFilterCount = [searchTerm, startDate, endDate, sortBy !== "newest" ? sortBy : ""].filter(
    Boolean
  ).length;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-6">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg shrink-0">
                <Wallet className="h-6 w-6 text-blue-600" />
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 truncate">{t("Payments")}</h1>
                <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base truncate">
                  {view === "suppliers" ? t("Payments made to your companies (suppliers)") : t("Payment history across all customers")}
                </p>
              </div>
            </div>

            {canManagePayments && view === "customers" && (
              <Button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 shrink-0">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">{t("Make a Payment")}</span>
              </Button>
            )}
          </div>
        </div>

        {/* Customers / Suppliers switch */}
        <div className="inline-flex rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-1 mb-6">
          {[
            { value: "customers", label: "Customer payments" },
            { value: "suppliers", label: "Supplier payments" },
          ].map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setView(opt.value)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                view === opt.value
                  ? "bg-primary text-primary-foreground"
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              }`}
            >
              {t(opt.label)}
            </button>
          ))}
        </div>

        {view === "suppliers" ? (
          <SupplierPaymentsView />
        ) : (
        <>
        {/* Summary */}
        <Card className="shadow-sm border-gray-200 dark:border-gray-800 mb-6">
          <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
              <History className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              <span className="text-sm font-medium">
                {totalCount} {t("payment")}{totalCount === 1 ? "" : t("s")} {t("matching current filters")}
              </span>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {t("Total Collected:")}{" "}
              <span className="font-bold text-green-600">${totalCollected.toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>

        {!hasInteracted && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            {t("Showing today's payments only. Pick a date range below to see more.")}
          </p>
        )}

        {/* Filters */}
        <FiltersPanel activeCount={activeFilterCount}>
          <Card className="shadow-sm border-gray-200 dark:border-gray-800 mb-6">
            <CardContent className="p-4 space-y-4">
              <div className="relative max-w-md">
                <Search className="absolute start-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 h-4 w-4" />
                <Input
                  type="text"
                  placeholder={t("Search by customer name...")}
                  value={searchInput}
                  onChange={(e) => handleSearchInputChange(e.target.value)}
                  className="ps-10"
                />
              </div>

              <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3 sm:gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2">
                  <span className="flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
                    <Filter className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                    {t("From")}
                  </span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => handleStartDateChange(e.target.value)}
                    className="w-full sm:w-auto border rounded-md text-sm px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t("To")}</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => handleEndDateChange(e.target.value)}
                    className="w-full sm:w-auto border rounded-md text-sm px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2">
                  <span className="flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
                    <ArrowUpDown className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                    {t("Sort by")}
                  </span>
                  <select
                    value={sortBy}
                    onChange={(e) => handleSortChange(e.target.value)}
                    className="w-full sm:w-auto border rounded-md text-sm px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {SORT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {t(option.label)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t("Per page")}</span>
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(parseInt(e.target.value))}
                    className="w-full sm:w-auto border rounded-md text-sm px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {PAGE_SIZE_OPTIONS.map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </select>
                </div>

                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearFilters}
                    className="flex items-center justify-center gap-1 text-gray-500 dark:text-gray-400 w-full sm:w-auto"
                  >
                    <X className="h-3 w-3" />
                    {t("Clear Filters")}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </FiltersPanel>

        {/* History Table */}
        {isLoading ? (
          <TableSkeleton rows={pageSize} cols={6} />
        ) : error ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="text-red-500 text-lg mb-2">{t("Error")}</div>
              <p className="text-gray-600 dark:text-gray-400">{t("Failed to load payment history.")}</p>
            </CardContent>
          </Card>
        ) : payments.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <CheckCircle className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400 text-lg mb-2">{t("No payments found")}</p>
              {hasActiveFilters && (
                <Button variant="outline" onClick={handleClearFilters}>
                  {t("Clear Filters")}
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="shadow-sm border-gray-200 dark:border-gray-800">
            <Table>
              <TableCaption>{t("Payment history")}</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>{t("Customer")}</TableHead>
                  <TableHead className="text-center">{t("Amount Paid")}</TableHead>
                  <TableHead className="text-center">{t("Debt Before")}</TableHead>
                  <TableHead className="text-center">{t("Debt After")}</TableHead>
                  <TableHead>{t("Source")}</TableHead>
                  <TableHead>{t("Date")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment, index) => (
                  <TableRow key={payment._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/60">
                    <TableCell className="font-medium text-gray-500 dark:text-gray-400">
                      {(currentPage - 1) * pageSize + index + 1}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        {payment.customer?.fullName || t("Deleted Customer")}
                      </div>
                      {payment.customer?.phoneNumber && (
                        <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {payment.customer.phoneNumber}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-center font-semibold text-green-600">
                      +${payment.amount.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-center text-gray-600 dark:text-gray-400">
                      ${payment.previousDebt.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={payment.newDebt > 0 ? "destructive" : "default"} className={payment.newDebt === 0 ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400" : ""}>
                        ${payment.newDebt.toLocaleString()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {payment.order ? (
                        <Link
                          href={`/dashboard/orders/${payment.order}`}
                          className="inline-flex items-center rounded-md bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 text-xs font-medium text-blue-700 dark:text-blue-300 hover:underline"
                        >
                          {t("Order #")}{String(payment.order).slice(-6).toUpperCase()}
                        </Link>
                      ) : (
                        <span className="text-xs text-gray-500 dark:text-gray-400">{t("Manual payment")}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-gray-500 dark:text-gray-400 text-sm">
                      {format(new Date(payment.createdAt), "MMM d, yyyy HH:mm")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 p-4 border-t">
                <Button
                  onClick={() => setCurrentPage((p) => p - 1)}
                  disabled={currentPage === 1}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <ChevronLeft className="rtl-flip h-4 w-4" />
                  {t("Previous")}
                </Button>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {t("Page")} {currentPage} {t("of")} {totalPages}
                </span>
                <Button
                  onClick={() => setCurrentPage((p) => p + 1)}
                  disabled={currentPage === totalPages}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  {t("Next")}
                  <ChevronRight className="rtl-flip h-4 w-4" />
                </Button>
              </div>
            )}
          </Card>
        )}
        </>
        )}
      </div>

      {/* Make a Payment Modal */}
      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={t("Make a Payment")}
        description={t("Search for a customer and record a payment against their debt")}
        maxWidth="max-w-xl"
      >
        <MakePaymentForm onSuccess={handlePaymentRecorded} />
      </Modal>
    </div>
  );
}

function MakePaymentForm({ onSuccess }) {
  const t = useT();
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [amount, setAmount] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Debounce the raw typed input before it drives the request.
  useEffect(() => {
    const timer = setTimeout(() => setSearchTerm(searchInput), 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const { data: searchData, isLoading: searching } = useQuery({
    queryKey: ["payments-customer-search", searchTerm],
    queryFn: async () => {
      const res = await axios.get("/api/customers", {
        params: { search: searchTerm, limit: 8, sort: "nameAsc" },
      });
      return res.data;
    },
    enabled: searchTerm.trim().length > 0 && !selectedCustomer,
  });

  const { data: customerData } = useQuery({
    queryKey: ["customer", selectedCustomer?._id],
    queryFn: async () => {
      const res = await axios.get(`/api/customers/${selectedCustomer._id}`);
      return res.data;
    },
    enabled: !!selectedCustomer?._id,
  });

  const currentDebt = customerData?.debt ?? selectedCustomer?.debt ?? 0;

  useEffect(() => {
    if (selectedCustomer) {
      setAmount(currentDebt > 0 ? String(currentDebt) : "");
    }
  }, [selectedCustomer?._id, currentDebt]);

  const paymentMutation = useMutation({
    mutationFn: async () => {
      const res = await axios.post("/api/payments", {
        customerId: selectedCustomer._id,
        amount: parseFloat(amount),
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success("Payment recorded successfully");
      onSuccess();
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || "Failed to record payment");
    },
  });

  const paymentAmount = parseFloat(amount) || 0;
  const remaining = Math.max(0, currentDebt - paymentAmount);
  const isValidAmount = paymentAmount > 0 && paymentAmount <= currentDebt;

  const handleSelectCustomer = (customer) => {
    setSelectedCustomer(customer);
    setSearchInput("");
    setSearchTerm("");
  };

  const handleClearCustomer = () => {
    setSelectedCustomer(null);
    setAmount("");
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedCustomer) {
      toast.error("Select a customer first");
      return;
    }
    if (!isValidAmount) {
      toast.error("Enter a valid payment amount (up to the current debt)");
      return;
    }
    setConfirmOpen(true);
  };

  const confirmSubmit = () => {
    paymentMutation.mutate(undefined, { onSuccess: () => setConfirmOpen(false) });
  };

  const customers = searchData?.customers || [];
  const isSearchPending = searchInput.trim() !== searchTerm.trim();

  return (
    <div className="space-y-4">
      {selectedCustomer ? (
        <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-900/50 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <User className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-900 dark:text-gray-100">{selectedCustomer.fullName}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                <Phone className="h-3 w-3" />
                {selectedCustomer.phoneNumber}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleClearCustomer}>
            <X className="h-4 w-4 me-1" />
            {t("Change")}
          </Button>
        </div>
      ) : (
        <div className="relative">
          <Search className="absolute start-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 h-4 w-4" />
          <Input
            type="text"
            placeholder={t("Search customers by name...")}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="ps-10"
            autoFocus
          />

          {searchInput.trim().length > 0 && (
            <div className="mt-2 border rounded-lg divide-y max-h-64 overflow-y-auto">
              {(searching || isSearchPending) && (
                <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                </div>
              )}
              {!searching && !isSearchPending && customers.length === 0 && (
                <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">{t("No customers found")}</div>
              )}
              {!searching && !isSearchPending &&
                customers.map((customer) => (
                  <button
                    key={customer._id}
                    type="button"
                    onClick={() => handleSelectCustomer(customer)}
                    className="w-full flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-800/60 text-start"
                  >
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">{customer.fullName}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{customer.phoneNumber}</p>
                    </div>
                    <Badge variant={customer.debt > 0 ? "destructive" : "outline"}>
                      ${customer.debt?.toLocaleString() || 0}
                    </Badge>
                  </button>
                ))}
            </div>
          )}
        </div>
      )}

      {selectedCustomer && (
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t("Current debt:")} <span className="font-semibold text-red-600">${currentDebt.toLocaleString()}</span>
          </p>

          {currentDebt <= 0 ? (
            <div className="text-center py-6 text-green-600 flex flex-col items-center gap-2">
              <CheckCircle className="h-8 w-8" />
              <p className="font-medium">{t("This customer has no outstanding debt.")}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t("Payment Amount ($)")}</label>
                <Input
                  type="number"
                  min="0"
                  max={currentDebt}
                  step="0.001"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {t(
                    "Defaults to the full outstanding debt. Enter a smaller amount for a partial payment."
                  )}
                </p>
              </div>

              <div className="bg-gray-50 dark:bg-gray-950 rounded-lg p-4 flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t("Remaining After Payment")}</span>
                <span className={`font-bold ${remaining > 0 ? "text-red-600" : "text-green-600"}`}>
                  ${remaining.toLocaleString()}
                </span>
              </div>

              <Button
                type="submit"
                disabled={paymentMutation.isPending || !isValidAmount}
                className="w-full"
              >
                {paymentMutation.isPending ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t("Recording Payment...")}
                  </span>
                ) : (
                  t("Record Payment")
                )}
              </Button>
            </form>
          )}
        </div>
      )}
      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title={t("Record payment?")}
        description={t("Record a payment of ${0} for {1}?", {
          0: paymentAmount.toFixed(2),
          1: selectedCustomer?.fullName
        })}
        confirmLabel={t("Record Payment")}
        variant="default"
        onConfirm={confirmSubmit}
        loading={paymentMutation.isPending}
      />
    </div>
  );
}
