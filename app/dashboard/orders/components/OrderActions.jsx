"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, Edit, Eye } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useHasPermission } from "@/lib/useHasPermission";

const OrderActions = ({ order, onStatusUpdate }) => {
  const queryClient = useQueryClient();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { hasPermission: canFinalizeOrders } = useHasPermission("canFinalizeOrders");

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
    setConfirmOpen(true);
  };

  const confirmMarkAsPaid = () => {
    markPaidMutation.mutate(undefined, { onSuccess: () => setConfirmOpen(false) });
  };

  return (
    <div className="flex flex-wrap gap-2">
      {(order.status === "pending" || order.status === "partiallyPaid") && canFinalizeOrders && (
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
      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Mark as paid?"
        description={`Mark order for ${order.customer?.fullName} as paid?`}
        confirmLabel="Mark Paid"
        variant="default"
        onConfirm={confirmMarkAsPaid}
        loading={markPaidMutation.isLoading}
      />
    </div>
  );
};

export default OrderActions;
