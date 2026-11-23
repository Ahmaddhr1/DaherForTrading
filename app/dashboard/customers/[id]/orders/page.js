"use client";
import { t } from "@/core/shared/i18n";
import { useT } from "@/core/shared/i18n/LangProvider";

import React, { useEffect, useState } from "react";
import {
  Table,
  TableCaption,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TableSkeleton } from "@/components/ui/skeleton-patterns";
import { FiltersPanel } from "@/components/ui/filters-panel";
import {
  Loader2,
  ChevronLeft,
  ChevronRight,
  Package,
  Filter,
  ArrowUpDown,
  ShoppingCart,
} from "lucide-react";
import { format } from "@/core/shared/i18n/date";
import { useRouter, useParams } from "next/navigation";
import axios from "axios";
import { toast } from "@/core/shared/i18n/toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { localDayStartISO, localDayEndISO } from "@/core/shared/dateUtils";
import ProductBreakdown from "./ProductBreakdown";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useHasPermission } from "@/core/platform/useHasPermission";

const SORT_OPTIONS = [
  { value: "newest", label: "Newest First" },
  { value: "oldest", label: "Oldest First" },
  { value: "totalDesc", label: "Total: High to Low" },
  { value: "totalAsc", label: "Total: Low to High" },
];

const PAGE_SIZE_OPTIONS = [10, 20, 50];

