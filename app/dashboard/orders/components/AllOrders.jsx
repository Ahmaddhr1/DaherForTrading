"use client";

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
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
  ArrowUpDown,
  Package,
} from "lucide-react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import axios from "axios";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";

const SORT_OPTIONS = [
  { value: "newest", label: "Newest First" },
  { value: "oldest", label: "Oldest First" },
  { value: "totalDesc", label: "Total: High to Low" },
  { value: "totalAsc", label: "Total: Low to High" },
];

const PAGE_SIZE_OPTIONS = [10, 20, 50];

export default function AllOrders() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [actionLoading, setActionLoading] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["orders", "all", page, pageSize, statusFilter, searchTerm, sortBy],
    queryFn: async () => {
      const res = await axios.get("/api/orders", {
        params: {
          page,
          limit: pageSize,
          status: statusFilter !== "all" ? statusFilter : undefined,
          search: searchTerm || undefined,
          sort: sortBy,
        },
      });
      return res.data;
    },
  });

  useEffect(() => {
    const timer = setTimeout(() => setPage(1), 500);
    return () => clearTimeout(timer);
  }, [statusFilter, searchTerm, sortBy, pageSize]);

  const handleAction = async (action, orderId) => {
    if (action === "delete" && !window.confirm("Undo this order? Stock will be restored and the customer's debt reduced.")) {
      return;
    }
    if (action === "markPaid" && !window.confirm("Mark this order as fully paid?")) {
      return;
    }
    if (action === "deleteDraft" && !window.confirm("Delete this draft? This cannot be undone.")) {
      return;
    }
    if (action === "finalize" && !window.confirm("Finalize this draft into a real order? This will deduct stock and add to the customer's debt.")) {
      return;
    }

    try {
      setActionLoading(true);
      if (action === "markPaid") {
        await axios.put(`/api/orders/${orderId}/markpaid`);
        toast.success("Order marked as paid!");
        queryClient.invalidateQueries(["orders", "all"]);
        queryClient.invalidateQueries(["payments-history"]);
      } else if (action === "delete" || action === "deleteDraft") {
        const res = await axios.delete(`/api/orders/${orderId}`);
        toast.success(res.data?.message || (action === "deleteDraft" ? "Draft deleted." : "Order reverted."));
        queryClient.invalidateQueries(["orders", "all"]);
      } else if (action === "finalize") {
        await axios.put(`/api/orders/${orderId}/finalize`);
        toast.success("Order finalized!");
        queryClient.invalidateQueries(["orders", "all"]);
      } else if (action === "pay") {
        router.push(`/dashboard/orders/${orderId}`);
      } else if (action === "continueEditing") {
        router.push(`/dashboard/orders/${orderId}/edit`);
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
  const activeFilterCount = [
    searchTerm,
    statusFilter !== "all" ? statusFilter : "",
    sortBy !== "newest" ? sortBy : "",
  ].filter(Boolean).length;

  const statusBadge = (status) => (
    <Badge
      variant={status === "paid" ? "default" : "destructive"}
      className={
        status === "paid"
          ? "bg-green-100 text-green-800"
          : status === "partiallyPaid"
          ? "bg-yellow-100 text-yellow-800"
          : status === "draft"
          ? "bg-slate-200 text-slate-800"
          : ""
      }
    >
      {status === "paid" ? "Paid" : status === "partiallyPaid" ? "Partially Paid" : status === "draft" ? "Draft" : "Pending"}
    </Badge>
  );

  const actionsMenu = (order) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" disabled={actionLoading}>
          <span className="sr-only">Open menu</span>⋯
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {order.status === "draft" ? (
          <>
            <DropdownMenuItem onClick={() => handleAction("continueEditing", order._id)}>
              Continue Editing
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleAction("finalize", order._id)}>
              Finalize Order
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleAction("deleteDraft", order._id)}>
              Delete Draft
            </DropdownMenuItem>
          </>
        ) : (
          <>
            <DropdownMenuItem onClick={() => handleAction("view", order._id)}>
              View Invoice
            </DropdownMenuItem>
            {order.status === "pending" && (
              <DropdownMenuItem onClick={() => router.push(`/dashboard/orders/${order._id}/edit`)}>
                Update Order
              </DropdownMenuItem>
            )}
            {order.status !== "paid" && (
              <>
                <DropdownMenuItem onClick={() => handleAction("pay", order._id)}>
                  Make Payment
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleAction("markPaid", order._id)}>
                  Mark as Paid
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleAction("delete", order._id)}>
                  Undo Order
                </DropdownMenuItem>
              </>
            )}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="space-y-4">
      {/* Filters */}
      <FiltersPanel activeCount={activeFilterCount}>
        <Card className="shadow-sm border-gray-200">
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

            <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Status:</span>
              </div>
              <Button
                variant={statusFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("all")}
                className="w-full sm:w-auto justify-center"
              >
                All
                <Badge variant="secondary" className="ml-1">{totalCount}</Badge>
              </Button>
              <Button
                variant={statusFilter === "draft" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("draft")}
                className="w-full sm:w-auto justify-center"
              >
                Draft
                <Badge variant="secondary" className="ml-1">{counts.draft}</Badge>
              </Button>
              <Button
                variant={statusFilter === "pending" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("pending")}
                className="w-full sm:w-auto justify-center"
              >
                Pending
                <Badge variant="secondary" className="ml-1">{counts.pending}</Badge>
              </Button>
              <Button
                variant={statusFilter === "partiallyPaid" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("partiallyPaid")}
                className="w-full sm:w-auto justify-center"
              >
                Partially Paid
                <Badge variant="secondary" className="ml-1">{counts.partiallyPaid}</Badge>
              </Button>
              <Button
                variant={statusFilter === "paid" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("paid")}
                className="w-full sm:w-auto justify-center"
              >
                Paid
                <Badge variant="secondary" className="ml-1">{counts.paid}</Badge>
              </Button>
            </div>

            <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3 sm:gap-4">
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
                    <option key={option.value} value={option.value}>{option.label}</option>
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
        <div className="text-center py-12 text-red-600">Failed to load orders.</div>
      ) : orders.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <Package className="h-12 w-12 mx-auto mb-3" />
          <p>No orders found</p>
        </div>
      ) : (
        <>
          {/* Mobile: card list */}
          <div className="space-y-3 sm:hidden">
            {orders.map((order, index) => (
              <Card key={order._id} className="shadow-sm border-gray-200">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs text-gray-400">
                        #{(page - 1) * pageSize + index + 1}
                      </p>
                      <p className="font-medium text-gray-900 truncate">
                        {order.customer?.fullName || "Deleted Customer"}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {format(new Date(order.createdAt), "MMM d, yyyy HH:mm")}
                      </p>
                    </div>
                    {actionsMenu(order)}
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    {statusBadge(order.status)}
                    <span className="font-semibold text-gray-900">
                      ${Number(order.total).toFixed(3)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Desktop: table */}
          <Card className="shadow-sm border-gray-200 hidden sm:block">
            <Table>
              <TableCaption>All orders across all customers</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-center">Total</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order, index) => (
                  <TableRow key={order._id} className="hover:bg-gray-50">
                    <TableCell className="font-medium text-gray-500">
                      {(page - 1) * pageSize + index + 1}
                    </TableCell>
                    <TableCell className="font-medium text-gray-900">
                      {order.customer?.fullName || "Deleted Customer"}
                    </TableCell>
                    <TableCell className="text-center font-medium">${Number(order.total).toFixed(3)}</TableCell>
                    <TableCell className="text-center">{statusBadge(order.status)}</TableCell>
                    <TableCell className="text-gray-500 text-sm">
                      {format(new Date(order.createdAt), "MMM d, yyyy HH:mm")}
                    </TableCell>
                    <TableCell className="text-right">{actionsMenu(order)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          {totalPages > 1 && (
            <Card className="shadow-sm border-gray-200">
              <div className="flex items-center justify-center gap-4 p-4">
                <Button onClick={() => setPage((p) => p - 1)} disabled={page === 1} variant="outline" size="sm" className="flex items-center gap-2">
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <span className="text-sm text-gray-600">Page {page} of {totalPages}</span>
                <Button onClick={() => setPage((p) => p + 1)} disabled={page === totalPages} variant="outline" size="sm" className="flex items-center gap-2">
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
