// app/dashboard/customers/[id]/addorder/page.jsx
"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ListSkeleton, PageHeaderSkeleton } from "@/components/ui/skeleton-patterns";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, ShoppingCart, ArrowLeft, Save, Layers, Gift, PackagePlus } from "lucide-react";
import Link from "next/link";
import { useSettings, formatLL } from "@/lib/currency";
import { Combobox } from "@/components/ui/combobox";
import { getTierPrice, getTierLabel } from "@/lib/priceTiers";

let rowIdCounter = 1;

const makeProductRow = () => ({
  id: rowIdCounter++,
  isCustom: false,
  productId: "",
  customName: "",
  quantity: 1,
  price: "",
  discount: "",
  free: false,
});

const makeCustomRow = (forceFree) => ({
  id: rowIdCounter++,
  isCustom: true,
  productId: "",
  customName: "",
  quantity: 1,
  price: "",
  discount: "",
  free: forceFree,
});

const MakeOrderPage = () => {
  const { id: customerId } = useParams();
  const router = useRouter();

  const { data: settings } = useSettings();

  // Only an owner can price a catalog product away from its tier price or
  // price a custom item at all - see priceOrderItems in the orders API,
  // which enforces this server-side too, not just here.
  const { data: me } = useQuery({
    queryKey: ["admin", "me"],
    queryFn: async () => (await axios.get("/api/admin/me")).data,
  });
  const isOwner = me?.role === "owner";

  const { data: customer, isLoading: isLoadingCustomer } = useQuery({
    queryKey: ["customer", customerId],
    queryFn: async () => (await axios.get(`/api/customers/${customerId}`)).data,
    enabled: !!customerId,
  });
  const priceTier = customer?.priceTier || 1;

  const [products, setProducts] = useState([]);
  const [orderRows, setOrderRows] = useState([makeProductRow()]);
  const [taxRate, setTaxRate] = useState("");
  const [taxRateTouched, setTaxRateTouched] = useState(false);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);

  // Pre-fill the tax rate from business settings once, unless the user has
  // already changed it for this order.
  useEffect(() => {
    if (settings && !taxRateTouched) {
      setTaxRate(settings.taxRate?.toString() || "0");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings]);

  // Load products
  useEffect(() => {
    const loadProducts = async () => {
      try {
        const response = await axios.get("/api/products");
        setProducts(response.data);
      } catch (error) {
        toast.error("Failed to load products");
      } finally {
        setIsLoadingProducts(false);
      }
    };

    loadProducts();
  }, []);

  const addProductRow = () => {
    setOrderRows((rows) => [...rows, makeProductRow()]);
  };

  // Employees can only ever add a custom item as a giveaway (free) - pricing
  // something outside the catalog is owner-only, enforced again server-side.
  const addCustomRow = () => {
    setOrderRows((rows) => [...rows, makeCustomRow(!isOwner)]);
  };

  // Remove product row
  const removeProductRow = (id) => {
    if (orderRows.length > 1) {
      setOrderRows(orderRows.filter((row) => row.id !== id));
    }
  };

  // Handle row changes
  const handleRowChange = (id, field, value) => {
    setOrderRows(orderRows.map((row) => {
      if (row.id !== id) return row;

      const updatedRow = { ...row };

      if (field === "productId") {
        updatedRow.productId = value;
        // Auto-fill price from this customer's tier when a product is
        // selected - manually editable afterward, but only by an owner.
        const selectedProduct = products.find((p) => p._id === value);
        if (selectedProduct && !updatedRow.free) {
          updatedRow.price = getTierPrice(selectedProduct, priceTier).toString();
        }
      }
      else if (field === "customName") {
        updatedRow.customName = value;
      }
      else if (field === "quantity") {
        updatedRow.quantity = parseInt(value) || 1;
      }
      else if (field === "price") {
        if (!isOwner) return row; // price is locked for employees
        updatedRow.price = value.replace(/[^0-9.]/g, "");
      }
      else if (field === "discount") {
        updatedRow.discount = value.replace(/[^0-9.]/g, "");
      }
      else if (field === "free") {
        updatedRow.free = value;
        if (value) {
          updatedRow.price = "0";
        } else if (!updatedRow.isCustom) {
          // Un-checking "Free" on a catalog product row restores its tier
          // price. A custom row just goes back to blank (only an owner can
          // set it, and they'll type it in).
          const selectedProduct = products.find((p) => p._id === updatedRow.productId);
          updatedRow.price = selectedProduct ? getTierPrice(selectedProduct, priceTier).toString() : "";
        } else {
          updatedRow.price = "";
        }
      }

      return updatedRow;
    }));
  };

  // Subtotal before any discount
  const calculateSubtotal = () => {
    return orderRows.reduce((total, row) => {
      const price = parseFloat(row.price) || 0;
      const quantity = row.quantity || 0;
      return total + (price * quantity);
    }, 0);
  };

  const calculateDiscountTotal = () => {
    return orderRows.reduce((total, row) => total + (parseFloat(row.discount) || 0), 0);
  };

  const calculateAfterDiscount = () => Math.max(0, calculateSubtotal() - calculateDiscountTotal());

  const calculateTaxAmount = () => calculateAfterDiscount() * ((parseFloat(taxRate) || 0) / 100);

  // Grand total = what the customer actually owes (used for the order's
  // `total` and added to their debt)
  const calculateTotal = () => calculateAfterDiscount() + calculateTaxAmount();

  const validateRows = () => {
    for (const row of orderRows) {
      if (row.isCustom) {
        if (!row.customName.trim()) {
          toast.error("Please name every custom item");
          return false;
        }
      } else if (!row.productId) {
        toast.error("Please select a product for all items");
        return false;
      }
      if (!row.quantity || row.quantity < 1) {
        toast.error("Quantity must be at least 1");
        return false;
      }
      if (!row.free && (row.price === "" || parseFloat(row.price) <= 0)) {
        toast.error(
          row.isCustom
            ? "Please enter a price for every custom item, or mark it Free"
            : "Please enter a valid price"
        );
        return false;
      }
      const lineSubtotal = (parseFloat(row.price) || 0) * (row.quantity || 0);
      if (row.discount && parseFloat(row.discount) > lineSubtotal) {
        toast.error("A line's discount can't be more than its own subtotal");
        return false;
      }
    }
    return true;
  };

  const buildOrderPayload = (extra) => ({
    products: orderRows.map((row) => ({
      productId: row.isCustom ? undefined : row.productId,
      name: row.isCustom ? row.customName.trim() : undefined,
      isCustom: row.isCustom,
      quantity: row.quantity,
      price: parseFloat(row.price) || 0,
      discount: parseFloat(row.discount) || 0,
      free: row.free,
    })),
    taxRate: parseFloat(taxRate) || 0,
    ...extra,
  });

  // Submit order (real order - deducts stock and adds to the customer's debt)
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateRows()) return;

    if (!window.confirm(`Create this order for $${calculateTotal().toFixed(2)}? This will deduct stock and add to the customer's debt.`)) {
      return;
    }

    setIsSubmitting(true);

    try {
      await axios.post(`/api/orders/${customerId}`, buildOrderPayload());

      toast.success("Order created successfully!");
      router.push(`/dashboard/customers/${customerId}/orders`);

    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create order");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Save as a draft - no stock deduction, no debt change, can be resumed or
  // finalized into a real order later.
  const handleSaveDraft = async () => {
    if (!validateRows()) return;

    setIsSavingDraft(true);
    try {
      await axios.post(`/api/orders/${customerId}`, buildOrderPayload({ asDraft: true }));

      toast.success("Draft saved!");
      router.push(`/dashboard/customers/${customerId}/orders`);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save draft");
    } finally {
      setIsSavingDraft(false);
    }
  };

  const isLoading = isLoadingProducts || isLoadingCustomer;

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

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="container mx-auto px-4 max-w-4xl">

        {/* Header */}
        <div className="mb-8">
          <Link href={`/dashboard/customers/${customerId}`}>
            <Button variant="ghost" className="mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-900">
              <ArrowLeft className="h-4 w-4" />
              Back to Customer
            </Button>
          </Link>

          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <ShoppingCart className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Create New Order</h1>
              <p className="text-gray-600">Add products to create an order</p>
            </div>
          </div>
          {customer && (
            <p className="flex items-center gap-1.5 text-sm text-gray-500 mt-1">
              <Layers className="h-3.5 w-3.5" />
              Pricing for {customer.fullName}: <span className="font-medium text-gray-700">{getTierLabel(priceTier)}</span>
            </p>
          )}
          {!isOwner && (
            <p className="text-xs text-gray-500 mt-1">
              Prices are set automatically for your account. Ask an owner to override a price or price a custom item.
            </p>
          )}
        </div>

        <Card className="shadow-sm border-gray-200">
          <CardHeader>
            <CardTitle className="text-xl">Order Details</CardTitle>
            <CardDescription>Select products and quantities for this order</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">

              {/* Product Rows */}
              <div className="space-y-4">
                {orderRows.map((row, index) => (
                  <div key={row.id} className="p-4 border rounded-lg bg-gray-50 space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">
                        {row.isCustom ? "Custom Item" : "Product"} {index + 1}
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

                    {/* Product Selection / Custom Item Name */}
                    {row.isCustom ? (
                      <Input
                        type="text"
                        value={row.customName}
                        onChange={(e) => handleRowChange(row.id, "customName", e.target.value)}
                        placeholder="Item name (not in inventory)"
                        required
                      />
                    ) : (
                      <Combobox
                        id={`product-${row.id}`}
                        options={products}
                        value={row.productId}
                        onChange={(value) => handleRowChange(row.id, "productId", value)}
                        placeholder="Select a product"
                        renderOption={(product) => (
                          <span>
                            {product.name}{" "}
                            <span className="text-gray-400">
                              (${getTierPrice(product, priceTier).toFixed(2)} · stock: {product.quantity})
                            </span>
                          </span>
                        )}
                      />
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {/* Price */}
                      <div className="space-y-2">
                        <Label htmlFor={`price-${row.id}`} className="text-sm font-medium">
                          Price ($)
                        </Label>
                        <Input
                          id={`price-${row.id}`}
                          type="text"
                          value={row.free ? "0" : row.price}
                          onChange={(e) => handleRowChange(row.id, "price", e.target.value)}
                          placeholder={row.isCustom ? "0.00" : "Select a product"}
                          disabled={row.free || !isOwner}
                          className={row.free || !isOwner ? "bg-gray-100 text-gray-500" : ""}
                          required
                        />
                      </div>

                      {/* Quantity */}
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

                      {/* Discount */}
                      <div className="space-y-2">
                        <Label htmlFor={`discount-${row.id}`} className="text-sm font-medium">
                          Discount ($)
                        </Label>
                        <Input
                          id={`discount-${row.id}`}
                          type="text"
                          value={row.discount}
                          onChange={(e) => handleRowChange(row.id, "discount", e.target.value)}
                          placeholder="0.00"
                          disabled={row.free}
                        />
                      </div>
                    </div>

                    <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer w-fit">
                      <input
                        type="checkbox"
                        checked={row.free}
                        disabled={row.isCustom && !isOwner}
                        onChange={(e) => handleRowChange(row.id, "free", e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                      />
                      <Gift className="h-3.5 w-3.5 text-green-600" />
                      Free (offer)
                    </label>
                  </div>
                ))}
              </div>

              {/* Add Row Buttons */}
              <div className="flex flex-wrap gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={addProductRow}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Another Product
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={addCustomRow}
                  className="flex items-center gap-2"
                >
                  <PackagePlus className="h-4 w-4" />
                  Add Custom Item
                </Button>
              </div>

              {/* Tax Rate */}
              <div className="space-y-2 max-w-xs">
                <Label htmlFor="tax-rate" className="text-sm font-medium">
                  Tax Rate (%)
                </Label>
                <Input
                  id="tax-rate"
                  type="text"
                  value={taxRate}
                  onChange={(e) => {
                    setTaxRateTouched(true);
                    setTaxRate(e.target.value.replace(/[^0-9.]/g, ""));
                  }}
                  placeholder="0"
                />
              </div>

              {/* Total Amount */}
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200 space-y-2">
                <div className="flex justify-between items-center text-sm text-blue-900/80">
                  <span>Subtotal</span>
                  <span>${calculateSubtotal().toFixed(2)}</span>
                </div>
                {calculateDiscountTotal() > 0 && (
                  <div className="flex justify-between items-center text-sm text-amber-700">
                    <span>Discount</span>
                    <span>-${calculateDiscountTotal().toFixed(2)}</span>
                  </div>
                )}
                {calculateTaxAmount() > 0 && (
                  <div className="flex justify-between items-center text-sm text-blue-900/80">
                    <span>Tax ({parseFloat(taxRate) || 0}%)</span>
                    <span>+${calculateTaxAmount().toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-2 border-t border-blue-200">
                  <span className="text-lg font-semibold text-blue-900">Total Amount:</span>
                  <span className="text-2xl font-bold text-blue-900">
                    ${calculateTotal().toFixed(2)}
                  </span>
                </div>
                {settings?.dollarRate > 0 && (
                  <div className="flex justify-between items-center text-sm text-blue-900/70">
                    <span>≈</span>
                    <span>{formatLL(calculateTotal(), settings.dollarRate)}</span>
                  </div>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <Link href={`/dashboard/customers/${customerId}`} className="sm:flex-1">
                  <Button type="button" variant="outline" className="w-full">
                    Cancel
                  </Button>
                </Link>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSaveDraft}
                  disabled={isSubmitting || isSavingDraft}
                  className="sm:flex-1"
                >
                  {isSavingDraft ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="animate-spin h-4 w-4" />
                      Saving Draft...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Save className="h-4 w-4" />
                      Save as Draft
                    </span>
                  )}
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || isSavingDraft}
                  className="sm:flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="animate-spin h-4 w-4" />
                      Creating Order...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <ShoppingCart className="h-4 w-4" />
                      Create Order
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

export default MakeOrderPage;
