"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { Loader2, AlertCircle, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import OrderCard from "./OrderCard";

const TodaysOrders = () => {
  const queryClient = useQueryClient();
  const { data: orders, isLoading, error } = useQuery({
    queryKey: ["orders", "today"],
    queryFn: async () => {
      const response = await axios.get("/api/orders/todayOrders");
      return response.data.todayOrders;
    },
  });

  const handleStatusUpdate = () => {
    queryClient.invalidateQueries(["orders", "today"]);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 text-red-600">
        <AlertCircle className="h-12 w-12 mx-auto mb-3" />
        <p>Failed to load today's orders</p>
        <Button
          onClick={() => queryClient.refetchQueries(["orders", "today"])}
          variant="outline"
          className="mt-2"
        >
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {orders?.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <Package className="h-12 w-12 mx-auto mb-3" />
          <p>No orders for today</p>
        </div>
      ) : (
        orders?.map((order) => (
          <OrderCard
            key={order._id}
            order={order}
            onStatusUpdate={handleStatusUpdate}
          />
        ))
      )}
    </div>
  );
};

export default TodaysOrders;
