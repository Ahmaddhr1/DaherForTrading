"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { Truck, Loader2, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/lib/i18n/toast";
import { useT } from "@/lib/i18n/LangProvider";
import { useHasPermission } from "@/lib/useHasPermission";
import { DELIVERY_STATUSES, deliveryInfo } from "@/lib/delivery";

// Optional delivery on an order: status (separate from payment) and the
// delivery person. Editable with canManageDeliveries; read-only otherwise.
export default function DeliveryPanel({ order }) {
  const t = useT();
  const queryClient = useQueryClient();
  const { hasPermission: canManage } = useHasPermission("canManageDeliveries");
  const [status, setStatus] = useState(order.deliveryStatus || "");
  const [person, setPerson] = useState(order.deliveryPerson || "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setStatus(order.deliveryStatus || "");
    setPerson(order.deliveryPerson || "");
  }, [order.deliveryStatus, order.deliveryPerson]);

  const { data: people } = useQuery({
    queryKey: ["delivery-people"],
    queryFn: async () => (await axios.get("/api/orders/delivery-people")).data.people || [],
    enabled: canManage,
    staleTime: 60_000,
  });

  if (order.status === "draft") return null;
  const info = deliveryInfo(order.deliveryStatus);
  const dirty = status !== (order.deliveryStatus || "") || person.trim() !== (order.deliveryPerson || "");

  const save = async () => {
    setSaving(true);
    try {
      await axios.patch(`/api/orders/${order._id}/delivery`, { deliveryStatus: status, deliveryPerson: person });
      toast.success("Delivery updated");
      queryClient.invalidateQueries();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update delivery");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="shadow-sm border-gray-200 dark:border-gray-800">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between gap-2 text-lg">
          <span className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-blue-600" />
            {t("Delivery")}
          </span>
          {info ? <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${info.style}`}>{t(info.label)}</span> : <span className="text-xs font-normal text-gray-500">{t("No delivery")}</span>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {canManage ? (
          <>
            <div className="space-y-1">
              <Label htmlFor="delivery-status" className="text-xs">{t("Delivery status")}</Label>
              <select
                id="delivery-status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm dark:bg-gray-900"
              >
                <option value="">{t("No delivery")}</option>
                {DELIVERY_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>{t(s.label)}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="delivery-person" className="text-xs">{t("Delivery person")}</Label>
              <Input id="delivery-person" list="delivery-people" value={person} maxLength={60} onChange={(e) => setPerson(e.target.value)} placeholder={t("Driver's name")} />
              <datalist id="delivery-people">
                {(people || []).map((p) => <option key={p} value={p} />)}
              </datalist>
            </div>
            <Button onClick={save} disabled={!dirty || saving} className="w-full flex items-center gap-2" data-keep-label>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {t("Save delivery")}
            </Button>
          </>
        ) : (
          <div className="space-y-1 text-sm">
            <p className="flex justify-between gap-2"><span className="text-gray-500">{t("Delivery person")}</span><span className="font-medium">{order.deliveryPerson || "—"}</span></p>
          </div>
        )}
        {order.deliveredAt && (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {t("Delivered on")} {new Date(order.deliveredAt).toLocaleString()}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
