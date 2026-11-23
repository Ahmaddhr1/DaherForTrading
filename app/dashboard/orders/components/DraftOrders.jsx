"use client";
import { t } from "@/core/shared/i18n";
import { useT } from "@/core/shared/i18n/LangProvider";

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
import { format } from "@/core/shared/i18n/date";
import { useRouter } from "next/navigation";
import axios from "axios";
import { toast } from "@/core/shared/i18n/toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import OrderCustomerName from "./OrderCustomerName";
import OrderCard from "./OrderCard";
import { orderNumber } from "@/core/orders/orderNumber";
import LinkCustomerModal from "./LinkCustomerModal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useHasPermission } from "@/core/platform/useHasPermission";

const PAGE_SIZE_OPTIONS = [10, 20, 50];

export default function DraftOrders() {
  const t = useT();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { hasPermission: canEditOrders } = useHasPermission("canEditOrders");
  const { hasPermission: canFinalizeOrders } = useHasPermission("canFinalizeOrders");

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
  const [finalizeOrderId, setFinalizeOrderId] = useState(null);

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
    if (action === "finalize") {
      setFinalizeOrderId(orderId);
      return;
    }
    await runAction(action, orderId);
  };

  const confirmDeleteDraft = async () => {
    const id = deleteDraftId;
    setDeleteDraftId(null);
    await runAction("delete", id);
  };

  const confirmFinalize = async () => {
    const id = finalizeOrderId;
    setFinalizeOrderId(null);
    await runAction("finalize", id);
  };

  const orders = data?.orders || [];
  const totalPages = data?.totalPages || 1;

  const actionsMenu = (order) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" disabled={actionLoading}>
          <span className="sr-only">{t("Open menu")}</span>⋯
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {canEditOrders && (
          <DropdownMenuItem onClick={() => handleAction("continueEditing", order._id)}>
            {t("Continue Editing")}
          </DropdownMenuItem>
        )}
        {canEditOrders && (
          <DropdownMenuItem onClick={() => setLinkingOrder(order)}>
            {order.customer ? t("Change Linked Customer") : t("Link Customer")}
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          onClick={() => handleAction("finalize", order._id)}
          disabled={!order.customer || !canFinalizeOrders}
          title={!order.customer ? t("Link a customer first") : !canFinalizeOrders ? t("You don't have permission to finalize orders") : undefined}
        >
          {t("Finalize Order")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleAction("delete", order._id)}>
          {t("Delete Draft")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="space-y-4">
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

      {isLoading ? (
        <TableSkeleton rows={pageSize} cols={5} />
      ) : isError ? (
        <div className="text-center py-12 text-red-600">{t("Failed to load drafts.")}</div>
      ) : orders.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <FileText className="h-12 w-12 mx-auto mb-3" />
          <p>{t("No draft orders")}</p>
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
                    {canEditOrders ? (
                      <Button variant="outline" size="sm" onClick={() => handleAction("continueEditing", order._id)}>
                        {t("Continue Editing")}
                      </Button>
                    ) : (
                      <span />
                    )}
                    {actionsMenu(order)}
                  </div>
                }
              />
            ))}
          </div>

          {/* Desktop: table */}
          <Card className="shadow-sm border-gray-200 dark:border-gray-800 hidden sm:block">
            <Table>
              <TableCaption>{t("Draft orders awaiting a customer and/or finalization")}</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-28">{t("Order #")}</TableHead>
                  <TableHead>{t("Customer")}</TableHead>
                  <TableHead className="text-center">{t("Items")}</TableHead>
                  <TableHead className="text-center">{t("Total")}</TableHead>
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
                    <TableCell className="text-center">{order.products?.length || 0}</TableCell>
                    <TableCell className="text-center font-medium">${Number(order.total).toFixed(2)}</TableCell>
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

      <LinkCustomerModal
        open={!!linkingOrder}
        onClose={() => setLinkingOrder(null)}
        order={linkingOrder}
      />
      <ConfirmDialog
        open={!!deleteDraftId}
        onClose={() => setDeleteDraftId(null)}
        title={t("Delete draft?")}
        description={t("Delete this draft? This cannot be undone.")}
        onConfirm={confirmDeleteDraft}
        loading={actionLoading}
      />
      <ConfirmDialog
        open={!!finalizeOrderId}
        onClose={() => setFinalizeOrderId(null)}
        title={t("Finalize draft?")}
        description={t(
          "Finalize this draft into a real order? This will deduct stock and add to the customer's debt."
        )}
        confirmLabel={t("Finalize Order")}
        variant="default"
        onConfirm={confirmFinalize}
        loading={actionLoading}
      />
    </div>
  );
}
