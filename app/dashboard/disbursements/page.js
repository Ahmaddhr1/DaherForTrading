// app/dashboard/disbursements/page.jsx
"use client";
import { t } from "@/lib/i18n";
import { useT } from "@/lib/i18n/LangProvider";

import React, { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "@/lib/i18n/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { TableSkeleton } from "@/components/ui/skeleton-patterns";
import { FiltersPanel } from "@/components/ui/filters-panel";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useHasPermission } from "@/lib/useHasPermission";
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
  Receipt,
  Loader2,
  Plus,
  Filter,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  X,
  Trash2,
  TrendingDown,
  Eye,
  Repeat,
} from "lucide-react";
import { format } from "@/lib/i18n/date";
import Link from "next/link";

const CATEGORY_OPTIONS = ["Salaries", "Rent", "Utilities", "Maintenance", "Transport", "Other"];

const SORT_OPTIONS = [
  { value: "newest", label: "Newest First" },
  { value: "oldest", label: "Oldest First" },
  { value: "amountDesc", label: "Amount: High to Low" },
  { value: "amountAsc", label: "Amount: Low to High" },
];

const PAGE_SIZE_OPTIONS = [10, 20, 50];

export default function DisbursementsPage() {
  const t = useT();
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [category, setCategory] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  // Stays false until the user actually touches a filter. While false, the
  // list is scoped to today behind the scenes (effectiveStartDate/EndDate
  // below) without that showing up as an "active filter" - the date boxes
  // themselves stay empty and Clear Filters stays hidden.
  const [hasInteracted, setHasInteracted] = useState(false);

  const queryClient = useQueryClient();
  const { hasPermission: canManageDisbursements } = useHasPermission("canManageDisbursements");

  const effectiveStartDate = hasInteracted ? startDate : getTodayDateString();
  const effectiveEndDate = hasInteracted ? endDate : getTodayDateString();

  const { data, isLoading, error } = useQuery({
    queryKey: ["disbursements", currentPage, pageSize, searchTerm, category, effectiveStartDate, effectiveEndDate, sortBy],
    queryFn: async () => {
      const params = {
        page: currentPage,
        limit: pageSize,
        search: searchTerm || undefined,
        category: category || undefined,
        startDate: localDayStartISO(effectiveStartDate),
        endDate: localDayEndISO(effectiveEndDate),
        sort: sortBy,
      };
      Object.keys(params).forEach((key) => params[key] === undefined && delete params[key]);
      const res = await axios.get("/api/disbursements", { params });
      return res.data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await axios.delete(`/api/disbursements/${id}`);
    },
    onSuccess: () => {
      toast.success("Disbursement deleted");
      queryClient.invalidateQueries(["disbursements"]);
    },
    onError: () => toast.error("Failed to delete disbursement"),
  });

  // Debounce the raw typed input before it drives the request.
  useEffect(() => {
    const timer = setTimeout(() => setSearchTerm(searchInput), 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, category, effectiveStartDate, effectiveEndDate, sortBy, pageSize]);

  useEffect(() => {
    if (error) toast.error("Failed to load disbursements");
  }, [error]);

  const handleSearchInputChange = (value) => {
    setHasInteracted(true);
    setSearchInput(value);
  };

  const handleCategoryChange = (value) => {
    setHasInteracted(true);
    setCategory(value);
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
    setCategory("");
    setStartDate("");
    setEndDate("");
    setSortBy("newest");
  };

  const [deleteTarget, setDeleteTarget] = useState(null);

  const confirmDelete = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget._id, { onSuccess: () => setDeleteTarget(null) });
  };

  const handleCreated = () => {
    setIsModalOpen(false);
    queryClient.invalidateQueries(["disbursements"]);
    queryClient.invalidateQueries(["dashboard-summary"]);
  };

  const disbursements = data?.disbursements || [];
  const totalPages = data?.totalPages || 1;
  const totalCount = data?.total || 0;
  const totalAmount = data?.totalAmount || 0;
  const hasActiveFilters = searchTerm || category || startDate || endDate || sortBy !== "newest";
  const activeFilterCount = [
    searchTerm,
    category,
    startDate,
    endDate,
    sortBy !== "newest" ? sortBy : "",
  ].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-6">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg shrink-0">
                <TrendingDown className="h-6 w-6 text-red-600" />
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 truncate">{t("Disbursements")}</h1>
                <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base truncate">{t("Cash paid out — deducted from revenue in hand")}</p>
              </div>
            </div>

            {canManageDisbursements && (
              <div className="flex items-center gap-2 shrink-0">
                <Link href="/dashboard/disbursements/recurring">
                  <Button variant="outline" className="flex items-center gap-2">
                    <Repeat className="h-4 w-4" />
                    <span className="hidden sm:inline">{t("Recurring")}</span>
                  </Button>
                </Link>
                <Button onClick={() => setIsModalOpen(true)} className="bg-red-600 hover:bg-red-700 flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">{t("Add Disbursement")}</span>
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Summary */}
        <Card className="shadow-sm border-gray-200 dark:border-gray-800 mb-6">
          <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
              <Receipt className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              <span className="text-sm font-medium">
                {totalCount} {t("disbursement")}{totalCount === 1 ? "" : t("s")} {t("matching current filters")}
              </span>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {t("Total Disbursed:")}{" "}
              <span className="font-bold text-red-600">${totalAmount.toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>

        {!hasInteracted && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            {t("Showing today's disbursements only. Pick a date range below to see more.")}
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
                  placeholder={t("Search by description...")}
                  value={searchInput}
                  onChange={(e) => handleSearchInputChange(e.target.value)}
                  className="ps-10"
                />
              </div>

              <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3 sm:gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2">
                  <span className="flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
                    <Filter className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                    {t("Category")}
                  </span>
                  <select
                    value={category}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                    className="w-full sm:w-auto border rounded-md text-sm px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="">{t("All Categories")}</option>
                    {CATEGORY_OPTIONS.map((c) => (
                      <option key={c} value={c}>{t(c)}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t("From")}</span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => handleStartDateChange(e.target.value)}
                    className="w-full sm:w-auto border rounded-md text-sm px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t("To")}</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => handleEndDateChange(e.target.value)}
                    className="w-full sm:w-auto border rounded-md text-sm px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-red-500"
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
                    className="w-full sm:w-auto border rounded-md text-sm px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    {SORT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{t(option.label)}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t("Per page")}</span>
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(parseInt(e.target.value))}
                    className="w-full sm:w-auto border rounded-md text-sm px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    {PAGE_SIZE_OPTIONS.map((size) => (
                      <option key={size} value={size}>{size}</option>
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

        {/* Table */}
        {isLoading ? (
          <TableSkeleton rows={pageSize} cols={6} />
        ) : error ? (
          <Card>
            <CardContent className="pt-6 text-center text-red-500">{t("Failed to load disbursements.")}</CardContent>
          </Card>
        ) : disbursements.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <Receipt className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400 text-lg mb-2">{t("No disbursements found")}</p>
              {hasActiveFilters && (
                <Button variant="outline" onClick={handleClearFilters}>{t("Clear Filters")}</Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="shadow-sm border-gray-200 dark:border-gray-800">
            <Table>
              <TableCaption>{t("Disbursement history")}</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>{t("Description")}</TableHead>
                  <TableHead>{t("Category")}</TableHead>
                  <TableHead className="text-center">{t("Amount")}</TableHead>
                  <TableHead>{t("Date")}</TableHead>
                  <TableHead className="text-end">{t("Actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {disbursements.map((item, index) => (
                  <TableRow key={item._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/60">
                    <TableCell className="font-medium text-gray-500 dark:text-gray-400">
                      {(currentPage - 1) * pageSize + index + 1}
                    </TableCell>
                    <TableCell className="font-medium text-gray-900 dark:text-gray-100">
                      <div className="flex items-center gap-2">
                        {t(item.description)}
                        {item.recurringSourceId && (
                          <Badge variant="outline" className="flex items-center gap-1 text-xs font-normal">
                            <Repeat className="h-3 w-3" />
                            {t("Auto")}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{t(item.category)}</Badge>
                    </TableCell>
                    <TableCell className="text-center font-semibold text-red-600">
                      -${item.amount.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-gray-500 dark:text-gray-400 text-sm">
                      {format(new Date(item.createdAt), "MMM d, yyyy HH:mm")}
                    </TableCell>
                    <TableCell className="text-end">
                      <div className="flex justify-end gap-2">
                        <Link href={`/dashboard/disbursements/${item._id}`}>
                          <Button variant="ghost" size="sm" className="flex items-center gap-1">
                            <Eye className="h-3.5 w-3.5" />
                            {t("View")}
                          </Button>
                        </Link>
                        {canManageDisbursements && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setDeleteTarget(item)}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
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
                <span className="text-sm text-gray-600 dark:text-gray-400">{t("Page")} {currentPage} {t("of")} {totalPages}</span>
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
      </div>

      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={t("Add Disbursement")}
        description={t("Record cash paid out of the business")}
        maxWidth="max-w-md"
      >
        <AddDisbursementForm onSuccess={handleCreated} />
      </Modal>
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title={t("Delete disbursement?")}
        description={t("Delete disbursement \"{0}\"?", {
          0: deleteTarget?.description
        })}
        onConfirm={confirmDelete}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}

function AddDisbursementForm({ onSuccess }) {
  const t = useT();
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Other");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await axios.post("/api/disbursements", {
        description,
        amount: parseFloat(amount),
        category,
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success("Disbursement recorded successfully");
      onSuccess();
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || "Failed to record disbursement");
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!description.trim()) {
      toast.error("Description is required");
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    setConfirmOpen(true);
  };

  const confirmSubmit = () => {
    setConfirmOpen(false);
    mutation.mutate();
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="description">{t("Description *")}</Label>
          <Input
            id="description"
            placeholder={t("e.g. Staff salaries for September")}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="category">{t("Category")}</Label>
          <select
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full p-2 border rounded-md focus:border-red-500"
          >
            {CATEGORY_OPTIONS.map((c) => (
              <option key={c} value={c}>{t(c)}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="amount">{t("Amount ($) *")}</Label>
          <Input
            id="amount"
            type="text"
            inputMode="decimal"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
            required
          />
        </div>

        <Button
          type="submit"
          disabled={mutation.isPending}
          className="w-full bg-red-600 hover:bg-red-700"
        >
          {mutation.isPending ? (
            <span className="flex items-center gap-2 justify-center">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("Recording...")}
            </span>
          ) : (
            t("Record Disbursement")
          )}
        </Button>
      </form>
      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title={t("Record disbursement?")}
        description={t("Record a disbursement of ${0} for \"{1}\"?", {
          0: parseFloat(amount || 0).toFixed(2),
          1: description
        })}
        confirmLabel={t("Record Disbursement")}
        variant="default"
        onConfirm={confirmSubmit}
        loading={mutation.isPending}
      />
    </>
  );
}
