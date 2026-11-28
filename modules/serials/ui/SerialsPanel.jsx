"use client";
// Product page: this product's units by serial / IMEI - record new ones
// (scan one per line), see which are in stock or sold, mark returns.
import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { ScanLine, Loader2, Plus } from "lucide-react";
import { useT } from "@/core/shared/i18n/LangProvider";
import { toast } from "@/core/shared/i18n/toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAnyPermission } from "@/modules/ui/lists";
import { StatusBadge, UnitActions } from "./common";

export function SerialsPanel({ product }) {
  const t = useT();
  const qc = useQueryClient();
  const canAdd = useAnyPermission(["canEditProducts", "canRecordPurchases"]);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const key = ["serials", "product", product._id];
  const { data, isLoading } = useQuery({ queryKey: key, queryFn: async () => (await axios.get("/api/modules/serials", { params: { productId: product._id } })).data });
  const add = useMutation({
    mutationFn: async () => (await axios.post("/api/modules/serials", { productId: product._id, serials: text })).data,
    onSuccess: (d) => {
      toast.success(t("{0} serial number(s) recorded", { 0: d.count }));
      setText("");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["serials"] });
    },
    onError: (e) => toast.error(e.response?.data?.error || "Couldn't record the serial numbers"),
  });
  const counts = data?.counts || {};
  const inStock = counts.in_stock || 0;
  const tracked = !!product.extra?.serials?.track;
  if (!tracked && !data?.total) return null;
  const mismatch = tracked && inStock !== product.quantity;

  return (
    <Card className="shadow-sm border-gray-200 dark:border-gray-800">
      <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <ScanLine className="h-4 w-4" />
          {t("Serial numbers / IMEI")}
        </CardTitle>
        {canAdd && (
          <Button size="sm" variant="outline" onClick={() => setOpen((v) => !v)} className="flex items-center gap-1" data-keep-label>
            <Plus className="h-3.5 w-3.5" /> {t("Add units")}
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex flex-wrap gap-2">
          {["in_stock", "sold", "returned", "defective"].map((s) => (
            <span key={s} className="inline-flex items-center gap-1.5">
              <StatusBadge status={s} /> {counts[s] || 0}
            </span>
          ))}
        </div>
        {mismatch && (
          <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
            {t("Stock is {0} but {1} unit(s) are recorded in stock - scan the missing serials.", { 0: product.quantity, 1: inStock })}
          </p>
        )}
        {open && (
          <div className="space-y-2">
            <textarea
              autoFocus
              rows={4}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t("Scan or type one serial / IMEI per line")}
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 font-mono text-sm dark:bg-input/30"
            />
            <Button size="sm" onClick={() => add.mutate()} disabled={add.isPending || !text.trim()} data-keep-label>
              {add.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : t("Save")}
            </Button>
          </div>
        )}
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            {(data?.units || []).slice(0, 20).map((u) => (
              <li key={u._id} className="flex flex-wrap items-center justify-between gap-2 py-1.5">
                <span className="font-mono ltr-text">{u.serial}</span>
                <span className="flex flex-wrap items-center gap-2">
                  {u.customer && <span className="text-xs text-gray-500">{u.customer.fullName}</span>}
                  <StatusBadge status={u.status} />
                  <UnitActions unit={u} />
                </span>
              </li>
            ))}
          </ul>
        )}
        {(data?.total || 0) > 20 && (
          <Link href={`/dashboard/serials?productId=${product._id}`} className="text-xs text-blue-600 hover:underline">
            {t("See all {0}", { 0: data.total })}
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
