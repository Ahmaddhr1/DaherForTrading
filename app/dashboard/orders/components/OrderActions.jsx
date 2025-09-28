"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, Edit, Eye } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

const OrderActions = ({ order, onStatusUpdate }) => {
  const queryClient = useQueryClient();

  const markPaidMutation = useMutation({
    mutationFn: async () => {
      await axios.put(`/api/orders/${order._id}/markpaid`);
    },
    onSuccess: () => {
      toast.success("Order marked as paid successfully!");
      queryClient.invalidateQueries(["orders"]);
      onStatusUpdate?.();
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || "Failed to mark order as paid");
    },
  });

  const handleMarkAsPaid = () => {
    if (window.confirm(`Mark order for ${order.customer?.fullName} as paid?`)) {
      markPaidMutation.mutate();
    }
  };

  return (
    <div className="flex gap-2 mt-3">
      {(order.status === "pending" || order.status === "partiallyPaid") && (
        <Button
          size="sm"
          onClick={handleMarkAsPaid}
          disabled={markPaidMutation.isLoading}
          className="flex items-center gap-1 bg-green-600 hover:bg-green-700"
        >
          {markPaidMutation.isLoading ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <CheckCircle className="h-3 w-3" />
          )}
          Mark Paid
        </Button>
      )}

      <Link href={`/dashboard/orders/${order._id}`}>
        <Button size="sm" variant="outline" className="flex items-center gap-1">
          <Edit className="h-3 w-3" />
          Edit
        </Button>
      </Link>

      <Link href={`/dashboard/invoices/${order._id}`}>
        <Button size="sm" variant="outline" className="flex items-center gap-1">
          <Eye className="h-3 w-3" />
          View
        </Button>
      </Link>
    </div>
  );
};

export default OrderActions;
