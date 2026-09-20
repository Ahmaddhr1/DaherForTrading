"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { format } from "date-fns";
import { toast } from "sonner";
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

const TYPE_LABELS = {
  damaged: "Damaged",
  lost: "Lost",
  expired: "Expired",
  correction: "Correction",
  other: "Other",
};

const TYPE_BADGE_CLASSES = {
  damaged: "bg-red-100 text-red-800",
  lost: "bg-orange-100 text-orange-800",
  expired: "bg-amber-100 text-amber-800",
  correction: "bg-blue-100 text-blue-800",
  other: "bg-gray-100 text-gray-800",
};

const EMPTY_FORM = { type: "damaged", quantityChange: "", reason: "" };

export default function StockAdjustments({ productId, currentQuantity, unit }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

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
    <Card className="shadow-sm border-gray-200 mt-6">
      <CardHeader className="pb-4 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-lg flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-purple-600" />
          Stock Adjustments
        </CardTitle>
        <Button
          type="button"
          size="sm"
          onClick={() => setOpen(true)}
          className="bg-purple-600 hover:bg-purple-700 flex items-center gap-1.5"
        >
          <Plus className="h-4 w-4" />
          Adjust Stock
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-32 w-full rounded-lg" />
        ) : error ? (
          <div className="text-red-500 text-center py-6">Failed to load stock adjustments</div>
        ) : adjustments.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-6">
            No stock adjustments recorded for this product yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-center">Change</TableHead>
                  <TableHead className="text-center">Before → After</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>By</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {adjustments.map((adj) => (
                  <TableRow key={adj._id}>
                    <TableCell>
                      <Badge className={TYPE_BADGE_CLASSES[adj.type] || "bg-gray-100 text-gray-800"}>
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
                    <TableCell className="text-center text-gray-600">
                      {adj.quantityBefore} → {adj.quantityAfter}
                    </TableCell>
                    <TableCell className="text-gray-600 text-sm max-w-[220px] truncate">
                      {adj.reason || "—"}
                    </TableCell>
                    <TableCell className="text-gray-600 text-sm">{adj.adminName || "—"}</TableCell>
                    <TableCell className="text-gray-500 text-sm">
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
        title="Adjust Stock"
        description={
          currentQuantity != null
            ? `Current stock: ${currentQuantity} ${unit || "pcs"}`
            : undefined
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="adj-type">Reason Type</Label>
            <select
              id="adj-type"
              value={form.type}
              onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value }))}
              className="w-full p-2 border border-gray-300 rounded-md focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
            >
              {Object.entries(TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="adj-quantity">Quantity Change</Label>
            <Input
              id="adj-quantity"
              placeholder="e.g. -5 or 3"
              value={form.quantityChange}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  quantityChange: e.target.value.replace(/[^0-9-]/g, ""),
                }))
              }
              required
            />
            <p className="text-xs text-gray-500">
              Use a negative number to remove stock (damaged/lost/expired), positive to add it back
              (e.g. a recount correction).
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="adj-reason">Note (optional)</Label>
            <Input
              id="adj-reason"
              placeholder="e.g. Broken during delivery"
              value={form.reason}
              onChange={(e) => setForm((prev) => ({ ...prev, reason: e.target.value }))}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={mutation.isPending}
              className="flex-1 bg-purple-600 hover:bg-purple-700"
            >
              {mutation.isPending ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="animate-spin h-4 w-4" />
                  Saving...
                </span>
              ) : (
                "Save Adjustment"
              )}
            </Button>
          </div>
        </form>
      </Modal>
    </Card>
  );
}
