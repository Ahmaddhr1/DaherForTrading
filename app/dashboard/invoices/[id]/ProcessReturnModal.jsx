"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "sonner";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

function lineKey(item) {
  return item.productId ? String(item.productId) : `custom:${item.name}`;
}

export default function ProcessReturnModal({ open, onClose, order }) {
  const [quantities, setQuantities] = useState({});
  const [reason, setReason] = useState("");
  const [restocked, setRestocked] = useState(true);
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ["order-returns", order?._id],
    queryFn: async () => (await axios.get(`/api/orders/${order._id}/returns`)).data,
    enabled: open && !!order?._id,
  });
  const existingReturns = data?.returns || [];

  const alreadyReturned = useMemo(() => {
    const map = new Map();
    for (const ret of existingReturns) {
      for (const item of ret.items) {
        const key = item.productId ? String(item.productId) : `custom:${item.name}`;
        map.set(key, (map.get(key) || 0) + item.quantity);
      }
    }
    return map;
  }, [existingReturns]);

  const returnableLines = useMemo(() => {
    if (!order) return [];
    return order.products
      .map((item) => {
        const key = lineKey(item);
        const already = alreadyReturned.get(key) || 0;
        const remaining = item.quantity - already;
        return { ...item, key, remaining };
      })
      .filter((item) => item.remaining > 0);
  }, [order, alreadyReturned]);

  const totalRefund = returnableLines.reduce((sum, item) => {
    const qty = parseInt(quantities[item.key], 10) || 0;
    return sum + qty * item.price;
  }, 0);

  const mutation = useMutation({
    mutationFn: async () => {
      const items = returnableLines
        .map((item) => ({
          productId: item.productId,
          name: item.name,
          quantity: parseInt(quantities[item.key], 10) || 0,
        }))
        .filter((item) => item.quantity > 0);

      return (
        await axios.post(`/api/orders/${order._id}/returns`, { items, reason, restocked })
      ).data;
    },
    onSuccess: () => {
      toast.success("Return processed");
      queryClient.invalidateQueries({ queryKey: ["order-returns", order._id] });
      queryClient.invalidateQueries({ queryKey: ["order", order._id] });
      if (order?.customer?._id) {
        queryClient.invalidateQueries({ queryKey: ["customer", order.customer._id] });
      }
      setQuantities({});
      setReason("");
      onClose();
    },
    onError: (error) => toast.error(error.response?.data?.error || "Failed to process return"),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const hasAnyQuantity = returnableLines.some((item) => (parseInt(quantities[item.key], 10) || 0) > 0);
    if (!hasAnyQuantity) {
      toast.error("Enter a quantity to return for at least one item");
      return;
    }
    mutation.mutate();
  };

  if (!order) return null;

  return (
    <Modal open={open} onClose={onClose} title="Process Return" description="Record stock a customer sent back">
      {returnableLines.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">
          Every item on this order has already been fully returned.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-3">
            {returnableLines.map((item) => (
              <div key={item.key} className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{item.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    ${item.price.toFixed(2)} each · {item.remaining} returnable
                  </p>
                </div>
                <Input
                  type="number"
                  min="0"
                  max={item.remaining}
                  value={quantities[item.key] || ""}
                  onChange={(e) =>
                    setQuantities((q) => ({ ...q, [item.key]: e.target.value }))
                  }
                  className="w-20 text-center shrink-0"
                  placeholder="0"
                />
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <Label htmlFor="return-reason">Reason (optional)</Label>
            <Input
              id="return-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Wrong item, customer changed their mind"
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              checked={restocked}
              onChange={(e) => setRestocked(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 accent-primary"
            />
            Add returned items back to inventory
          </label>

          <div className="bg-gray-50 dark:bg-gray-950 rounded-lg p-4 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Refund (reduces debt)</span>
            <span className="font-bold text-green-600">${totalRefund.toFixed(2)}</span>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={mutation.isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending || totalRefund <= 0}>
              {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Process Return"}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
