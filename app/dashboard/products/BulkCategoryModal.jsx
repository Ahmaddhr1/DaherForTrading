"use client";
import { t } from "@/core/shared/i18n";
import { useT } from "@/core/shared/i18n/LangProvider";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "@/core/shared/i18n/toast";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

export default function BulkCategoryModal({ open, onClose, productIds, categories, onDone }) {
  const t = useT();
  const [categoryId, setCategoryId] = useState("");
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      const response = await axios.post("/api/products/bulk", {
        action: "categoryReassign",
        productIds,
        categoryId: categoryId || null,
      });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(["products"]);
      queryClient.invalidateQueries(["categories"]);
      toast.success(t("Reassigned {0} product{1}", {
        0: data.updated,
        1: data.updated === 1 ? "" : "s"
      }));
      onDone?.();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Bulk category reassign failed");
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    mutation.mutate();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("Bulk Reassign Category")}
      description={t("Applies to {0} selected product{1}", {
        0: productIds.length,
        1: productIds.length === 1 ? "" : "s"
      })}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="bulk-category">{t("New Category")}</Label>
          <select
            id="bulk-category"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full border rounded-md text-sm px-2 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">{t("No category")}</option>
            {categories.map((cat) => (
              <option key={cat._id} value={cat._id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

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
