"use client";
import { t } from "@/lib/i18n";
import { useT } from "@/lib/i18n/LangProvider";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { format } from "@/lib/i18n/date";
import { toast } from "@/lib/i18n/toast";
import { ClipboardList, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useHasPermission } from "@/lib/useHasPermission";

const TYPE_LABELS = {
  damaged: "Damaged",
  lost: "Lost",
  expired: "Expired",
  correction: "Correction",
  other: "Other",
  // Only ever created programmatically (see models/Return.js) - never a
  // manual option below, but still needs a label/badge to display.
  returned: "Customer Return",
};

const TYPE_BADGE_CLASSES = {
  damaged: "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400",
  lost: "bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-400",
  expired: "bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400",
  correction: "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400",
  other: "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200",
  returned: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-400",
};

const MANUAL_TYPE_OPTIONS = Object.entries(TYPE_LABELS).filter(([value]) => value !== "returned");

const EMPTY_FORM = { type: "damaged", quantityChange: "", reason: "" };

export default function StockAdjustments({ productId, currentQuantity, unit }) {
  const t = useT();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const { hasPermission: canEditProducts } = useHasPermission("canEditProducts");

  const { data, isLoading, error } = useQuery({
    queryKey: ["stock-adjustments", productId],
    queryFn: async () => (await axios.get(`/api/products/${productId}/stock-adjustments`)).data,
    enabled: !!productId,
  });

  const adjustments = data?.adjustments || [];

  const mutation = useMutation({
    mutationFn: async (payload) =>
      (await axios.post(`/api/products/${productId}/stock-adjustments`, payload)).data,
    onSuccess: () => {
      toast.success("Stock adjustment recorded");
      setOpen(false);
      setForm(EMPTY_FORM);
      queryClient.invalidateQueries({ queryKey: ["stock-adjustments", productId] });
      queryClient.invalidateQueries({ queryKey: ["product", productId] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (err) => toast.error(err.response?.data?.error || "Failed to record adjustment"),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const parsedChange = parseInt(form.quantityChange, 10);
    if (isNaN(parsedChange) || parsedChange === 0) {
      toast.error("Enter a non-zero whole number for the quantity change");
      return;
    }
    mutation.mutate({
      type: form.type,
      quantityChange: parsedChange,
      reason: form.reason,
    });
  };

  return (
    <Card className="shadow-sm border-gray-200 dark:border-gray-800 mt-6">
      <CardHeader className="pb-4 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-lg flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-purple-600" />
          {t("Stock Adjustments")}
        </CardTitle>
        {canEditProducts && (
          <Button
            type="button"
            size="sm"
            onClick={() => setOpen(true)}
            className="bg-purple-600 hover:bg-purple-700 flex items-center gap-1.5"
          >
            <Plus className="h-4 w-4" />
            {t("Adjust Stock")}
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-32 w-full rounded-lg" />
        ) : error ? (
          <div className="text-red-500 text-center py-6">{t("Failed to load stock adjustments")}</div>
        ) : adjustments.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-6">
            {t("No stock adjustments recorded for this product yet.")}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("Type")}</TableHead>
                  <TableHead className="text-center">{t("Change")}</TableHead>
                  <TableHead className="text-center">{t("Before → After")}</TableHead>
                  <TableHead>{t("Reason")}</TableHead>
                  <TableHead>{t("By")}</TableHead>
                  <TableHead>{t("Date")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {adjustments.map((adj) => (
                  <TableRow key={adj._id}>
                    <TableCell>
                      <Badge className={TYPE_BADGE_CLASSES[adj.type] || "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200"}>
                        {TYPE_LABELS[adj.type] || adj.type}
                      </Badge>
                    </TableCell>
                    <TableCell
                      className={`text-center font-medium ${
                        adj.quantityChange >= 0 ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {adj.quantityChange > 0 ? "+" : ""}
                      {adj.quantityChange}
                    </TableCell>
                    <TableCell className="text-center text-gray-600 dark:text-gray-400">
                      {adj.quantityBefore} → {adj.quantityAfter}
                    </TableCell>
                    <TableCell className="text-gray-600 dark:text-gray-400 text-sm max-w-[220px] truncate">
                      {adj.reason || "—"}
                    </TableCell>
                    <TableCell className="text-gray-600 dark:text-gray-400 text-sm">{adj.adminName || "—"}</TableCell>
                    <TableCell className="text-gray-500 dark:text-gray-400 text-sm">
                      {format(new Date(adj.createdAt), "MMM d, yyyy")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={t("Adjust Stock")}
        description={
          currentQuantity != null
            ? t("Current stock: {0} {1}", {
            0: currentQuantity,
            1: unit || "pcs"
          })
            : undefined
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="adj-type">{t("Reason Type")}</Label>
            <select
              id="adj-type"
              value={form.type}
              onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value }))}
              className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded-md focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
            >
              {MANUAL_TYPE_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="adj-quantity">{t("Quantity Change")}</Label>
            <Input
              id="adj-quantity"
              placeholder={t("e.g. -5 or 3")}
              value={form.quantityChange}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  quantityChange: e.target.value.replace(/[^0-9-]/g, ""),
                }))
              }
              required
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t(
                "Use a negative number to remove stock (damaged/lost/expired), positive to add it back (e.g. a recount correction)."
              )}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="adj-reason">{t("Note (optional)")}</Label>
            <Input
              id="adj-reason"
              placeholder={t("e.g. Broken during delivery")}
              value={form.reason}
              onChange={(e) => setForm((prev) => ({ ...prev, reason: e.target.value }))}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)}>
              {t("Cancel")}
            </Button>
            <Button
              type="submit"
              disabled={mutation.isPending}
              className="flex-1 bg-purple-600 hover:bg-purple-700"
            >
              {mutation.isPending ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="animate-spin h-4 w-4" />
                  {t("Saving...")}
                </span>
              ) : (
                t("Save Adjustment")
              )}
            </Button>
          </div>
        </form>
      </Modal>
    </Card>
  );
}
