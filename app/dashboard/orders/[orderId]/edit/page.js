"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { PageHeaderSkeleton, ListSkeleton } from "@/components/ui/skeleton-patterns";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, PencilLine, ArrowLeft } from "lucide-react";
import Link from "next/link";

let rowIdCounter = 1;

export default function EditOrderPage() {
  const { orderId } = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [products, setProducts] = useState([]);
  const [orderRows, setOrderRows] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: order, isLoading: isLoadingOrder } = useQuery({
    queryKey: ["order", orderId],
    queryFn: async () => {
      const res = await axios.get(`/api/orders/${orderId}`);
      return res.data;
    },
    enabled: !!orderId,
  });

  const { data: productsData, isLoading: isLoadingProducts } = useQuery({
    queryKey: ["products-all"],
    queryFn: async () => {
      const res = await axios.get("/api/products");
      return res.data;
    },
  });

  useEffect(() => {
    if (productsData) setProducts(productsData);
  }, [productsData]);

  useEffect(() => {
    if (order?.products?.length) {
      setOrderRows(
        order.products.map((p) => ({
          id: rowIdCounter++,
          productId: p.productId?._id || p.productId,
          quantity: p.quantity,
          price: p.price.toString(),
        }))
      );
    }
  }, [order]);

  const addProductRow = () => {
    setOrderRows((rows) => [...rows, { id: rowIdCounter++, productId: "", quantity: 1, price: "" }]);
  };

  const removeProductRow = (id) => {
    setOrderRows((rows) => (rows.length > 1 ? rows.filter((row) => row.id !== id) : rows));
  };

  const handleRowChange = (id, field, value) => {
    setOrderRows((rows) =>
      rows.map((row) => {
        if (row.id !== id) return row;
        const updatedRow = { ...row };
        if (field === "productId") {
          updatedRow.productId = value;
          const selectedProduct = products.find((p) => p._id === value);
          if (selectedProduct) updatedRow.price = selectedProduct.price.toString();
        } else if (field === "quantity") {
          updatedRow.quantity = parseInt(value) || 1;
        } else if (field === "price") {
          updatedRow.price = value.replace(/[^0-9.]/g, "");
        }
        return updatedRow;
      })
    );
  };

  const calculateTotal = () =>
    orderRows.reduce((total, row) => total + ((parseFloat(row.price) || 0) * (row.quantity || 0)), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();

    for (const row of orderRows) {
      if (!row.productId) return toast.error("Please select a product for all items");
      if (!row.quantity || row.quantity < 1) return toast.error("Quantity must be at least 1");
      if (!row.price || parseFloat(row.price) <= 0) return toast.error("Please enter a valid price");
    }

    setIsSubmitting(true);
    try {
      await axios.put(`/api/orders/${orderId}`, {
        products: orderRows.map((row) => ({
          productId: row.productId,
          quantity: row.quantity,
          price: parseFloat(row.price),
        })),
      });

      toast.success("Order updated successfully!");
      queryClient.invalidateQueries({ queryKey: ["order", orderId] });
      queryClient.invalidateQueries({ queryKey: ["customer-orders"] });
      queryClient.invalidateQueries({ queryKey: ["customer", order?.customer?._id] });
      router.push(`/dashboard/orders/${orderId}`);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update order");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLoading = isLoadingOrder || isLoadingProducts || orderRows.length === 0;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-6">
        <div className="container mx-auto px-4 max-w-4xl">
          <PageHeaderSkeleton />
          <Card className="shadow-sm border-gray-200">
            <CardContent className="pt-6">
              <ListSkeleton rows={2} rowHeight="h-16" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (order && order.status !== "pending") {
    return (
      <div className="min-h-screen bg-gray-50 py-6">
        <div className="container mx-auto px-4 max-w-xl text-center">
          <p className="text-gray-600 mb-4">Only pending orders can be updated. This order is {order.status}.</p>
          <Link href={`/dashboard/orders/${orderId}`}>
            <Button variant="outline">Back to Order</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="mb-8">
          <Link href={`/dashboard/orders/${orderId}`}>
            <Button variant="ghost" className="mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-900">
              <ArrowLeft className="h-4 w-4" />
              Back to Order
            </Button>
          </Link>

          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <PencilLine className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Update Order</h1>
              <p className="text-gray-600">Edit products, quantities, and prices for this pending order</p>
            </div>
          </div>
        </div>

        <Card className="shadow-sm border-gray-200">
          <CardHeader>
            <CardTitle className="text-xl">Order Details</CardTitle>
            <CardDescription>Update products and quantities for this order</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                {orderRows.map((row, index) => (
                  <div key={row.id} className="p-4 border rounded-lg bg-gray-50 space-y-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor={`product-${row.id}`} className="text-sm font-medium">
                        Product {index + 1}
                      </Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeProductRow(row.id)}
                        disabled={orderRows.length <= 1}
                        className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <select
                      id={`product-${row.id}`}
                      value={row.productId}
                      onChange={(e) => handleRowChange(row.id, "productId", e.target.value)}
                      className="w-full p-2 border rounded-md focus:border-blue-500"
                      required
                    >
                      <option value="">Select a product</option>
                      {products.map((product) => (
                        <option key={product._id} value={product._id}>
                          {product.name}
                        </option>
                      ))}
                    </select>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor={`price-${row.id}`} className="text-sm font-medium">
                          Price ($)
                        </Label>
                        <Input
                          id={`price-${row.id}`}
                          type="text"
                          value={row.price}
                          onChange={(e) => handleRowChange(row.id, "price", e.target.value)}
                          placeholder="0.00"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`quantity-${row.id}`} className="text-sm font-medium">
                          Quantity
                        </Label>
                        <Input
                          id={`quantity-${row.id}`}
                          type="number"
                          min="1"
                          value={row.quantity}
                          onChange={(e) => handleRowChange(row.id, "quantity", e.target.value)}
                          required
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <Button type="button" variant="outline" onClick={addProductRow} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Another Product
              </Button>

              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-blue-900">Total Amount:</span>
                  <span className="text-2xl font-bold text-blue-900">${calculateTotal().toFixed(3)}</span>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Link href={`/dashboard/orders/${orderId}`} className="flex-1">
                  <Button type="button" variant="outline" className="w-full">
                    Cancel
                  </Button>
                </Link>
                <Button type="submit" disabled={isSubmitting} className="flex-1 bg-blue-600 hover:bg-blue-700">
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="animate-spin h-4 w-4" />
                      Updating Order...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <PencilLine className="h-4 w-4" />
                      Update Order
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
}
