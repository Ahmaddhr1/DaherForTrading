"use client";
import { t } from "@/lib/i18n";
import { useT } from "@/lib/i18n/LangProvider";

import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useEffect, useState } from "react";
import { toast } from "@/lib/i18n/toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FormSkeleton } from "@/components/ui/skeleton-patterns";
import { Loader2, CheckCircle, PencilLine, Trash2 } from "lucide-react";
import Link from "next/link";
import OrderCustomerName from "../components/OrderCustomerName";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useHasPermission } from "@/lib/useHasPermission";

export default function OrderDetailsPage() {
  const t = useT();
  const { orderId } = useParams();
  const queryClient = useQueryClient();
  const [amountPaid, setAmountPaid] = useState("");
  const router = useRouter();
  const { hasPermission: canFinalizeOrders } = useHasPermission("canFinalizeOrders");

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

  const [confirmAction, setConfirmAction] = useState(null); // "payment" | "finalize" | null

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!amountPaid || Number(amountPaid) <= 0) return toast.error("Please enter a valid amount");
    setConfirmAction("payment");
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
      router.push(order?.customer?._id ? `/dashboard/customers/${order.customer._id}` : "/dashboard/orders");
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to delete draft");
    },
  });

  const handleFinalize = () => {
    setConfirmAction("finalize");
  };

  const confirmProceed = () => {
    const action = confirmAction;
    setConfirmAction(null);
    if (action === "payment") mutation.mutate(amountPaid);
    if (action === "finalize") finalizeMutation.mutate();
  };

  const [deleteDraftOpen, setDeleteDraftOpen] = useState(false);

  const handleDeleteDraft = () => setDeleteDraftOpen(true);

  const confirmDeleteDraft = () => {
    deleteDraftMutation.mutate(undefined, { onSuccess: () => setDeleteDraftOpen(false) });
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
    return (<p className="text-center text-red-500 mt-10">{t("Error loading order")}</p>);

  const paymentAmount = parseFloat(amountPaid) || 0;
  const remainingAfterPayment = Math.max(0, remainingBalance - paymentAmount);
  const isValidAmount = paymentAmount > 0 && paymentAmount <= remainingBalance;

  return (
    <div className="max-w-xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold text-center">
        {t("Payment for Order #")}{orderId?.slice(-6).toUpperCase()}
      </h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("Order Summary")}</CardTitle>
          <CardDescription>
            <OrderCustomerName order={order} />
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <p>
              <span className="font-medium">{t("Total:")}</span> $
              {order.total.toFixed(2)}
            </p>
            <p>
              <span className="font-medium">{t("Paid:")}</span> $
              {order.amountpaid?.toFixed(2) || 0}
            </p>
            <p>
              <span className="font-medium">{t("Remaining:")}</span> $
              {remainingBalance.toFixed(2)}
            </p>
            <p>
              <span className="font-medium">{t("Status:")}</span>
              <span
                className={`ms-1 px-2 py-1 rounded-full text-sm ${
                  order.status === "paid"
                    ? "bg-green-100 dark:bg-green-900/30 text-green-700"
                    : order.status === "partiallyPaid"
                    ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700"
                    : order.status === "draft"
                    ? "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                }`}
              >
                {t(order.status)}
              </span>
            </p>
          </div>

          {order.status === "pending" && (
            <Link href={`/dashboard/orders/${orderId}/edit`}>
              <Button variant="outline" className="w-full flex items-center gap-2">
                <PencilLine className="h-4 w-4" />
                {t("Update Order")}
              </Button>
            </Link>
          )}

          {order.status === "draft" && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                {t(
                  "This is a draft - it hasn't been finalized yet, so stock and the customer's debt haven't been affected."
                )}
              </p>
              <Link href={`/dashboard/orders/${orderId}/edit`}>
                <Button variant="outline" className="w-full flex items-center gap-2">
                  <PencilLine className="h-4 w-4" />
                  {t("Continue Editing")}
                </Button>
              </Link>
              <Button
                onClick={handleFinalize}
                disabled={finalizeMutation.isPending || !canFinalizeOrders}
                className="w-full flex items-center gap-2 bg-green-600 hover:bg-green-700"
              >
                {finalizeMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                {t("Finalize Order")}
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
                {t("Delete Draft")}
              </Button>
            </div>
          )}

          {order.status !== "paid" && order.status !== "draft" && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t("Payment Amount ($)")}</label>
                <Input
                  type="number"
                  placeholder={t("Enter amount to pay")}
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
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {t(
                    "Defaults to the full remaining balance. Enter a smaller amount for a partial payment."
                  )}
                </p>
              </div>

              <div className="bg-gray-50 dark:bg-gray-950 rounded-lg p-4 flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t("Remaining After Payment")}</span>
                <span className={`font-bold ${remainingAfterPayment > 0 ? "text-red-600" : "text-green-600"}`}>
                  ${remainingAfterPayment.toLocaleString()}
                </span>
              </div>

              <Button
                type="submit"
                disabled={mutation.isPending || !isValidAmount || !canFinalizeOrders}
                className="w-full"
              >
                {mutation.isPending ? (
                  <span className="flex items-center gap-2 justify-center">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t("Recording Payment...")}
                  </span>
                ) : (
                  t("Record Payment")
                )}
              </Button>
            </form>
          )}

          {order.status === "paid" && (
            <p className="text-green-600 font-medium text-center mt-4 flex items-center justify-center gap-2">
              <CheckCircle className="h-4 w-4" />
              {t("Order is fully paid.")}
            </p>
          )}
        </CardContent>
      </Card>
      <ConfirmDialog
        open={deleteDraftOpen}
        onClose={() => setDeleteDraftOpen(false)}
        title={t("Delete draft?")}
        description={t("Delete this draft? This cannot be undone.")}
        onConfirm={confirmDeleteDraft}
        loading={deleteDraftMutation.isPending}
      />
      <ConfirmDialog
        open={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        title={confirmAction === "finalize" ? t("Finalize draft?") : t("Record payment?")}
        description={
          confirmAction === "finalize"
            ? t(
            "Finalize this draft into a real order for ${0}? This will deduct stock and add to the customer's debt.",
            {
              0: order?.total.toFixed(2)
            }
          )
            : t("Record a payment of ${0} for this order?", {
            0: Number(amountPaid || 0).toFixed(2)
          })
        }
        confirmLabel={confirmAction === "finalize" ? t("Finalize Order") : t("Record Payment")}
        variant="default"
        onConfirm={confirmProceed}
        loading={mutation.isPending || finalizeMutation.isPending}
      />
    </div>
  );
}
