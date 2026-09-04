"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, CheckCircle } from "lucide-react";

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
    mutation.mutate(amountPaid);
  };

  if (isLoading) return <p className="text-center mt-10">Loading...</p>;
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
              {order.total.toFixed(2)}
            </p>
            <p>
              <span className="font-medium">Paid:</span> $
              {order.amountpaid?.toFixed(2) || 0}
            </p>
            <p>
              <span className="font-medium">Remaining:</span> $
              {remainingBalance.toFixed(2)}
            </p>
            <p>
              <span className="font-medium">Status:</span>
              <span
                className={`ml-1 px-2 py-1 rounded-full text-sm ${
                  order.status === "paid"
                    ? "bg-green-100 text-green-700"
                    : order.status === "partiallyPaid"
                    ? "bg-yellow-100 text-yellow-700"
                    : "bg-gray-100 text-gray-700"
                }`}
              >
                {order.status}
              </span>
            </p>
          </div>

          {order.status !== "paid" && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Payment Amount ($)</label>
                <Input
                  type="number"
                  placeholder="Enter amount to pay"
                  value={amountPaid}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === "" || /^\d*\.?\d{0,2}$/.test(value)) {
                      setAmountPaid(value);
                    }
                  }}
                  min="0"
                  max={remainingBalance}
                  step="0.01"
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
