"use client";
// Order page: pick which units (serial / IMEI) were sold on each line of
// products that track serials. Their warranty starts on the order date.
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { ScanLine, Loader2 } from "lucide-react";
import { useT } from "@/core/shared/i18n/LangProvider";
import { toast } from "@/core/shared/i18n/toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAnyPermission } from "@/modules/ui/lists";

export function OrderSerials({ order }) {
  const t = useT();
  const qc = useQueryClient();
  const canAssign = useAnyPermission(["canCreateOrders", "canEditOrders"]);
  const lines = (order?.products || []).filter((l) => l.productId);
  const ids = [...new Set(lines.map((l) => String(l.productId?._id || l.productId)))];
  const { data: assigned } = useQuery({
    queryKey: ["serials", "order", order?._id],
    queryFn: async () => (await axios.get(`/api/modules/serials/order/${order._id}`)).data.units,
    enabled: !!order?._id,
  });
  const { data: products = [] } = useQuery({
    queryKey: ["serials", "order-products", ids.join(",")],
    queryFn: async () => (await Promise.all(ids.map((id) => axios.get(`/api/products/${id}`).then((r) => r.data).catch(() => null)))).filter(Boolean),
    enabled: ids.length > 0,
  });
  const tracked = products.filter((p) => p.extra?.serials?.track || (assigned || []).some((u) => String(u.product) === String(p._id)));
  if (!order || order.status === "draft" || !tracked.length) return null;

  return (
    <Card className="shadow-sm border-gray-200 dark:border-gray-800 print:hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <ScanLine className="h-4 w-4" /> {t("Serial numbers sold")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {tracked.map((p) => {
          const qty = lines.filter((l) => String(l.productId?._id || l.productId) === String(p._id)).reduce((n, l) => n + (l.quantity || 0), 0);
          const mine = (assigned || []).filter((u) => String(u.product) === String(p._id) && u.status === "sold");
          return <Line key={p._id} product={p} qty={qty} mine={mine} order={order} canAssign={canAssign} onDone={() => qc.invalidateQueries({ queryKey: ["serials"] })} />;
        })}
      </CardContent>
    </Card>
  );
}

function Line({ product, qty, mine, order, canAssign, onDone }) {
  const t = useT();
  const [picked, setPicked] = useState([]);
  const left = qty - mine.length;
  const { data } = useQuery({
    queryKey: ["serials", "in-stock", product._id],
    queryFn: async () => (await axios.get("/api/modules/serials", { params: { productId: product._id, status: "in_stock" } })).data.units,
    enabled: canAssign && left > 0,
  });
  const assign = useMutation({
    mutationFn: async () => (await axios.post(`/api/modules/serials/order/${order._id}`, { productId: product._id, unitIds: picked })).data,
    onSuccess: () => {
      toast.success(t("Serial numbers saved"));
      setPicked([]);
      onDone();
    },
    onError: (e) => toast.error(e.response?.data?.error || "Couldn't assign the serial numbers"),
  });
  return (
    <div className="space-y-2 rounded-lg border border-gray-200 dark:border-gray-800 p-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-medium">{product.name}</span>
        <span className={left > 0 ? "text-amber-600" : "text-green-600"}>{t("{0} of {1} assigned", { 0: mine.length, 1: qty })}</span>
      </div>
      {mine.length > 0 && <p className="font-mono text-xs ltr-text">{mine.map((u) => u.serial).join(", ")}</p>}
      {canAssign && left > 0 && (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {(data || []).map((u) => {
              const on = picked.includes(u._id);
              return (
                <button
                  key={u._id}
                  type="button"
                  disabled={!on && picked.length >= left}
                  onClick={() => setPicked((p) => (on ? p.filter((x) => x !== u._id) : [...p, u._id]))}
                  className={`rounded-md border px-2 py-1 font-mono text-xs ltr-text disabled:opacity-40 ${on ? "border-blue-600 bg-blue-600 text-white" : "border-gray-300 dark:border-gray-700"}`}
                >
                  {u.serial}
                </button>
              );
            })}
            {data && !data.length && <span className="text-xs text-gray-500">{t("No units in stock - record them on the product page.")}</span>}
          </div>
          <Button size="sm" disabled={!picked.length || assign.isPending} onClick={() => assign.mutate()} data-keep-label>
            {assign.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : t("Assign {0}", { 0: picked.length })}
          </Button>
        </div>
      )}
    </div>
  );
}
