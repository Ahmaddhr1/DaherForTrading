// app/dashboard/customers/page.jsx
"use client";
import { t } from "@/lib/i18n";
import { useT } from "@/lib/i18n/LangProvider";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "@/lib/i18n/toast";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getTierLabel } from "@/lib/priceTiers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CardGridSkeleton } from "@/components/ui/skeleton-patterns";
import { FiltersPanel } from "@/components/ui/filters-panel";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useHasPermission } from "@/lib/useHasPermission";
import {
  Search,
  User,
  Trash2,
  Phone,
  Users,
  ChevronLeft,
  ChevronRight,
  Filter,
  DollarSign,
  CheckCircle,
  ArrowUpDown,
  Trophy,
  Plus,
} from "lucide-react";

const SORT_OPTIONS = [
  { value: "newest", label: "Newest First" },
  { value: "oldest", label: "Oldest First" },
  { value: "debtDesc", label: "Debt: High to Low" },
  { value: "debtAsc", label: "Debt: Low to High" },
  { value: "nameAsc", label: "Name: A to Z" },
  { value: "nameDesc", label: "Name: Z to A" },
];

const PAGE_SIZE_OPTIONS = [10, 20, 50];

// "Rami's Hardware" -> "RH"
const initials = (name = "") =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("") || "?";

