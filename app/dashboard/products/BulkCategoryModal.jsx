"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "sonner";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

export default function BulkCategoryModal({ open, onClose, productIds, categories, onDone }) {
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
      toast.success(`Reassigned ${data.updated} product${data.updated === 1 ? "" : "s"}`);
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
      title="Bulk Reassign Category"
      description={`Applies to ${productIds.length} selected product${productIds.length === 1 ? "" : "s"}`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="bulk-category">New Category</Label>
          <select
            id="bulk-category"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full border rounded-md text-sm px-2 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">No category</option>
            {categories.map((cat) => (
              <option key={cat._id} value={cat._id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Applying...
              </span>
            ) : (
              "Apply"
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
