// app/dashboard/payments/page.jsx
"use client";

import React, { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
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
import { format } from "date-fns";

const SORT_OPTIONS = [
  { value: "newest", label: "Newest First" },
  { value: "oldest", label: "Oldest First" },
  { value: "amountDesc", label: "Amount: High to Low" },
  { value: "amountAsc", label: "Amount: Low to High" },
];

const PAGE_SIZE_OPTIONS = [10, 20, 50];

export default function PaymentsPage() {
  // History filters
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState(getTodayDateString());
  const [endDate, setEndDate] = useState(getTodayDateString());
  const [sortBy, setSortBy] = useState("newest");
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const [isModalOpen, setIsModalOpen] = useState(false);

  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["payments-history", currentPage, pageSize, searchTerm, startDate, endDate, sortBy],
    queryFn: async () => {
      const params = {
        page: currentPage,
        limit: pageSize,
        search: searchTerm || undefined,
        startDate: localDayStartISO(startDate),
        endDate: localDayEndISO(endDate),
        sort: sortBy,
      };
      Object.keys(params).forEach((key) => params[key] === undefined && delete params[key]);

      const res = await axios.get("/api/payments", { params });
      return res.data;
    },
  });

  useEffect(() => {
    const timer = setTimeout(() => setCurrentPage(1), 500);
    return () => clearTimeout(timer);
  }, [searchTerm, startDate, endDate, sortBy, pageSize]);

  useEffect(() => {
    if (error) toast.error("Failed to load payment history");
  }, [error]);

  const handleClearFilters = () => {
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
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 bg-blue-100 rounded-lg shrink-0">
                <Wallet className="h-6 w-6 text-blue-600" />
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 truncate">Payments</h1>
                <p className="text-gray-600 text-sm sm:text-base truncate">Payment history across all customers</p>
              </div>
            </div>

            <Button onClick={() => setIsModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2 shrink-0">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Make a Payment</span>
            </Button>
          </div>
        </div>

        {/* Summary */}
        <Card className="shadow-sm border-gray-200 mb-6">
          <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-2 text-gray-700">
              <History className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium">
                {totalCount} payment{totalCount === 1 ? "" : "s"} matching current filters
              </span>
            </div>
            <div className="text-sm text-gray-600">
              Total Collected:{" "}
              <span className="font-bold text-green-600">${totalCollected.toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <FiltersPanel activeCount={activeFilterCount}>
          <Card className="shadow-sm border-gray-200 mb-6">
            <CardContent className="p-4 space-y-4">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  type="text"
                  placeholder="Search by customer name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Filter className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">From:</span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="border rounded-md text-sm px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">To:</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="border rounded-md text-sm px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <ArrowUpDown className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">Sort by:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="border rounded-md text-sm px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {SORT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">Per page:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(parseInt(e.target.value))}
                    className="border rounded-md text-sm px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {PAGE_SIZE_OPTIONS.map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </select>
                </div>

                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={handleClearFilters} className="flex items-center gap-1 text-gray-500">
                    <X className="h-3 w-3" />
                    Clear Filters
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
              <div className="text-red-500 text-lg mb-2">Error</div>
              <p className="text-gray-600">Failed to load payment history.</p>
            </CardContent>
          </Card>
        ) : payments.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <CheckCircle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-lg mb-2">No payments found</p>
              {hasActiveFilters && (
                <Button variant="outline" onClick={handleClearFilters}>
                  Clear Filters
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="shadow-sm border-gray-200">
            <Table>
              <TableCaption>Payment history</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-center">Amount Paid</TableHead>
                  <TableHead className="text-center">Debt Before</TableHead>
                  <TableHead className="text-center">Debt After</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment, index) => (
                  <TableRow key={payment._id} className="hover:bg-gray-50">
                    <TableCell className="font-medium text-gray-500">
                      {(currentPage - 1) * pageSize + index + 1}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-gray-900">
                        {payment.customer?.fullName || "Deleted Customer"}
                      </div>
                      {payment.customer?.phoneNumber && (
                        <div className="text-sm text-gray-500 flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {payment.customer.phoneNumber}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-center font-semibold text-green-600">
                      +${payment.amount.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-center text-gray-600">
                      ${payment.previousDebt.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={payment.newDebt > 0 ? "destructive" : "default"} className={payment.newDebt === 0 ? "bg-green-100 text-green-800" : ""}>
                        ${payment.newDebt.toLocaleString()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-gray-500 text-sm">
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
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <span className="text-sm text-gray-600">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  onClick={() => setCurrentPage((p) => p + 1)}
                  disabled={currentPage === totalPages}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </Card>
        )}
      </div>

      {/* Make a Payment Modal */}
      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Make a Payment"
        description="Search for a customer and record a payment against their debt"
        maxWidth="max-w-xl"
      >
        <MakePaymentForm onSuccess={handlePaymentRecorded} />
      </Modal>
    </div>
  );
}

function MakePaymentForm({ onSuccess }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [amount, setAmount] = useState("");

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
    paymentMutation.mutate();
  };

  const customers = searchData?.customers || [];

  return (
    <div className="space-y-4">
      {selectedCustomer ? (
        <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
              <User className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">{selectedCustomer.fullName}</p>
              <p className="text-sm text-gray-600 flex items-center gap-1">
                <Phone className="h-3 w-3" />
                {selectedCustomer.phoneNumber}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleClearCustomer}>
            <X className="h-4 w-4 mr-1" />
            Change
          </Button>
        </div>
      ) : (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            type="text"
            placeholder="Search customers by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            autoFocus
          />

          {searchTerm.trim().length > 0 && (
            <div className="mt-2 border rounded-lg divide-y max-h-64 overflow-y-auto">
              {searching && (
                <div className="p-4 text-center text-gray-500">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                </div>
              )}
              {!searching && customers.length === 0 && (
                <div className="p-4 text-center text-gray-500 text-sm">No customers found</div>
              )}
              {!searching &&
                customers.map((customer) => (
                  <button
                    key={customer._id}
                    type="button"
                    onClick={() => handleSelectCustomer(customer)}
                    className="w-full flex items-center justify-between p-3 hover:bg-gray-50 text-left"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{customer.fullName}</p>
                      <p className="text-sm text-gray-500">{customer.phoneNumber}</p>
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
          <p className="text-sm text-gray-600">
            Current debt: <span className="font-semibold text-red-600">${currentDebt.toLocaleString()}</span>
          </p>

          {currentDebt <= 0 ? (
            <div className="text-center py-6 text-green-600 flex flex-col items-center gap-2">
              <CheckCircle className="h-8 w-8" />
              <p className="font-medium">This customer has no outstanding debt.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Payment Amount ($)</label>
                <Input
                  type="number"
                  min="0"
                  max={currentDebt}
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
                <p className="text-xs text-gray-500">
                  Defaults to the full outstanding debt. Enter a smaller amount for a partial payment.
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Remaining After Payment</span>
                <span className={`font-bold ${remaining > 0 ? "text-red-600" : "text-green-600"}`}>
                  ${remaining.toLocaleString()}
                </span>
              </div>

              <Button
                type="submit"
                disabled={paymentMutation.isPending || !isValidAmount}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                {paymentMutation.isPending ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Recording Payment...
                  </span>
                ) : (
                  "Record Payment"
                )}
              </Button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
