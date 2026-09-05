// app/dashboard/companies/page.jsx
"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "sonner";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CardGridSkeleton } from "@/components/ui/skeleton-patterns";
import { FiltersPanel } from "@/components/ui/filters-panel";
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
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [debtFilter, setDebtFilter] = useState("all"); // "all", "hasDebt", "noDebt"
  const [sortBy, setSortBy] = useState("newest");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const queryClient = useQueryClient();

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

  useEffect(() => {
    const timer = setTimeout(() => setCurrentPage(1), 500);
    return () => clearTimeout(timer);
  }, [searchTerm, debtFilter, sortBy, pageSize, startDate, endDate]);

  useEffect(() => {
    if (error) toast.error("Failed to load companies");
  }, [error]);

  const handleDelete = (companyId, companyName) => {
    if (window.confirm(`Are you sure you want to delete ${companyName}?`)) {
      deleteMutation.mutate(companyId);
    }
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
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="container mx-auto px-4">

        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 bg-blue-100 rounded-lg shrink-0">
                <Building2 className="h-6 w-6 text-blue-600" />
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 truncate">Companies</h1>
                <p className="text-gray-600 text-sm sm:text-base truncate">Manage your suppliers and purchase history</p>
              </div>
            </div>

            <Link href="/dashboard/companies/create">
              <Button className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2 shrink-0">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Add Company</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Debt / spending / expected profit summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <Card className="shadow-sm border-gray-200">
            <CardContent className="p-4 flex flex-col gap-1">
              <span className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
                <DollarSign className="h-3.5 w-3.5" />
                Total We Owe (All Companies)
              </span>
              <span className="text-lg font-bold text-amber-700">
                ${summary.totalDebt.toLocaleString()}
              </span>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-gray-200">
            <CardContent className="p-4 flex flex-col gap-1">
              <span className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
                <Wallet className="h-3.5 w-3.5" />
                Total Spent (Purchases)
              </span>
              <span className="text-lg font-bold text-gray-900">
                ${summary.totalSpent.toLocaleString()}
              </span>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-gray-200">
            <CardContent className="p-4 flex flex-col gap-1">
              <span className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
                <TrendingUp className="h-3.5 w-3.5" />
                Expected Profit From Stock
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
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                type="text"
                placeholder="Search companies by name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Filter by Debt We Owe:</span>
              </div>

              <Button
                variant={debtFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setDebtFilter("all")}
                className="flex items-center justify-center gap-2 w-full sm:w-auto"
              >
                <Building2 className="h-4 w-4" />
                All Companies
              </Button>

              <Button
                variant={debtFilter === "hasDebt" ? "default" : "outline"}
                size="sm"
                onClick={() => setDebtFilter("hasDebt")}
                className="flex items-center justify-center gap-2 w-full sm:w-auto"
              >
                <DollarSign className="h-4 w-4" />
                We Owe Them
              </Button>

              <Button
                variant={debtFilter === "noDebt" ? "default" : "outline"}
                size="sm"
                onClick={() => setDebtFilter("noDebt")}
                className="flex items-center justify-center gap-2 w-full sm:w-auto"
              >
                <CheckCircle className="h-4 w-4" />
                Settled
              </Button>

              <Button
                variant={isTopDebtView ? "default" : "outline"}
                size="sm"
                onClick={handleShowTopDebts}
                className="flex items-center justify-center gap-2 w-full sm:w-auto"
              >
                <Trophy className="h-4 w-4" />
                Top 10 We Owe
              </Button>
            </div>

            <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3 sm:gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2">
                <span className="text-sm font-medium text-gray-700">From</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full sm:w-auto border rounded-md text-sm px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2">
                <span className="text-sm font-medium text-gray-700">To</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full sm:w-auto border rounded-md text-sm px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2">
                <span className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
                  <ArrowUpDown className="h-4 w-4 text-gray-500" />
                  Sort by
                </span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full sm:w-auto border rounded-md text-sm px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2">
                <span className="text-sm font-medium text-gray-700">Per page</span>
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
                    className="w-full sm:w-auto justify-center text-gray-500"
                  >
                    Clear Dates
                  </Button>
                )}
              </div>
            </div>
          </div>
        </FiltersPanel>

        {/* Results Count */}
        <div className="mb-4">
          <p className="text-gray-600">
            Showing {companies.length} of {totalCount} companies
            {debtFilter !== "all" && (
              <span className="ml-2 text-blue-600">
                • Filtered by: {debtFilter === "hasDebt" ? "We Owe Them" : "Settled"}
              </span>
            )}
            {sortBy === "debtDesc" && (
              <span className="ml-2 text-amber-600">• Sorted by debt: high to low</span>
            )}
          </p>
        </div>

        {/* Loading State */}
        {isLoading && <CardGridSkeleton count={pageSize} />}

        {/* Error State */}
        {error && !isLoading && (
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="text-red-500 text-lg mb-2">Error</div>
              <p className="text-gray-600">Failed to load companies. Please try again.</p>
              <Button
                onClick={() => queryClient.refetchQueries(["companies"])}
                className="mt-4"
              >
                Try Again
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {!isLoading && !error && companies.length === 0 && (
          <Card>
            <CardContent className="pt-6 text-center">
              <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500 text-lg mb-2">No companies found</p>
              {searchTerm || debtFilter !== "all" ? (
                <div>
                  <p className="text-gray-400 mb-2">Try adjusting your filters</p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchTerm("");
                      setDebtFilter("all");
                      setSortBy("newest");
                    }}
                  >
                    Clear Filters
                  </Button>
                </div>
              ) : (
                <Link href="/dashboard/companies/create">
                  <Button className="mt-2">Add Your First Company</Button>
                </Link>
              )}
            </CardContent>
          </Card>
        )}

        {/* Companies Grid */}
        {!isLoading && !error && companies.length > 0 && (
          <>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {companies.map((company, index) => {
                const companyNumber = (currentPage - 1) * pageSize + index + 1;
                const hasDebt = company.debt > 0;

                return (
                  <Link
                    href={`/dashboard/companies/${company._id}`}
                    key={company._id}
                  >
                    <Card className="hover:shadow-md transition-shadow cursor-pointer h-full relative">
                      <CardContent className="p-4">
                        {sortBy === "debtDesc" && (
                          <Badge className="absolute top-2 left-2 bg-amber-500 hover:bg-amber-500">
                            #{companyNumber}
                          </Badge>
                        )}

                        <div className="flex justify-center mb-3">
                          <div className={`w-16 h-16 rounded-full flex items-center justify-center ${hasDebt ? "bg-red-100" : "bg-green-100"
                            }`}>
                            <Building2 className={`h-8 w-8 ${hasDebt ? "text-red-600" : "text-green-600"}`} />
                          </div>
                        </div>

                        <div className="text-center mb-3">
                          <h3 className="font-semibold text-gray-900 mb-1">
                            #{companyNumber} - {company.name}
                          </h3>

                          {company.phoneNumber && (
                            <p className="text-sm text-gray-600 flex items-center justify-center gap-1">
                              <Phone className="h-3 w-3" />
                              {company.phoneNumber}
                            </p>
                          )}
                        </div>

                        <div className="text-center mb-4">
                          {hasDebt ? (
                            <p className="text-red-600 font-medium">
                              We Owe: ${company.debt}
                            </p>
                          ) : (
                            <div className="text-green-600 font-medium">
                              <CheckCircle className="h-4 w-4 inline mr-1" />
                              Settled
                            </div>
                          )}
                        </div>

                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={(e) => {
                            e.preventDefault();
                            handleDelete(company._id, company.name);
                          }}
                          disabled={deleteMutation.isPending}
                          className="w-full"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          {deleteMutation.isPending ? "Deleting..." : "Delete"}
                        </Button>
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
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>

                <span className="text-gray-600">
                  Page {currentPage} of {totalPages}
                </span>

                <Button
                  onClick={() => setCurrentPage((p) => p + 1)}
                  disabled={currentPage === totalPages}
                  variant="outline"
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
