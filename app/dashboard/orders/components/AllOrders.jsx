"use client";
import { t } from "@/lib/i18n";
import { useT } from "@/lib/i18n/LangProvider";

import React, { useEffect, useState } from "react";
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
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TableSkeleton } from "@/components/ui/skeleton-patterns";
import { FiltersPanel } from "@/components/ui/filters-panel";
import { useHasPermission } from "@/lib/useHasPermission";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
  ArrowUpDown,
  Package,
} from "lucide-react";
import { format } from "@/lib/i18n/date";
import { useRouter } from "next/navigation";
import axios from "axios";
import { toast } from "@/lib/i18n/toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { localDayStartISO, localDayEndISO } from "@/lib/dateUtils";
import { DateRangeFilter } from "./DateRangeFilter";
import { OrdersTotalsCard } from "./OrdersTotalsCard";
import OrderCustomerName from "./OrderCustomerName";
import OrderCard, { OrderStatusBadge } from "./OrderCard";
import { orderNumber } from "@/lib/orderNumber";
import { useIsOwner } from "@/lib/useIsOwner";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

const SORT_OPTIONS = [
  { value: "newest", label: "Newest First" },
  { value: "oldest", label: "Oldest First" },
  { value: "totalDesc", label: "Total: High to Low" },
  { value: "totalAsc", label: "Total: Low to High" },
];

const PAGE_SIZE_OPTIONS = [10, 20, 50];

