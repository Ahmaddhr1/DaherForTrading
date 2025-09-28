"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { Loader2, AlertCircle, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import OrderCard from "./OrderCard";

const PartiallyPaidOrders = () => {
  const queryClient = useQueryClient();
  const { data: orders, isLoading, error } = useQuery({
    queryKey: ["orders", "partially-paid"],
    queryFn: async () => {
      const response = await axios.get("/api/orders/partiallyPaid");
      return response.data.paritalOrders;
    },
  });

  const handleStatusUpdate = () => {
    queryClient.invalidateQueries(["orders", "partially-paid"]);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 text-red-600">
        <AlertCircle className="h-12 w-12 mx-auto mb-3" />
        <p>Failed to load partially paid orders</p>
        <Button
          onClick={() => queryClient.refetchQueries(["orders", "partially-paid"])}
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
          <DollarSign className="h-12 w-12 mx-auto mb-3" />
          <p>No partially paid orders</p>
        </div>
      ) : (
        orders?.map((order) => (
          <OrderCard
            key={order._id}
            order={order}
            borderColor="border-orange-200"
            onStatusUpdate={handleStatusUpdate}
          />
        ))
      )}
    </div>
  );
};

export default PartiallyPaidOrders;
