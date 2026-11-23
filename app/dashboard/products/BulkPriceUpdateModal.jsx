"use client";
import { t } from "@/core/shared/i18n";
import { useT } from "@/core/shared/i18n/LangProvider";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "@/core/shared/i18n/toast";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

const FIELD_OPTIONS = [
  { value: "price", label: "Price (Retail)" },
  { value: "priceWholesale", label: "Price (Wholesale)" },
  { value: "priceDistributor", label: "Price (Distributor)" },
  { value: "priceVip", label: "Price (VIP)" },
  { value: "initialPrice", label: "Cost Price" },
  { value: "discount", label: "Discount (%)" },
];

const MODE_OPTIONS = [
  { value: "increasePercent", label: "Increase by %" },
  { value: "decreasePercent", label: "Decrease by %" },
  { value: "increaseAmount", label: "Increase by $" },
  { value: "decreaseAmount", label: "Decrease by $" },
  { value: "set", label: "Set to exact value" },
];

export default function BulkPriceUpdateModal({ open, onClose, productIds, onDone }) {
  const t = useT();
  const [field, setField] = useState("price");
  const [mode, setMode] = useState("increasePercent");
  const [value, setValue] = useState("");
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      const response = await axios.post("/api/products/bulk", {
        action: "priceUpdate",
        productIds,
        field,
        mode,
        value: parseFloat(value),
      });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(["products"]);
      const skippedCount = data.skipped?.length || 0;
      if (skippedCount > 0) {
        toast.warning(
          t("Updated {0} product{1}, skipped {2} ({3}{4})", {
            0: data.updated,
            1: data.updated === 1 ? "" : "s",
            2: skippedCount,

            3: data.skipped
              .slice(0, 3)
              .map((s) => s.name)
              .join(", "),

            4: skippedCount > 3 ? "…" : ""
          })
        );
      } else {
        toast.success(t("Updated {0} product{1}", {
          0: data.updated,
          1: data.updated === 1 ? "" : "s"
        }));
      }
      setValue("");
      onDone?.();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Bulk price update failed");
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const parsed = parseFloat(value);
    if (isNaN(parsed) || parsed < 0) {
      toast.error("Enter a value of 0 or more");
      return;
    }
    mutation.mutate();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("Bulk Price Update")}
      description={t("Applies to {0} selected product{1}", {
        0: productIds.length,
        1: productIds.length === 1 ? "" : "s"
      })}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="bulk-field">{t("Field")}</Label>
          <select
            id="bulk-field"
            value={field}
            onChange={(e) => setField(e.target.value)}
            className="w-full border rounded-md text-sm px-2 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {FIELD_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {t(opt.label)}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="bulk-mode">{t("Adjustment")}</Label>
          <select
            id="bulk-mode"
            value={mode}
            onChange={(e) => setMode(e.target.value)}
            className="w-full border rounded-md text-sm px-2 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {MODE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {t(opt.label)}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="bulk-value">{t("Value")}</Label>
          <Input
            id="bulk-value"
            type="number"
            min="0"
            step="0.01"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={mode.includes("Percent") ? t("e.g. 10") : t("e.g. 5.00")}
            required
          />
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-400">
          {field === "discount"
            ? t(
            "Products where this would push the discount above 100% are skipped automatically and reported after applying."
          )
            : t(
            "Products where this would make the cost price exceed the selling price are skipped automatically and reported after applying."
          )}
        </p>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={mutation.isPending}>
            {t("Cancel")}
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("Applying...")}
              </span>
            ) : (
              t("Apply")
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
