"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FormSkeleton } from "@/components/ui/skeleton-patterns";
import { Loader2, CheckCircle, PencilLine, Trash2 } from "lucide-react";
import Link from "next/link";

export default function OrderDetailsPage() {
  const { orderId } = useParams();
  const queryClient = useQueryClient();
  const [amountPaid, setAmountPaid] = useState("");
  const router = useRouter();

  const {
    data: order,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["order", orderId],
    queryFn: async () => {
      const res = await axios.get(`/api/orders/${orderId}`);
      return res.data;
    },
    enabled: !!orderId,
  });

  const remainingBalance = order
    ? order.remainingBalance ?? order.total - (order.amountpaid || 0)
    : 0;

  // Default the payment amount to the full remaining balance, like the normal payments flow.
  useEffect(() => {
    if (order && order.status !== "paid") {
      setAmountPaid(remainingBalance > 0 ? String(remainingBalance) : "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order?._id, remainingBalance]);

  const mutation = useMutation({
    mutationFn: async (amount) => {
      const res = await axios.put(`/api/orders/${orderId}/paritallypaid`, {
        amountpaid: Number(amount),
      });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || "Payment recorded");
      queryClient.invalidateQueries({ queryKey: ["order", orderId] });
      queryClient.invalidateQueries({ queryKey: ["payments-history"] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      setAmountPaid("");
      router.replace("/dashboard/customers/" + order?.customer?._id);
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || "Failed to update payment");
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!amountPaid || Number(amountPaid) <= 0) return toast.error("Please enter a valid amount");
    if (!window.confirm(`Record a payment of $${Number(amountPaid).toFixed(3)} for this order?`)) return;
    mutation.mutate(amountPaid);
  };

  const finalizeMutation = useMutation({
    mutationFn: async () => {
      const res = await axios.put(`/api/orders/${orderId}/finalize`);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Order finalized!");
      queryClient.invalidateQueries({ queryKey: ["order", orderId] });
      queryClient.invalidateQueries({ queryKey: ["customer-orders"] });
      queryClient.invalidateQueries({ queryKey: ["customer", order?.customer?._id] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to finalize order");
    },
  });

  const deleteDraftMutation = useMutation({
    mutationFn: async () => {
      const res = await axios.delete(`/api/orders/${orderId}`);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Draft deleted");
      router.push(`/dashboard/customers/${order?.customer?._id}`);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to delete draft");
    },
  });

  const handleFinalize = () => {
    if (!window.confirm(`Finalize this draft into a real order for $${order?.total.toFixed(3)}? This will deduct stock and add to the customer's debt.`)) return;
    finalizeMutation.mutate();
  };

  const handleDeleteDraft = () => {
    if (!window.confirm("Delete this draft? This cannot be undone.")) return;
    deleteDraftMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="max-w-xl mx-auto p-6 space-y-6">
        <Skeleton className="h-8 w-64 mx-auto" />
        <Card>
          <CardContent className="space-y-4 py-6">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-6 w-24" />
            <FormSkeleton fields={1} />
          </CardContent>
        </Card>
      </div>
    );
  }
  if (error)
    return (
      <p className="text-center text-red-500 mt-10">Error loading order</p>
    );

  const paymentAmount = parseFloat(amountPaid) || 0;
  const remainingAfterPayment = Math.max(0, remainingBalance - paymentAmount);
  const isValidAmount = paymentAmount > 0 && paymentAmount <= remainingBalance;

  return (
    <div className="max-w-xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold text-center">
        Payment for Order #{orderId}
      </h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Order Summary</CardTitle>
          <CardDescription>
            {order.customer?.fullName || "N/A"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <p>
              <span className="font-medium">Total:</span> $
              {order.total.toFixed(3)}
            </p>
            <p>
              <span className="font-medium">Paid:</span> $
              {order.amountpaid?.toFixed(3) || 0}
            </p>
            <p>
              <span className="font-medium">Remaining:</span> $
              {remainingBalance.toFixed(3)}
            </p>
            <p>
              <span className="font-medium">Status:</span>
              <span
                className={`ml-1 px-2 py-1 rounded-full text-sm ${
                  order.status === "paid"
                    ? "bg-green-100 text-green-700"
                    : order.status === "partiallyPaid"
                    ? "bg-yellow-100 text-yellow-700"
                    : order.status === "draft"
                    ? "bg-slate-200 text-slate-700"
                    : "bg-gray-100 text-gray-700"
                }`}
              >
                {order.status}
              </span>
            </p>
          </div>

          {order.status === "pending" && (
            <Link href={`/dashboard/orders/${orderId}/edit`}>
              <Button variant="outline" className="w-full flex items-center gap-2">
                <PencilLine className="h-4 w-4" />
                Update Order
              </Button>
            </Link>
          )}

          {order.status === "draft" && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600 text-center">
                This is a draft - it hasn&apos;t been finalized yet, so stock and the customer&apos;s debt haven&apos;t been affected.
              </p>
              <Link href={`/dashboard/orders/${orderId}/edit`}>
                <Button variant="outline" className="w-full flex items-center gap-2">
                  <PencilLine className="h-4 w-4" />
                  Continue Editing
                </Button>
              </Link>
              <Button
                onClick={handleFinalize}
                disabled={finalizeMutation.isPending}
                className="w-full flex items-center gap-2 bg-green-600 hover:bg-green-700"
              >
                {finalizeMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                Finalize Order
              </Button>
              <Button
                variant="outline"
                onClick={handleDeleteDraft}
                disabled={deleteDraftMutation.isPending}
                className="w-full flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                {deleteDraftMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                Delete Draft
              </Button>
            </div>
          )}

          {order.status !== "paid" && order.status !== "draft" && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Payment Amount ($)</label>
                <Input
                  type="number"
                  placeholder="Enter amount to pay"
                  value={amountPaid}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === "" || /^\d*\.?\d{0,3}$/.test(value)) {
                      setAmountPaid(value);
                    }
                  }}
                  min="0"
                  max={remainingBalance}
                  step="0.001"
                />
                <p className="text-xs text-gray-500">
                  Defaults to the full remaining balance. Enter a smaller amount for a partial payment.
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Remaining After Payment</span>
                <span className={`font-bold ${remainingAfterPayment > 0 ? "text-red-600" : "text-green-600"}`}>
                  ${remainingAfterPayment.toLocaleString()}
                </span>
              </div>

              <Button
                type="submit"
                disabled={mutation.isPending || !isValidAmount}
                className="w-full"
              >
                {mutation.isPending ? (
                  <span className="flex items-center gap-2 justify-center">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Recording Payment...
                  </span>
                ) : (
                  "Record Payment"
                )}
              </Button>
            </form>
          )}

          {order.status === "paid" && (
            <p className="text-green-600 font-medium text-center mt-4 flex items-center justify-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Order is fully paid.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
