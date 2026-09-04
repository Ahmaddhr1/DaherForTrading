"use client";

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
import {
  Loader2,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Package,
  Filter,
  ArrowUpDown,
  ShoppingCart,
} from "lucide-react";
import { format } from "date-fns";
import { useRouter, useParams } from "next/navigation";
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

export default function CustomerOrdersTable() {
  const router = useRouter();
  const { id } = useParams();
  const queryClient = useQueryClient();

  const [actionLoading, setActionLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [statusFilter, setStatusFilter] = useState("all"); // all | pending | partiallyPaid | paid
  const [sortBy, setSortBy] = useState("newest");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["customer-orders", id, page, pageSize, statusFilter, sortBy],
    queryFn: async () => {
      const res = await axios.get(`/api/customers/${id}/orders`, {
        params: {
          page,
          limit: pageSize,
          status: statusFilter !== "all" ? statusFilter : undefined,
          sort: sortBy,
        },
      });
      return res.data;
    },
    enabled: !!id,
  });

  useEffect(() => {
    setPage(1);
  }, [statusFilter, sortBy, pageSize]);

  const handleAction = async (action, orderId) => {
    try {
      setActionLoading(true);

      if (action === "print") {
        const res = await axios.get(`http://localhost:3001/print/${orderId}`);
        toast.success(res.data?.message || "Print triggered!");
      } else if (action === "delete") {
        const res = await axios.delete(`/api/orders/${orderId}`);
        toast.success(res.data?.message || "Order reverted.");
        queryClient.invalidateQueries(["customer-orders", id]);
        queryClient.invalidateQueries(["customer", id]);
      } else if (action === "markPaid") {
        await axios.put(`/api/orders/${orderId}/markpaid`);
        toast.success("Order marked as paid!");
        queryClient.invalidateQueries(["customer-orders", id]);
        queryClient.invalidateQueries(["customer", id]);
        queryClient.invalidateQueries(["payments-history"]);
      } else if (action === "edit") {
        router.push(`/dashboard/orders/${orderId}`);
      } else if (action === "view") {
        router.push(`/dashboard/invoices/${orderId}`);
      }
    } catch {
      toast.error("Action failed.");
    } finally {
      setActionLoading(false);
    }
  };

  const orders = data?.orders || [];
  const totalPages = data?.totalPages || 1;
  const totalCount = data?.total || 0;
  const counts = data?.counts || { pending: 0, partiallyPaid: 0, paid: 0 };

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="container mx-auto px-4 max-w-5xl">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => router.push(`/dashboard/customers/${id}`)}
            className="mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Customer
          </Button>

          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <ShoppingCart className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Orders for {data?.fullName || "Customer"}
              </h1>
              <p className="text-gray-600">Full order history for this customer</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <Card className="shadow-sm border-gray-200 mb-6">
          <CardContent className="p-4 space-y-4">
            <div className="flex flex-wrap gap-2">
              <div className="flex items-center gap-2 mr-2">
                <Filter className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Status:</span>
              </div>

              <Button
                variant={statusFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("all")}
              >
                All
                <Badge variant="secondary" className="ml-1">{totalCount}</Badge>
              </Button>
              <Button
                variant={statusFilter === "pending" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("pending")}
              >
                Pending
                <Badge variant="secondary" className="ml-1">{counts.pending}</Badge>
              </Button>
              <Button
                variant={statusFilter === "partiallyPaid" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("partiallyPaid")}
              >
                Partially Paid
                <Badge variant="secondary" className="ml-1">{counts.partiallyPaid}</Badge>
              </Button>
              <Button
                variant={statusFilter === "paid" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("paid")}
              >
                Paid
                <Badge variant="secondary" className="ml-1">{counts.paid}</Badge>
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-4">
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
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <TableSkeleton rows={pageSize} cols={5} />
        ) : isError ? (
          <Card>
            <CardContent className="pt-6 text-center text-red-600">
              Failed to load orders.
            </CardContent>
          </Card>
        ) : orders.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-lg">No orders found</p>
              {statusFilter !== "all" && (
                <Button variant="outline" className="mt-3" onClick={() => setStatusFilter("all")}>
                  Clear Filter
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="shadow-sm border-gray-200">
            <Table>
              <TableCaption>Orders placed by this customer</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">#</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order, index) => (
                  <TableRow key={order._id} className="hover:bg-gray-50">
                    <TableCell className="font-medium text-gray-500">
                      {(page - 1) * pageSize + index + 1}
                    </TableCell>
                    <TableCell className="font-medium">${Number(order.total).toFixed(2)}</TableCell>
                    <TableCell className="text-gray-500 text-sm">
                      {format(new Date(order.createdAt), "yyyy-MM-dd HH:mm")}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={order.status === "paid" ? "default" : "destructive"}
                        className={
                          order.status === "paid"
                            ? "bg-green-100 text-green-800"
                            : order.status === "partiallyPaid"
                            ? "bg-yellow-100 text-yellow-800"
                            : ""
                        }
                      >
                        {order.status === "paid"
                          ? "Paid"
                          : order.status === "partiallyPaid"
                          ? "Partially Paid"
                          : "Pending"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="icon" disabled={actionLoading}>
                            <span className="sr-only">Open menu</span>⋯
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleAction("view", order._id)}>
                            View Invoice
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleAction("print", order._id)}>
                            {actionLoading && <Loader2 className="animate-spin h-4 w-4 mr-2" />}
                            Print
                          </DropdownMenuItem>
                          {order.status !== "paid" && (
                            <>
                              <DropdownMenuItem onClick={() => handleAction("delete", order._id)}>
                                {actionLoading && (
                                  <Loader2 className="animate-spin h-4 w-4 mr-2" />
                                )}
                                Undo Order
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleAction("markPaid", order._id)}>
                                {actionLoading && (
                                  <Loader2 className="animate-spin h-4 w-4 mr-2" />
                                )}
                                Mark as Paid
                              </DropdownMenuItem>
                            </>
                          )}
                          <DropdownMenuItem onClick={() => handleAction("edit", order._id)}>
                            {order.status === "paid" ? "View Payment" : "Make Payment"}
                          </DropdownMenuItem>
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
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <span className="text-sm text-gray-600">
                  Page {page} of {totalPages}
                </span>
                <Button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page === totalPages}
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
    </div>
  );
}
