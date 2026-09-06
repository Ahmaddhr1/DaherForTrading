"use client";

import React, { useState } from "react";
import axios from "axios";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Loader2, ShoppingBag, ArrowLeft, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useMutation, useQuery } from "@tanstack/react-query";

let nextRowId = 1;
const emptyRow = () => ({ id: nextRowId++, productId: "", unitPrice: "", quantity: "1" });

const NewPurchasePage = () => {
  const { id: companyId } = useParams();
  const router = useRouter();

  const [rows, setRows] = useState([emptyRow()]);
  const [paid, setPaid] = useState(true);

  const { data: company } = useQuery({
    queryKey: ["company", companyId],
    queryFn: async () => {
      const res = await axios.get(`/api/companies/${companyId}`);
      return res.data;
    },
    enabled: !!companyId,
  });

  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ["products-all"],
    queryFn: async () => {
      const res = await axios.get("/api/products");
      return res.data;
    },
  });

  const addRow = () => setRows((prev) => [...prev, emptyRow()]);
  const removeRow = (id) => setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.id !== id) : prev));

  const updateRow = (id, field, value) => {
    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        const updated = { ...row, [field]: value };
        // Prefill the unit price with the product's current cost when selected
        if (field === "productId") {
          const product = products.find((p) => p._id === value);
          updated.unitPrice = product?.initialPrice?.toString() || "";
        }
        return updated;
      })
    );
  };

  const mutation = useMutation({
    mutationFn: async () => {
      // Each row is its own Purchase record - post them one at a time so a
      // failure partway through doesn't leave duplicate stock increments
      // from a retried Promise.all.
      for (const row of rows) {
        await axios.post(`/api/companies/${companyId}/purchases`, {
          productId: row.productId,
          unitPrice: parseFloat(row.unitPrice),
          quantity: parseInt(row.quantity, 10),
          paid,
        });
      }
    },
    onSuccess: () => {
      toast.success(
        rows.length > 1 ? `${rows.length} purchases recorded successfully!` : "Purchase recorded successfully!"
      );
      router.push(`/dashboard/companies/${companyId}/purchases`);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to record purchase");
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();

    for (const row of rows) {
      if (!row.productId) {
        toast.error("Please select a product for every row");
        return;
      }
      if (!row.unitPrice || parseFloat(row.unitPrice) <= 0) {
        toast.error("Please enter a valid unit price for every row");
        return;
      }
      if (!row.quantity || parseInt(row.quantity, 10) <= 0) {
        toast.error("Quantity must be at least 1 for every row");
        return;
      }
    }

    if (!window.confirm(`Record ${rows.length > 1 ? "these purchases" : "this purchase"} for $${total.toFixed(3)}? Stock will increase and the company's balance will be updated.`)) {
      return;
    }

    mutation.mutate();
  };

  const total = rows.reduce(
    (sum, row) => sum + (parseFloat(row.unitPrice) || 0) * (parseInt(row.quantity, 10) || 0),
    0
  );

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="container mx-auto px-4 max-w-3xl">
        <div className="mb-8">
          <Link href={`/dashboard/companies/${companyId}`}>
            <Button variant="ghost" className="mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-900">
              <ArrowLeft className="h-4 w-4" />
              Back to Company
            </Button>
          </Link>

          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <ShoppingBag className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">New Purchase</h1>
              <p className="text-gray-600">
                Record a restock purchase{company?.name ? ` from ${company.name}` : ""}
              </p>
            </div>
          </div>
        </div>

        <Card className="shadow-sm border-gray-200">
          <CardHeader>
            <CardTitle className="text-xl">Purchase Details</CardTitle>
            <CardDescription>Select the products and enter purchase quantity and pricing</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                {rows.map((row, index) => {
                  const rowProduct = products.find((p) => p._id === row.productId);
                  return (
                    <div key={row.id} className="p-4 border rounded-lg bg-gray-50 space-y-4">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium">Product {index + 1} *</Label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeRow(row.id)}
                          disabled={rows.length <= 1}
                          className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <select
                        value={row.productId}
                        onChange={(e) => updateRow(row.id, "productId", e.target.value)}
                        className="w-full p-2 border rounded-md focus:border-blue-500"
                        disabled={productsLoading}
                        required
                      >
                        <option value="">Select a product</option>
                        {products.map((product) => (
                          <option key={product._id} value={product._id}>
                            {product.name} (current stock: {product.quantity})
                          </option>
                        ))}
                      </select>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Unit Price ($) *</Label>
                          <Input
                            type="text"
                            inputMode="decimal"
                            placeholder="0.00"
                            value={row.unitPrice}
                            onChange={(e) => updateRow(row.id, "unitPrice", e.target.value.replace(/[^0-9.]/g, ""))}
                            required
                          />
                          {rowProduct && (
                            <p className="text-xs text-gray-500">
                              Current cost on file: ${rowProduct.initialPrice?.toFixed(3)}
                            </p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Quantity Purchased *</Label>
                          <Input
                            type="number"
                            min="1"
                            value={row.quantity}
                            onChange={(e) => updateRow(row.id, "quantity", e.target.value)}
                            required
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={addRow}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Another Product
              </Button>

              <Separator />

              <div className="flex items-center gap-3">
                <input
                  id="paid"
                  type="checkbox"
                  checked={paid}
                  onChange={(e) => setPaid(e.target.checked)}
                  className="h-4 w-4"
                />
                <Label htmlFor="paid" className="text-sm font-medium">
                  Paid in full at time of purchase
                </Label>
              </div>
              {!paid && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2">
                  This purchase is unpaid — the full total will be added to what we owe this company.
                </p>
              )}

              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-blue-900">Total Amount:</span>
                  <span className="text-2xl font-bold text-blue-900">${total.toFixed(3)}</span>
                </div>
                {!paid && (
                  <div className="flex justify-between items-center mt-2 text-sm">
                    <span className="text-amber-700">Added to company debt</span>
                    <Badge variant="destructive">+${total.toFixed(3)}</Badge>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <Link href={`/dashboard/companies/${companyId}`} className="flex-1">
                  <Button type="button" variant="outline" className="w-full">
                    Cancel
                  </Button>
                </Link>
                <Button
                  type="submit"
                  disabled={mutation.isPending}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  {mutation.isPending ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="animate-spin h-4 w-4" />
                      Recording Purchase...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <ShoppingBag className="h-4 w-4" />
                      Record Purchase
                    </span>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default NewPurchasePage;
