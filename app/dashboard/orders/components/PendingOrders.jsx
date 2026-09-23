"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { AlertCircle, Clock, ChevronLeft, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ListSkeleton } from "@/components/ui/skeleton-patterns";
import { localDayStartISO, localDayEndISO } from "@/lib/dateUtils";
import { DateRangeFilter } from "./DateRangeFilter";
import { OrdersTotalsCard } from "./OrdersTotalsCard";
import OrderCard from "./OrderCard";

const PendingOrders = () => {
  const [page, setPage] = useState(1);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const limit = 10;
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["orders", "pending", page, startDate, endDate],
    queryFn: async () => {
      const response = await axios.get("/api/orders/pending", {
        params: {
          page,
          limit,
          startDate: localDayStartISO(startDate),
          endDate: localDayEndISO(endDate),
        },
      });
      return response.data;
    },
  });

  useEffect(() => {
    setPage(1);
  }, [startDate, endDate]);

  const handleStatusUpdate = () => {
    queryClient.invalidateQueries(["orders", "pending"]);
  };

  const hasDateFilter = startDate || endDate;
  const clearDateFilter = () => {
    setStartDate("");
    setEndDate("");
  };

  const totals = data?.totals || { totalAmount: 0, totalProfit: 0 };

  if (isLoading) {
    return <ListSkeleton rows={4} rowHeight="h-28" />;
  }

  if (error) {
    return (
      <div className="text-center py-12 text-red-600">
        <AlertCircle className="h-12 w-12 mx-auto mb-3" />
        <p>Failed to load pending orders</p>
        <Button
          onClick={() => queryClient.refetchQueries(["orders", "pending"])}
          variant="outline"
          className="mt-2"
        >
          Try Again
        </Button>
      </div>
    );
  }

  const orders = data?.pendingOrders || [];
  const totalPages = data?.totalPages || 1;

  return (
    <div className="space-y-4">
      <OrdersTotalsCard totalAmount={totals.totalAmount} totalProfit={totals.totalProfit} label="Total Pending" />

      <Card className="shadow-sm border-gray-200">
        <CardContent className="p-4 flex flex-wrap items-center gap-3">
          <DateRangeFilter
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
          />
          {hasDateFilter && (
            <Button variant="ghost" size="sm" onClick={clearDateFilter} className="flex items-center gap-1 text-gray-500">
              <X className="h-3.5 w-3.5" />
              Clear
            </Button>
          )}
        </CardContent>
      </Card>

      {orders.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <Clock className="h-12 w-12 mx-auto mb-3" />
          <p>No pending orders</p>
        </div>
      ) : (
        <>
          {orders.map((order) => (
            <OrderCard
              key={order._id}
              order={order}
              borderColor="border-yellow-200"
              onStatusUpdate={handleStatusUpdate}
            />
          ))}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 pt-4">
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
        </>
      )}
    </div>
  );
};

export default PendingOrders;
