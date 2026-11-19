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
import { TableSkeleton } from "@/components/ui/skeleton-patterns";
import { ChevronLeft, ChevronRight, Search, FileText } from "lucide-react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import axios from "axios";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import OrderCustomerName from "./OrderCustomerName";
import LinkCustomerModal from "./LinkCustomerModal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

const PAGE_SIZE_OPTIONS = [10, 20, 50];

export default function DraftOrders() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [linkingOrder, setLinkingOrder] = useState(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["orders", "draft", page, pageSize, searchTerm],
    queryFn: async () => {
      const res = await axios.get("/api/orders", {
        params: {
          page,
          limit: pageSize,
          status: "draft",
          search: searchTerm || undefined,
          sort: "newest",
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
  }, [searchTerm, pageSize]);

  const [deleteDraftId, setDeleteDraftId] = useState(null);

  const runAction = async (action, orderId) => {
    try {
      setActionLoading(true);
      if (action === "delete") {
        const res = await axios.delete(`/api/orders/${orderId}`);
        toast.success(res.data?.message || "Draft deleted.");
        queryClient.invalidateQueries({ queryKey: ["orders", "draft"] });
      } else if (action === "finalize") {
        await axios.put(`/api/orders/${orderId}/finalize`);
        toast.success("Order finalized!");
        queryClient.invalidateQueries({ queryKey: ["orders", "draft"] });
        queryClient.invalidateQueries({ queryKey: ["orders", "all"] });
      } else if (action === "continueEditing") {
        router.push(`/dashboard/orders/${orderId}/edit`);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Action failed.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleAction = async (action, orderId) => {
    if (action === "delete") {
      setDeleteDraftId(orderId);
      return;
    }
    if (action === "finalize" && !window.confirm("Finalize this draft into a real order? This will deduct stock and add to the customer's debt.")) {
      return;
    }
    await runAction(action, orderId);
  };

  const confirmDeleteDraft = async () => {
    const id = deleteDraftId;
    setDeleteDraftId(null);
    await runAction("delete", id);
  };

  const orders = data?.orders || [];
  const totalPages = data?.totalPages || 1;

  const actionsMenu = (order) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" disabled={actionLoading}>
          <span className="sr-only">Open menu</span>⋯
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleAction("continueEditing", order._id)}>
          Continue Editing
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setLinkingOrder(order)}>
          {order.customer ? "Change Linked Customer" : "Link Customer"}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleAction("finalize", order._id)}
          disabled={!order.customer}
          title={!order.customer ? "Link a customer first" : undefined}
        >
          Finalize Order
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleAction("delete", order._id)}>
          Delete Draft
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="space-y-4">
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          type="text"
          placeholder="Search by customer name..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="pl-10"
        />
      </div>

      {isLoading ? (
        <TableSkeleton rows={pageSize} cols={5} />
      ) : isError ? (
        <div className="text-center py-12 text-red-600">Failed to load drafts.</div>
      ) : orders.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <FileText className="h-12 w-12 mx-auto mb-3" />
          <p>No draft orders</p>
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
                        <OrderCustomerName order={order} />
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {order.products?.length || 0} item{order.products?.length === 1 ? "" : "s"} ·{" "}
                        {format(new Date(order.createdAt), "MMM d, yyyy HH:mm")}
                      </p>
                    </div>
                    {actionsMenu(order)}
                  </div>
                  <div className="flex items-center justify-end mt-3">
                    <span className="font-semibold text-gray-900">
                      ${Number(order.total).toFixed(2)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Desktop: table */}
          <Card className="shadow-sm border-gray-200 hidden sm:block">
            <Table>
              <TableCaption>Draft orders awaiting a customer and/or finalization</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-center">Items</TableHead>
                  <TableHead className="text-center">Total</TableHead>
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
                      <OrderCustomerName order={order} />
                    </TableCell>
                    <TableCell className="text-center">{order.products?.length || 0}</TableCell>
                    <TableCell className="text-center font-medium">${Number(order.total).toFixed(2)}</TableCell>
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

      <LinkCustomerModal
        open={!!linkingOrder}
        onClose={() => setLinkingOrder(null)}
        order={linkingOrder}
      />
      <ConfirmDialog
        open={!!deleteDraftId}
        onClose={() => setDeleteDraftId(null)}
        title="Delete draft?"
        description="Delete this draft? This cannot be undone."
        onConfirm={confirmDeleteDraft}
        loading={actionLoading}
      />
    </div>
  );
}