export default function CustomersPage() {
  const t = useT();
  const router = useRouter();
  // State for search, pagination, sorting and filters
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [debtFilter, setDebtFilter] = useState("all"); // "all", "hasDebt", "noDebt"
  const [sortBy, setSortBy] = useState("newest");
  const queryClient = useQueryClient();
  const { hasPermission: canDelete } = useHasPermission("canDelete");
  const { hasPermission: canCreateCustomers } = useHasPermission("canCreateCustomers");

  // Fetch customers data with filters
  const { data, isLoading, error } = useQuery({
    queryKey: ["customers", currentPage, pageSize, searchTerm, debtFilter, sortBy],
    queryFn: async () => {
      const params = {
        page: currentPage,
        limit: pageSize,
        search: searchTerm,
        sort: sortBy,
        debtFilter: debtFilter !== "all" ? debtFilter : undefined,
      };

      // Remove undefined parameters
      Object.keys(params).forEach((key) => params[key] === undefined && delete params[key]);

      const response = await axios.get("/api/customers", { params });
      return response.data;
    },
  });

  // Delete customer mutation
  const deleteMutation = useMutation({
    mutationFn: async (customerId) => {
      await axios.delete(`/api/customers/${customerId}`);
    },
    onSuccess: () => {
      toast.success("Customer deleted successfully");
      queryClient.invalidateQueries(["customers"]);
    },
    onError: () => {
      toast.error("Failed to delete customer");
    },
  });

  // Debounce the raw typed input before it drives the request.
  useEffect(() => {
    const timer = setTimeout(() => setSearchTerm(searchInput), 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, debtFilter, sortBy, pageSize]);

  // Show error message if something went wrong
  useEffect(() => {
    if (error) {
      toast.error("Failed to load customers");
    }
  }, [error]);

  // Handle delete customer
  const [deleteTarget, setDeleteTarget] = useState(null);

  const confirmDelete = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget._id, { onSuccess: () => setDeleteTarget(null) });
  };

  const handleShowTopDebtors = () => {
    setSortBy("debtDesc");
    setDebtFilter("hasDebt");
    setPageSize(10);
    setCurrentPage(1);
  };

  // Extract data from response
  const customers = data?.customers || [];
  const totalPages = data?.totalPages || 1;
  const totalCount = data?.total || 0;

  const isTopDebtorsView = sortBy === "debtDesc" && debtFilter === "hasDebt" && pageSize === 10;
  const activeFilterCount = [
    searchTerm,
    debtFilter !== "all" ? debtFilter : "",
    sortBy !== "newest" ? sortBy : "",
  ].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-6">
      <div className="container mx-auto px-4">

        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{t("Customers")}</h1>
                <p className="text-gray-600 dark:text-gray-400">{t("Manage your customers")}</p>
              </div>
            </div>

            {canCreateCustomers && (
              <Link href="/dashboard/customers/create">
                <Button className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">{t("Add Customer")}</span>
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Search and Filter Section */}
        <FiltersPanel activeCount={activeFilterCount}>
          <div className="mb-6 space-y-4">
            {/* Search Bar */}
            <div className="relative max-w-md">
              <Search className="absolute start-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 h-4 w-4" />
              <Input
                type="text"
                placeholder={t("Search customers by name...")}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="ps-10"
              />
            </div>

            {/* Debt Filter Buttons */}
            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-row sm:flex-wrap">
              <div className="col-span-2 flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t("Filter by Debt:")}</span>
              </div>

              <Button
                data-keep-label
                variant={debtFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setDebtFilter("all")}
                className="flex items-center justify-center gap-2 w-full sm:w-auto"
              >
                <Users className="h-4 w-4" />
                {t("All Customers")}
              </Button>

              <Button
                data-keep-label
                variant={debtFilter === "hasDebt" ? "default" : "outline"}
                size="sm"
                onClick={() => setDebtFilter("hasDebt")}
                className="flex items-center justify-center gap-2 w-full sm:w-auto"
              >
                <DollarSign className="h-4 w-4" />
                {t("Has Debt")}
              </Button>

              <Button
                data-keep-label
                variant={debtFilter === "noDebt" ? "default" : "outline"}
                size="sm"
                onClick={() => setDebtFilter("noDebt")}
                className="flex items-center justify-center gap-2 w-full sm:w-auto"
              >
                <CheckCircle className="h-4 w-4" />
                {t("No Debt")}
              </Button>

              <Button
                data-keep-label
                variant={isTopDebtorsView ? "default" : "outline"}
                size="sm"
                onClick={handleShowTopDebtors}
                className="flex items-center justify-center gap-2 w-full sm:w-auto"
              >
                <Trophy className="h-4 w-4" />
                {t("Top 10 Debtors")}
              </Button>
            </div>

            {/* Sort & Page Size */}
            <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3 sm:gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2">
                <span className="flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
                  <ArrowUpDown className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                  {t("Sort by")}
                </span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
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
            </div>
          </div>
        </FiltersPanel>

        {/* Results Count */}
        <div className="mb-4">
          <p className="text-gray-600 dark:text-gray-400">
            {t("Showing")} {customers.length} {t("of")} {totalCount} {t("customers")}
            {debtFilter !== "all" && (
              <span className="ms-2 text-blue-600">
                {t("• Filtered by:")} {debtFilter === "hasDebt" ? t("Has Debt") : t("No Debt")}
              </span>
            )}
            {sortBy === "debtDesc" && (
              <span className="ms-2 text-amber-600">{t("• Sorted by debt: high to low")}</span>
            )}
          </p>
        </div>

        {/* Loading State */}
        {isLoading && <CardGridSkeleton count={pageSize} />}

        {/* Error State */}
        {error && !isLoading && (
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="text-red-500 text-lg mb-2">{t("Error")}</div>
              <p className="text-gray-600 dark:text-gray-400">{t("Failed to load customers. Please try again.")}</p>
              <Button
                onClick={() => queryClient.refetchQueries(["customers"])}
                className="mt-4"
              >
                {t("Try Again")}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {!isLoading && !error && customers.length === 0 && (
          <Card>
            <CardContent className="pt-6 text-center">
              <User className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400 text-lg mb-2">{t("No customers found")}</p>
              {searchTerm || debtFilter !== "all" ? (
                <div>
                  <p className="text-gray-400 dark:text-gray-500 mb-2">{t("Try adjusting your filters")}</p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchInput("");
                      setSearchTerm("");
                      setDebtFilter("all");
                      setSortBy("newest");
                    }}
                  >
                    {t("Clear Filters")}
                  </Button>
                </div>
              ) : canCreateCustomers ? (
                <Link href="/dashboard/customers/create">
                  <Button className="mt-2">{t("Add Your First Customer")}</Button>
                </Link>
              ) : null}
            </CardContent>
          </Card>
        )}

        {/* Customers Grid */}
        {!isLoading && !error && customers.length > 0 && (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {customers.map((customer, index) => {
                const customerNumber = (currentPage - 1) * pageSize + index + 1;
                const hasDebt = customer.debt > 0;

                return (
                  <Link
                    href={`/dashboard/customers/${customer._id}`}
                    key={customer._id}
                  >
                    {/* Same card design as orders: status-coloured left edge,
                        number + status on top, amount on the right, actions
                        in a footer. */}
                    <Card
                      className={`border-s-4 ${
                        hasDebt ? "border-s-red-500" : "border-s-green-500"
                      } shadow-sm hover:shadow-md transition-shadow cursor-pointer h-full`}
                    >
                      <CardContent className="p-4 flex flex-col h-full">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-xs font-semibold tracking-wide text-gray-500 dark:text-gray-400">
                            #{customerNumber}
                          </span>
                          {hasDebt ? (
                            <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
                              {t("Owes money")}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                              <CheckCircle className="h-3 w-3" />
                              {t("No debt")}
                            </span>
                          )}
                        </div>

                        <div className="mt-2 flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 min-w-0">
                            <div
                              className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center text-sm font-semibold ${
                                hasDebt
                                  ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                                  : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                              }`}
                            >
                              {initials(customer.fullName)}
                            </div>
                            <div className="min-w-0">
                              <h3 className="font-semibold text-gray-900 dark:text-gray-100 line-clamp-2 break-words">
                                {customer.fullName}
                              </h3>
                              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-500 dark:text-gray-400">
                                {customer.phoneNumber && (
                                  <span className="inline-flex items-center gap-1">
                                    <Phone className="h-3 w-3" />
                                    {customer.phoneNumber}
                                  </span>
                                )}
                                <span>{t(getTierLabel(customer.priceTier))}</span>
                              </div>
                            </div>
                          </div>
                          <div className="text-end shrink-0">
                            <p className={`text-lg font-bold ${hasDebt ? "text-red-600" : "text-gray-900 dark:text-gray-100"}`}>
                              ${Number(customer.debt || 0).toLocaleString()}
                            </p>
                            <p className="text-[11px] text-gray-500 dark:text-gray-400">{t("debt")}</p>
                          </div>
                        </div>

                        <div className="mt-auto pt-3">
                          <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.preventDefault();
                                router.push(`/dashboard/customers/${customer._id}/orders`);
                              }}
                            >
                              {t("View orders")}
                            </Button>
                            {canDelete && (
                              <Button
                                variant="ghost"
                                size="sm"
                                aria-label={t("Delete {0}", {
                                  0: customer.fullName
                                })}
                                onClick={(e) => {
                                  e.preventDefault();
                                  setDeleteTarget(customer);
                                }}
                                disabled={deleteMutation.isPending}
                                className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/40"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 mt-8">
                <Button
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <ChevronLeft className="rtl-flip h-4 w-4" />
                  {t("Previous")}
                </Button>

                <span className="text-gray-600 dark:text-gray-400">
                  {t("Page")} {currentPage} {t("of")} {totalPages}
                </span>

                <Button
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  {t("Next")}
                  <ChevronRight className="rtl-flip h-4 w-4" />
                </Button>
              </div>
            )}
          </>
        )}
      </div>
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title={t("Delete customer?")}
        description={t("Are you sure you want to delete {0}?", {
          0: deleteTarget?.fullName
        })}
        onConfirm={confirmDelete}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