export default function CustomerOrdersTable() {
  const t = useT();
  const router = useRouter();
  const { id } = useParams();
  const queryClient = useQueryClient();

  const [actionLoading, setActionLoading] = useState(false);
  const { hasPermission: canEditOrders } = useHasPermission("canEditOrders");
  const { hasPermission: canFinalizeOrders } = useHasPermission("canFinalizeOrders");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [statusFilter, setStatusFilter] = useState("all"); // all | pending | partiallyPaid | paid
  const [sortBy, setSortBy] = useState("newest");
  const [category, setCategory] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await axios.get("/api/categories", { params: { all: true } });
      return res.data;
    },
  });

  const { data, isLoading, isError } = useQuery({
    queryKey: ["customer-orders", id, page, pageSize, statusFilter, sortBy, category, startDate, endDate],
    queryFn: async () => {
      const res = await axios.get(`/api/customers/${id}/orders`, {
        params: {
          page,
          limit: pageSize,
          status: statusFilter !== "all" ? statusFilter : undefined,
          sort: sortBy,
          category: category || undefined,
          startDate: localDayStartISO(startDate),
          endDate: localDayEndISO(endDate),
        },
      });
      return res.data;
    },
    enabled: !!id,
  });

  useEffect(() => {
    setPage(1);
  }, [statusFilter, sortBy, pageSize, category, startDate, endDate]);

  const hasActiveFilters = category || startDate || endDate;
  const handleClearFilters = () => {
    setCategory("");
    setStartDate("");
    setEndDate("");
  };
  const activeFilterCount = [category, startDate, endDate].filter(Boolean).length;

  const [deletePending, setDeletePending] = useState(null); // { action, orderId } | null
  const [actionPending, setActionPending] = useState(null); // { action, orderId } | null

  const handleAction = async (action, orderId) => {
    if (action === "delete" || action === "deleteDraft") {
      setDeletePending({ action, orderId });
      return;
    }
    if (action === "markPaid" || action === "finalize") {
      setActionPending({ action, orderId });
      return;
    }
    await runAction(action, orderId);
  };

  const confirmDeletePending = async () => {
    if (!deletePending) return;
    const { action, orderId } = deletePending;
    setDeletePending(null);
    await runAction(action, orderId);
  };

  const confirmActionPending = async () => {
    if (!actionPending) return;
    const { action, orderId } = actionPending;
    setActionPending(null);
    await runAction(action, orderId);
  };

  const runAction = async (action, orderId) => {
    try {
      setActionLoading(true);

      if (action === "print") {
        const res = await axios.get(`http://localhost:3001/print/${orderId}`);
        toast.success(res.data?.message || "Print triggered!");
      } else if (action === "delete" || action === "deleteDraft") {
        const res = await axios.delete(`/api/orders/${orderId}`);
        toast.success(res.data?.message || (action === "deleteDraft" ? "Draft deleted." : "Order reverted."));
        queryClient.invalidateQueries(["customer-orders", id]);
        queryClient.invalidateQueries(["customer", id]);
      } else if (action === "markPaid") {
        await axios.put(`/api/orders/${orderId}/markpaid`);
        toast.success("Order marked as paid!");
        queryClient.invalidateQueries(["customer-orders", id]);
        queryClient.invalidateQueries(["customer", id]);
        queryClient.invalidateQueries(["payments-history"]);
      } else if (action === "finalize") {
        await axios.put(`/api/orders/${orderId}/finalize`);
        toast.success("Order finalized!");
        queryClient.invalidateQueries(["customer-orders", id]);
        queryClient.invalidateQueries(["customer", id]);
      } else if (action === "edit" || action === "continueEditing") {
        router.push(action === "continueEditing" ? `/dashboard/orders/${orderId}/edit` : `/dashboard/orders/${orderId}`);
      } else if (action === "view") {
        router.push(`/dashboard/invoices/${orderId}`);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Action failed.");
    } finally {
      setActionLoading(false);
    }
  };

  const orders = data?.orders || [];
  const totalPages = data?.totalPages || 1;
  const totalCount = data?.total || 0;
  const counts = data?.counts || { draft: 0, pending: 0, partiallyPaid: 0, paid: 0 };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-6">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <ShoppingCart className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {t("Orders for")} {data?.fullName || t("Customer")}
              </h1>
              <p className="text-gray-600 dark:text-gray-400">{t("Full order history for this customer")}</p>
            </div>
          </div>
        </div>

        {/* Per-product breakdown: amount, sales and profit for each product bought */}
        <ProductBreakdown customerId={id} />

        {/* Filters */}
        <FiltersPanel activeCount={activeFilterCount}>
          <Card className="shadow-sm border-gray-200 dark:border-gray-800 mb-6">
            <CardContent className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-row sm:flex-wrap">
                <div className="col-span-2 flex items-center gap-2">
                  <Filter className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t("Status:")}</span>
                </div>

                <Button
                  data-keep-label
                  variant={statusFilter === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("all")}
                  className="w-full sm:w-auto justify-center"
                >
                  {t("All")}
                  <Badge variant="secondary" className="ms-1">{totalCount}</Badge>
                </Button>
                <Button
                  data-keep-label
                  variant={statusFilter === "draft" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("draft")}
                  className="w-full sm:w-auto justify-center"
                >
                  {t("Draft")}
                  <Badge variant="secondary" className="ms-1">{counts.draft}</Badge>
                </Button>
                <Button
                  data-keep-label
                  variant={statusFilter === "pending" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("pending")}
                  className="w-full sm:w-auto justify-center"
                >
                  {t("Pending")}
                  <Badge variant="secondary" className="ms-1">{counts.pending}</Badge>
                </Button>
                <Button
                  data-keep-label
                  variant={statusFilter === "partiallyPaid" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("partiallyPaid")}
                  className="w-full sm:w-auto justify-center"
                >
                  {t("Partially Paid")}
                  <Badge variant="secondary" className="ms-1">{counts.partiallyPaid}</Badge>
                </Button>
                <Button
                  data-keep-label
                  variant={statusFilter === "paid" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("paid")}
                  className="w-full sm:w-auto justify-center"
                >
                  {t("Paid")}
                  <Badge variant="secondary" className="ms-1">{counts.paid}</Badge>
                </Button>
              </div>

              <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3 sm:gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t("Category")}</span>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full sm:w-auto border rounded-md text-sm px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">{t("All Categories")}</option>
                    {categories.map((cat) => (
                      <option key={cat._id} value={cat._id}>{cat.name}</option>
                    ))}
                  </select>
                </div>

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
                </div>

                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearFilters}
                    className="w-full sm:w-auto justify-center text-gray-500 dark:text-gray-400"
                  >
                    {t("Clear Filters")}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </FiltersPanel>

        {isLoading ? (
          <TableSkeleton rows={pageSize} cols={5} />
        ) : isError ? (
          <Card>
            <CardContent className="pt-6 text-center text-red-600">
              {t("Failed to load orders.")}
            </CardContent>
          </Card>
        ) : orders.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <Package className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400 text-lg">{t("No orders found")}</p>
              {statusFilter !== "all" && (
                <Button variant="outline" className="mt-3" onClick={() => setStatusFilter("all")}>
                  {t("Clear Filter")}
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="shadow-sm border-gray-200 dark:border-gray-800">
            <Table>
              <TableCaption>{t("Orders placed by this customer")}</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">#</TableHead>
                  <TableHead>{t("Total")}</TableHead>
                  <TableHead>{t("Date")}</TableHead>
                  <TableHead>{t("Status")}</TableHead>
                  <TableHead className="text-center">{t("Actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order, index) => (
                  <TableRow key={order._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/60">
                    <TableCell className="font-medium text-gray-500 dark:text-gray-400">
                      {(page - 1) * pageSize + index + 1}
                    </TableCell>
                    <TableCell className="font-medium">${Number(order.total).toFixed(2)}</TableCell>
                    <TableCell className="text-gray-500 dark:text-gray-400 text-sm">
                      {format(new Date(order.createdAt), "yyyy-MM-dd HH:mm")}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={order.status === "paid" ? "default" : "destructive"}
                        className={
                          order.status === "paid"
                            ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400"
                            : order.status === "partiallyPaid"
                            ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400"
                            : order.status === "draft"
                            ? "bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200"
                            : ""
                        }
                      >
                        {order.status === "paid"
                          ? t("Paid")
                          : order.status === "partiallyPaid"
                          ? t("Partially Paid")
                          : order.status === "draft"
                          ? t("Draft")
                          : t("Pending")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="icon" disabled={actionLoading}>
                            <span className="sr-only">{t("Open menu")}</span>⋯
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {order.status === "draft" ? (
                            <>
                              {canEditOrders && (
                                <DropdownMenuItem onClick={() => handleAction("continueEditing", order._id)}>
                                  {t("Continue Editing")}
                                </DropdownMenuItem>
                              )}
                              {canFinalizeOrders && (
                                <DropdownMenuItem onClick={() => handleAction("finalize", order._id)}>
                                  {actionLoading && <Loader2 className="animate-spin h-4 w-4 me-2" />}
                                  {t("Finalize Order")}
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={() => handleAction("deleteDraft", order._id)}>
                                {actionLoading && <Loader2 className="animate-spin h-4 w-4 me-2" />}
                                {t("Delete Draft")}
                              </DropdownMenuItem>
                            </>
                          ) : (
                            <>
                              <DropdownMenuItem onClick={() => handleAction("view", order._id)}>
                                {t("View Invoice")}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleAction("print", order._id)}>
                                {actionLoading && <Loader2 className="animate-spin h-4 w-4 me-2" />}
                                {t("Print")}
                              </DropdownMenuItem>
                              {order.status === "pending" && canEditOrders && (
                                <DropdownMenuItem onClick={() => router.push(`/dashboard/orders/${order._id}/edit`)}>
                                  {t("Update Order")}
                                </DropdownMenuItem>
                              )}
                              {order.status !== "paid" && (
                                <>
                                  <DropdownMenuItem onClick={() => handleAction("delete", order._id)}>
                                    {actionLoading && (
                                      <Loader2 className="animate-spin h-4 w-4 me-2" />
                                    )}
                                    {t("Undo Order")}
                                  </DropdownMenuItem>
                                  {canFinalizeOrders && (
                                    <DropdownMenuItem onClick={() => handleAction("markPaid", order._id)}>
                                      {actionLoading && (
                                        <Loader2 className="animate-spin h-4 w-4 me-2" />
                                      )}
                                      {t("Mark as Paid")}
                                    </DropdownMenuItem>
                                  )}
                                </>
                              )}
                              <DropdownMenuItem onClick={() => handleAction("edit", order._id)}>
                                {order.status === "paid" ? t("View Payment") : t("Make Payment")}
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
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
                  <ChevronLeft className="rtl-flip h-4 w-4" />
                  {t("Previous")}
                </Button>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {t("Page")} {page} {t("of")} {totalPages}
                </span>
                <Button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page === totalPages}
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
      <ConfirmDialog
        open={!!deletePending}
        onClose={() => setDeletePending(null)}
        title={deletePending?.action === "deleteDraft" ? t("Delete draft?") : t("Undo order?")}
        description={
          deletePending?.action === "deleteDraft"
            ? t("Delete this draft? This cannot be undone.")
            : t("Undo this order? Stock will be restored and the customer's debt reduced.")
        }
        confirmLabel={deletePending?.action === "deleteDraft" ? t("Delete") : t("Undo Order")}
        onConfirm={confirmDeletePending}
        loading={actionLoading}
      />
      <ConfirmDialog
        open={!!actionPending}
        onClose={() => setActionPending(null)}
        title={actionPending?.action === "finalize" ? t("Finalize draft?") : t("Mark as paid?")}
        description={
          actionPending?.action === "finalize"
            ? t(
            "Finalize this draft into a real order? This will deduct stock and add to the customer's debt."
          )
            : t("Mark this order as fully paid?")
        }
        confirmLabel={actionPending?.action === "finalize" ? t("Finalize Order") : t("Mark as Paid")}
        variant="default"
        onConfirm={confirmActionPending}
        loading={actionLoading}
      />
    </div>
  );
}