export default function AllOrders() {
  const t = useT();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isOwner } = useIsOwner();
  const { hasPermission: canDelete } = useHasPermission("canDelete");
  const { hasPermission: canEditOrders } = useHasPermission("canEditOrders");
  const { hasPermission: canFinalizeOrders } = useHasPermission("canFinalizeOrders");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["orders", "all", page, pageSize, statusFilter, searchTerm, sortBy, startDate, endDate],
    queryFn: async () => {
      const res = await axios.get("/api/orders", {
        params: {
          page,
          limit: pageSize,
          status: statusFilter !== "all" ? statusFilter : undefined,
          search: searchTerm || undefined,
          sort: sortBy,
          startDate: localDayStartISO(startDate),
          endDate: localDayEndISO(endDate),
        },
      });
      return res.data;
    },
  });

  // Debounce the raw typed input before it drives the request.
  useEffect(() => {
    const timer = setTimeout(() => setSearchTerm(searchInput), 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, searchTerm, sortBy, pageSize, startDate, endDate]);

  const [deleteOrderId, setDeleteOrderId] = useState(null);
  const [markPaidOrderId, setMarkPaidOrderId] = useState(null);

  const runAction = async (action, orderId) => {
    try {
      setActionLoading(true);
      if (action === "markPaid") {
        await axios.put(`/api/orders/${orderId}/markpaid`);
        toast.success("Order marked as paid!");
        queryClient.invalidateQueries(["orders", "all"]);
        queryClient.invalidateQueries(["payments-history"]);
      } else if (action === "delete") {
        const res = await axios.delete(`/api/orders/${orderId}`);
        toast.success(res.data?.message || "Order reverted.");
        queryClient.invalidateQueries(["orders", "all"]);
      } else if (action === "pay") {
        router.push(`/dashboard/orders/${orderId}`);
      } else if (action === "view") {
        router.push(`/dashboard/invoices/${orderId}`);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Action failed.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleAction = async (action, orderId) => {
    if (action === "delete") {
      setDeleteOrderId(orderId);
      return;
    }
    if (action === "markPaid") {
      setMarkPaidOrderId(orderId);
      return;
    }
    await runAction(action, orderId);
  };

  const confirmDeleteOrder = async () => {
    const id = deleteOrderId;
    setDeleteOrderId(null);
    await runAction("delete", id);
  };

  const confirmMarkPaid = async () => {
    const id = markPaidOrderId;
    setMarkPaidOrderId(null);
    await runAction("markPaid", id);
  };

  const orders = data?.orders || [];
  const totalPages = data?.totalPages || 1;
  const totalCount = data?.total || 0;
  const counts = data?.counts || { draft: 0, pending: 0, partiallyPaid: 0, paid: 0 };
  const totals = data?.totals || { totalAmount: 0, totalProfit: 0, collectedAmount: 0 };
  const activeFilterCount = [
    searchTerm,
    statusFilter !== "all" ? statusFilter : "",
    sortBy !== "newest" ? sortBy : "",
    startDate,
    endDate,
  ].filter(Boolean).length;

  // Drafts never appear in this list (see /api/orders - the default query
  // excludes them; they live on their own page at /dashboard/drafts), so
  // every order here is always pending/partiallyPaid/paid.
  const actionsMenu = (order) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" disabled={actionLoading}>
          <span className="sr-only">{t("Open menu")}</span>⋯
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleAction("view", order._id)}>
          {t("View Invoice")}
        </DropdownMenuItem>
        {order.status === "pending" && canEditOrders && (
          <DropdownMenuItem onClick={() => router.push(`/dashboard/orders/${order._id}/edit`)}>
            {t("Update Order")}
          </DropdownMenuItem>
        )}
        {order.status !== "paid" && (
          <>
            {canFinalizeOrders && (
              <DropdownMenuItem onClick={() => handleAction("pay", order._id)}>
                {t("Make Payment")}
              </DropdownMenuItem>
            )}
            {canFinalizeOrders && (
              <DropdownMenuItem onClick={() => handleAction("markPaid", order._id)}>
                {t("Mark as Paid")}
              </DropdownMenuItem>
            )}
            {canDelete && (
              <DropdownMenuItem onClick={() => handleAction("delete", order._id)}>
                {t("Undo Order")}
              </DropdownMenuItem>
            )}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="space-y-4">
      {/* Totals for the current filter scope, including the date range below
          (drafts excluded until finalized) */}
      {isOwner && (
        <OrdersTotalsCard
          totalAmount={totals.totalAmount}
          totalProfit={totals.totalProfit}
          collectedAmount={totals.collectedAmount}
          label={t("Total of All Orders")}
        />
      )}

      {/* Filters */}
      <FiltersPanel activeCount={activeFilterCount}>
        <Card className="shadow-sm border-gray-200 dark:border-gray-800">
          <CardContent className="p-4 space-y-4">
            <div className="relative max-w-md">
              <Search className="absolute start-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 h-4 w-4" />
              <Input
                type="text"
                placeholder={t("Search by customer name or order # (e.g. 4F2A91)")}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="ps-10"
              />
            </div>

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
              <DateRangeFilter
                startDate={startDate}
                endDate={endDate}
                onStartDateChange={setStartDate}
                onEndDateChange={setEndDate}
              />
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
                    <option key={option.value} value={option.value}>{t(option.label)}</option>
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
                    <option key={size} value={size}>{size}</option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>
      </FiltersPanel>

      {isLoading ? (
        <TableSkeleton rows={pageSize} cols={6} />
      ) : isError ? (
        <div className="text-center py-12 text-red-600">{t("Failed to load orders.")}</div>
      ) : orders.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <Package className="h-12 w-12 mx-auto mb-3" />
          <p>{t("No orders found")}</p>
        </div>
      ) : (
        <>
          {/* Mobile: card list */}
          <div className="space-y-3 sm:hidden">
            {orders.map((order) => (
              <OrderCard
                key={order._id}
                order={order}
                actions={
                  <div className="flex items-center justify-between gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleAction("view", order._id)}>
                      {t("View Invoice")}
                    </Button>
                    {actionsMenu(order)}
                  </div>
                }
              />
            ))}
          </div>

          {/* Desktop: table */}
          <Card className="shadow-sm border-gray-200 dark:border-gray-800 hidden sm:block">
            <Table>
              <TableCaption>{t("All orders across all customers")}</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-28">{t("Order #")}</TableHead>
                  <TableHead>{t("Customer")}</TableHead>
                  <TableHead className="text-center">{t("Total")}</TableHead>
                  <TableHead className="text-center">{t("Status")}</TableHead>
                  <TableHead>{t("Date")}</TableHead>
                  <TableHead className="text-end">{t("Actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/60">
                    <TableCell className="font-mono text-xs font-semibold text-gray-500 dark:text-gray-400">
                      #{orderNumber(order._id)}
                    </TableCell>
                    <TableCell className="font-medium text-gray-900 dark:text-gray-100">
                      <OrderCustomerName order={order} />
                    </TableCell>
                    <TableCell className="text-center font-medium">${Number(order.total).toFixed(2)}</TableCell>
                    <TableCell className="text-center"><OrderStatusBadge status={order.status} /></TableCell>
                    <TableCell className="text-gray-500 dark:text-gray-400 text-sm">
                      {format(new Date(order.createdAt), "MMM d, yyyy HH:mm")}
                    </TableCell>
                    <TableCell className="text-end">{actionsMenu(order)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          {totalPages > 1 && (
            <Card className="shadow-sm border-gray-200 dark:border-gray-800">
              <div className="flex items-center justify-center gap-4 p-4">
                <Button onClick={() => setPage((p) => p - 1)} disabled={page === 1} variant="outline" size="sm" className="flex items-center gap-2">
                  <ChevronLeft className="rtl-flip h-4 w-4" />
                  {t("Previous")}
                </Button>
                <span className="text-sm text-gray-600 dark:text-gray-400">{t("Page")} {page} {t("of")} {totalPages}</span>
                <Button onClick={() => setPage((p) => p + 1)} disabled={page === totalPages} variant="outline" size="sm" className="flex items-center gap-2">
                  {t("Next")}
                  <ChevronRight className="rtl-flip h-4 w-4" />
                </Button>
              </div>
            </Card>
          )}
        </>
      )}
      <ConfirmDialog
        open={!!deleteOrderId}
        onClose={() => setDeleteOrderId(null)}
        title={t("Undo order?")}
        description={t("Undo this order? Stock will be restored and the customer's debt reduced.")}
        confirmLabel={t("Undo Order")}
        onConfirm={confirmDeleteOrder}
        loading={actionLoading}
      />
      <ConfirmDialog
        open={!!markPaidOrderId}
        onClose={() => setMarkPaidOrderId(null)}
        title={t("Mark as paid?")}
        description={t("Mark this order as fully paid?")}
        confirmLabel={t("Mark as Paid")}
        variant="default"
        onConfirm={confirmMarkPaid}
        loading={actionLoading}
      />
    </div>
  );
}
