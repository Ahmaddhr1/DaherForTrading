"use client";
import { t } from "@/core/shared/i18n";
import { useT } from "@/core/shared/i18n/LangProvider";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { AlertCircle, Package, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ListSkeleton } from "@/components/ui/skeleton-patterns";
import { OrdersTotalsCard } from "./OrdersTotalsCard";
import OrderCard from "./OrderCard";
import { useIsOwner } from "@/core/platform/useIsOwner";

const TodaysOrders = () => {
  const t = useT();
  const [page, setPage] = useState(1);
  const limit = 10;
  const queryClient = useQueryClient();
  const { isOwner } = useIsOwner();

  const { data, isLoading, error } = useQuery({
    queryKey: ["orders", "today", page],
    queryFn: async () => {
      const response = await axios.get("/api/orders/todayOrders", {
        params: { page, limit },
      });
      return response.data;
    },
  });

  const handleStatusUpdate = () => {
    queryClient.invalidateQueries(["orders", "today"]);
  };

  if (isLoading) {
    return <ListSkeleton rows={4} rowHeight="h-28" />;
  }

  if (error) {
    return (
      <div className="text-center py-12 text-red-600">
        <AlertCircle className="h-12 w-12 mx-auto mb-3" />
        <p>{t("Failed to load today's orders")}</p>
        <Button
          onClick={() => queryClient.refetchQueries(["orders", "today"])}
          variant="outline"
          className="mt-2"
        >
          {t("Try Again")}
        </Button>
      </div>
    );
  }

  const orders = data?.todayOrders || [];
  const totalPages = data?.totalPages || 1;
  const totals = data?.totals || { totalAmount: 0, totalProfit: 0 };

  return (
    <div className="space-y-4">
      {isOwner && (
        <OrdersTotalsCard totalAmount={totals.totalAmount} totalProfit={totals.totalProfit} label={t("Total Today")} />
      )}

      {orders.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <Package className="h-12 w-12 mx-auto mb-3" />
          <p>{t("No orders for today")}</p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {orders.map((order) => (
              <OrderCard
                key={order._id}
                order={order}
                onStatusUpdate={handleStatusUpdate}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 pt-4">
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
        </>
      )}
    </div>
  );
};

export default TodaysOrders;
