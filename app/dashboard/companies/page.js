// app/dashboard/companies/page.jsx
"use client";
import { t } from "@/lib/i18n";
import { useT } from "@/lib/i18n/LangProvider";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "@/lib/i18n/toast";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { CardGridSkeleton } from "@/components/ui/skeleton-patterns";
import { FiltersPanel } from "@/components/ui/filters-panel";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useHasPermission } from "@/lib/useHasPermission";
import { localDayStartISO, localDayEndISO } from "@/lib/dateUtils";
import {
  Search,
  Building2,
  Trash2,
  Phone,
  ChevronLeft,
  ChevronRight,
  Filter,
  DollarSign,
  CheckCircle,
  ArrowUpDown,
  Trophy,
  Plus,
  TrendingUp,
  Wallet,
} from "lucide-react";

const SORT_OPTIONS = [
  { value: "newest", label: "Newest First" },
  { value: "oldest", label: "Oldest First" },
  { value: "debtDesc", label: "We Owe: High to Low" },
  { value: "debtAsc", label: "We Owe: Low to High" },
  { value: "nameAsc", label: "Name: A to Z" },
  { value: "nameDesc", label: "Name: Z to A" },
];

const PAGE_SIZE_OPTIONS = [10, 20, 50];

export default function CompaniesPage() {
  const t = useT();
  const router = useRouter();
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [debtFilter, setDebtFilter] = useState("all"); // "all", "hasDebt", "noDebt"
  const [sortBy, setSortBy] = useState("newest");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const queryClient = useQueryClient();
  const { hasPermission: canDelete } = useHasPermission("canDelete");
  const { hasPermission: canCreateCompanies } = useHasPermission("canCreateCompanies");

  const { data, isLoading, error } = useQuery({
    queryKey: ["companies", currentPage, pageSize, searchTerm, debtFilter, sortBy, startDate, endDate],
    queryFn: async () => {
      const params = {
        page: currentPage,
        limit: pageSize,
        search: searchTerm,
        sort: sortBy,
        debtFilter: debtFilter !== "all" ? debtFilter : undefined,
        startDate: localDayStartISO(startDate),
        endDate: localDayEndISO(endDate),
      };
      Object.keys(params).forEach((key) => params[key] === undefined && delete params[key]);

      const response = await axios.get("/api/companies", { params });
      return response.data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (companyId) => {
      await axios.delete(`/api/companies/${companyId}`);
    },
    onSuccess: () => {
      toast.success("Company deleted successfully");
      queryClient.invalidateQueries(["companies"]);
    },
    onError: () => {
      toast.error("Failed to delete company");
    },
  });

  // Debounce the raw typed input before it drives the request.
  useEffect(() => {
    const timer = setTimeout(() => setSearchTerm(searchInput), 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, debtFilter, sortBy, pageSize, startDate, endDate]);

  useEffect(() => {
    if (error) toast.error("Failed to load companies");
  }, [error]);

  const [deleteTarget, setDeleteTarget] = useState(null);

  const confirmDelete = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget._id, { onSuccess: () => setDeleteTarget(null) });
  };

  const handleShowTopDebts = () => {
    setSortBy("debtDesc");
    setDebtFilter("hasDebt");
    setPageSize(10);
    setCurrentPage(1);
  };

  const companies = data?.companies || [];
  const totalPages = data?.totalPages || 1;
  const totalCount = data?.total || 0;
  const isTopDebtView = sortBy === "debtDesc" && debtFilter === "hasDebt" && pageSize === 10;
  const activeFilterCount = [
    searchTerm,
    debtFilter !== "all" ? debtFilter : "",
    sortBy !== "newest" ? sortBy : "",
    startDate,
    endDate,
  ].filter(Boolean).length;
  const summary = data?.summary || { totalDebt: 0, totalSpent: 0, expectedProfit: 0 };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-6">
      <div className="container mx-auto px-4">

        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg shrink-0">
                <Building2 className="h-6 w-6 text-blue-600" />
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 truncate">{t("Companies")}</h1>
                <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base truncate">{t("Manage your suppliers and purchase history")}</p>
              </div>
            </div>

            {canCreateCompanies && (
              <Link href="/dashboard/companies/create">
                <Button className="flex items-center gap-2 shrink-0">
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">{t("Add Company")}</span>
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Debt / spending / expected profit summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <Card className="shadow-sm border-gray-200 dark:border-gray-800">
            <CardContent className="p-4 flex flex-col gap-1">
              <span className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
                <DollarSign className="h-3.5 w-3.5" />
                {t("Total We Owe (All Companies)")}
              </span>
              <span className="text-lg font-bold text-amber-700">
                ${summary.totalDebt.toLocaleString()}
              </span>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-gray-200 dark:border-gray-800">
            <CardContent className="p-4 flex flex-col gap-1">
              <span className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
                <Wallet className="h-3.5 w-3.5" />
                {t("Total Spent (Purchases)")}
              </span>
              <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
                ${summary.totalSpent.toLocaleString()}
              </span>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-gray-200 dark:border-gray-800">
            <CardContent className="p-4 flex flex-col gap-1">
              <span className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
                <TrendingUp className="h-3.5 w-3.5" />
                {t("Expected Profit From Stock")}
              </span>
              <span className={`text-lg font-bold ${summary.expectedProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
                ${summary.expectedProfit.toLocaleString()}
              </span>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filter Section */}
        <FiltersPanel activeCount={activeFilterCount}>
          <div className="mb-6 space-y-4">
            <div className="relative max-w-md">
              <Search className="absolute start-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 h-4 w-4" />
              <Input
                type="text"
                placeholder={t("Search companies by name...")}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="ps-10"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-row sm:flex-wrap">
              <div className="col-span-2 flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t("Filter by Debt We Owe:")}</span>
              </div>

              <Button
                data-keep-label
                variant={debtFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setDebtFilter("all")}
                className="flex items-center justify-center gap-2 w-full sm:w-auto"
              >
                <Building2 className="h-4 w-4" />
                {t("All Companies")}
              </Button>

              <Button
                data-keep-label
                variant={debtFilter === "hasDebt" ? "default" : "outline"}
                size="sm"
                onClick={() => setDebtFilter("hasDebt")}
                className="flex items-center justify-center gap-2 w-full sm:w-auto"
              >
                <DollarSign className="h-4 w-4" />
                {t("We Owe Them")}
              </Button>

              <Button
                data-keep-label
                variant={debtFilter === "noDebt" ? "default" : "outline"}
                size="sm"
                onClick={() => setDebtFilter("noDebt")}
                className="flex items-center justify-center gap-2 w-full sm:w-auto"
              >
                <CheckCircle className="h-4 w-4" />
                {t("Settled")}
              </Button>

              <Button
                data-keep-label
                variant={isTopDebtView ? "default" : "outline"}
                size="sm"
                onClick={handleShowTopDebts}
                className="flex items-center justify-center gap-2 w-full sm:w-auto"
              >
                <Trophy className="h-4 w-4" />
                {t("Top 10 We Owe")}
              </Button>
            </div>

            <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3 sm:gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t("From")}</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full sm:w-auto border rounded-md text-sm px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t("To")}</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
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

                {(startDate || endDate) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setStartDate("");
                      setEndDate("");
                    }}
                    className="w-full sm:w-auto justify-center text-gray-500 dark:text-gray-400"
                  >
                    {t("Clear Dates")}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </FiltersPanel>

        {/* Results Count */}
        <div className="mb-4">
          <p className="text-gray-600 dark:text-gray-400">
            {t("Showing")} {companies.length} {t("of")} {totalCount} {t("companies")}
            {debtFilter !== "all" && (
              <span className="ms-2 text-blue-600">
                {t("• Filtered by:")} {debtFilter === "hasDebt" ? t("We Owe Them") : t("Settled")}
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
              <p className="text-gray-600 dark:text-gray-400">{t("Failed to load companies. Please try again.")}</p>
              <Button
                onClick={() => queryClient.refetchQueries(["companies"])}
                className="mt-4"
              >
                {t("Try Again")}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {!isLoading && !error && companies.length === 0 && (
          <Card>
            <CardContent className="pt-6 text-center">
              <Building2 className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400 text-lg mb-2">{t("No companies found")}</p>
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
              ) : canCreateCompanies ? (
                <Link href="/dashboard/companies/create">
                  <Button className="mt-2">{t("Add Your First Company")}</Button>
                </Link>
              ) : null}
            </CardContent>
          </Card>
        )}

        {/* Companies Grid */}
        {!isLoading && !error && companies.length > 0 && (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {companies.map((company, index) => {
                const companyNumber = (currentPage - 1) * pageSize + index + 1;
                const hasDebt = company.debt > 0;

                return (
                  <Link
                    href={`/dashboard/companies/${company._id}`}
                    key={company._id}
                  >
                    {/* Same card design as customers/orders: status-coloured
                        left edge, number + status on top, amount on the
                        right, actions in a footer. */}
                    <Card
                      className={`border-s-4 ${
                        hasDebt ? "border-s-red-500" : "border-s-green-500"
                      } shadow-sm hover:shadow-md transition-shadow cursor-pointer h-full`}
                    >
                      <CardContent className="p-4 flex flex-col h-full">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-xs font-semibold tracking-wide text-gray-500 dark:text-gray-400">
                            #{companyNumber}
                          </span>
                          {hasDebt ? (
                            <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
                              {t("We Owe Them")}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                              <CheckCircle className="h-3 w-3" />
                              {t("Settled")}
                            </span>
                          )}
                        </div>

                        <div className="mt-2 flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 min-w-0">
                            <div
                              className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center ${
                                hasDebt
                                  ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                                  : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                              }`}
                            >
                              <Building2 className="h-5 w-5" />
                            </div>
                            <div className="min-w-0">
                              <h3 className="font-semibold text-gray-900 dark:text-gray-100 line-clamp-2 break-words">
                                {company.name}
                              </h3>
                              {company.phoneNumber && (
                                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-500 dark:text-gray-400">
                                  <span className="inline-flex items-center gap-1">
                                    <Phone className="h-3 w-3" />
                                    {company.phoneNumber}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="text-end shrink-0">
                            <p className={`text-lg font-bold ${hasDebt ? "text-red-600" : "text-gray-900 dark:text-gray-100"}`}>
                              ${Number(company.debt || 0).toLocaleString()}
                            </p>
                            <p className="text-[11px] text-gray-500 dark:text-gray-400">{t("balance")}</p>
                          </div>
                        </div>

                        <div className="mt-auto pt-3">
                          <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.preventDefault();
                                router.push(`/dashboard/companies/${company._id}/purchases`);
                              }}
                            >
                              {t("View purchases")}
                            </Button>
                            {canDelete && (
                              <Button
                                variant="ghost"
                                size="sm"
                                aria-label={t("Delete {0}", { 0: company.name })}
                                onClick={(e) => {
                                  e.preventDefault();
                                  setDeleteTarget(company);
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

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 mt-8">
                <Button
                  onClick={() => setCurrentPage((p) => p - 1)}
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
                  onClick={() => setCurrentPage((p) => p + 1)}
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
        title={t("Delete company?")}
        description={t("Are you sure you want to delete {0}?", {
          0: deleteTarget?.name
        })}
        onConfirm={confirmDelete}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
