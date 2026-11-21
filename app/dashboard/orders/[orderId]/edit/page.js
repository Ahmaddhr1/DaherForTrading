"use client";
import { t } from "@/lib/i18n";
import { useT } from "@/lib/i18n/LangProvider";

import React, { useEffect, useState } from "react";
import axios from "axios";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { PageHeaderSkeleton, ListSkeleton } from "@/components/ui/skeleton-patterns";
import { toast } from "@/lib/i18n/toast";
import { Loader2, Plus, Trash2, PencilLine, CheckCircle, Layers, Gift, PackagePlus } from "lucide-react";
import Link from "next/link";
import { useSettings, formatLL } from "@/lib/currency";
import { Combobox } from "@/components/ui/combobox";
import { getTierPrice, getTierLabel } from "@/lib/priceTiers";
import OrderCustomerName from "../../components/OrderCustomerName";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useHasPermission } from "@/lib/useHasPermission";

let rowIdCounter = 1;

export default function EditOrderPage() {
  const t = useT();
  const { orderId } = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: settings } = useSettings();

  // An owner, or an employee granted canOverrideOrderPricing, can price a
  // catalog product away from its tier price or price a custom item at
  // all - see priceOrderItems in the orders API, which enforces this
  // server-side too, not just here.
  const { data: me } = useQuery({
    queryKey: ["admin", "me"],
    queryFn: async () => (await axios.get("/api/admin/me")).data,
  });
  const isOwner = me?.role === "owner";
  const { hasPermission: canOverridePricing } = useHasPermission("canOverrideOrderPricing");
  const canOverride = isOwner || canOverridePricing;
  const { hasPermission: canFinalizeOrders } = useHasPermission("canFinalizeOrders");
  const { hasPermission: canEditOrders } = useHasPermission("canEditOrders");

  const [products, setProducts] = useState([]);
  const [orderRows, setOrderRows] = useState([]);
  const [taxRate, setTaxRate] = useState("0");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);

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

  const priceTier = order?.customer?.priceTier || 1;

  useEffect(() => {
    if (order?.products?.length) {
      setOrderRows(
        order.products.map((p) => ({
          id: rowIdCounter++,
          isCustom: !!p.isCustom,
          productId: p.productId?._id || p.productId || "",
          customName: p.isCustom ? p.name : "",
          quantity: p.quantity,
          price: p.price.toString(),
          discount: p.discount ? p.discount.toString() : "",
          free: !!p.free,
        }))
      );
      setTaxRate(order.taxRate?.toString() || "0");
    }
  }, [order]);

  const addProductRow = () => {
    setOrderRows((rows) => [
      ...rows,
      { id: rowIdCounter++, isCustom: false, productId: "", customName: "", quantity: 1, price: "", discount: "", free: false },
    ]);
  };

  // Without canOverrideOrderPricing, a custom item can only ever be added
  // as a giveaway (free) - pricing something outside the catalog needs
  // that permission, enforced again server-side.
  const addCustomRow = () => {
    setOrderRows((rows) => [
      ...rows,
      { id: rowIdCounter++, isCustom: true, productId: "", customName: "", quantity: 1, price: "", discount: "", free: !canOverride },
    ]);
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
          if (selectedProduct && !updatedRow.free) {
            const tierPrice = getTierPrice(selectedProduct, priceTier);
            updatedRow.price = tierPrice.toString();
            // Pre-fill the line's $ discount from the product's own default
            // discount % - still just a starting point, editable afterward.
            const discountPercent = Number(selectedProduct.discount) || 0;
            const lineSubtotal = tierPrice * (updatedRow.quantity || 1);
            updatedRow.discount = discountPercent > 0 ? (Math.round(lineSubtotal * (discountPercent / 100) * 100) / 100).toString() : "";
          }
        } else if (field === "customName") {
          updatedRow.customName = value;
        } else if (field === "quantity") {
          updatedRow.quantity = parseInt(value) || 1;
        } else if (field === "price") {
          if (!canOverride) return row; // price is locked without canOverrideOrderPricing
          updatedRow.price = value.replace(/[^0-9.]/g, "");
        } else if (field === "discount") {
          updatedRow.discount = value.replace(/[^0-9.]/g, "");
        } else if (field === "free") {
          updatedRow.free = value;
          if (value) {
            updatedRow.price = "0";
          } else if (!updatedRow.isCustom) {
            const selectedProduct = products.find((p) => p._id === updatedRow.productId);
            updatedRow.price = selectedProduct ? getTierPrice(selectedProduct, priceTier).toString() : "";
          } else {
            updatedRow.price = "";
          }
        }
        return updatedRow;
      })
    );
  };

  const calculateSubtotal = () =>
    orderRows.reduce((total, row) => total + ((parseFloat(row.price) || 0) * (row.quantity || 0)), 0);
  const calculateDiscountTotal = () =>
    orderRows.reduce((total, row) => total + (parseFloat(row.discount) || 0), 0);
  const calculateAfterDiscount = () => Math.max(0, calculateSubtotal() - calculateDiscountTotal());
  const calculateTaxAmount = () => calculateAfterDiscount() * ((parseFloat(taxRate) || 0) / 100);
  const calculateTotal = () => calculateAfterDiscount() + calculateTaxAmount();

  const isDraft = order?.status === "draft";

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
    }
    return true;
  };

  const buildProductsPayload = () =>
    orderRows.map((row) => ({
      productId: row.isCustom ? undefined : row.productId,
      name: row.isCustom ? row.customName.trim() : undefined,
      isCustom: row.isCustom,
      quantity: row.quantity,
      price: parseFloat(row.price) || 0,
      discount: parseFloat(row.discount) || 0,
      free: row.free,
    }));

  const [confirmAction, setConfirmAction] = useState(null); // "update" | "finalize" | null

  const doUpdate = async () => {
    setIsSubmitting(true);
    try {
      await axios.put(`/api/orders/${orderId}`, {
        products: buildProductsPayload(),
        taxRate: parseFloat(taxRate) || 0,
      });

      toast.success(isDraft ? "Draft saved!" : "Order updated successfully!");
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

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validateRows()) return;

    // A draft is just a scratchpad, so it's saved without asking - but a
    // pending order already reserves stock and counts toward debt, so
    // changing its line items is confirmed first.
    if (!isDraft) {
      setConfirmAction("update");
      return;
    }
    doUpdate();
  };

  const doFinalize = async () => {
    setIsFinalizing(true);
    try {
      // Save any in-progress edits first, then finalize.
      await axios.put(`/api/orders/${orderId}`, {
        products: buildProductsPayload(),
        taxRate: parseFloat(taxRate) || 0,
      });
      await axios.put(`/api/orders/${orderId}/finalize`);

      toast.success("Order finalized!");
      queryClient.invalidateQueries({ queryKey: ["order", orderId] });
      queryClient.invalidateQueries({ queryKey: ["customer-orders"] });
      queryClient.invalidateQueries({ queryKey: ["customer", order?.customer?._id] });
      router.push(`/dashboard/orders/${orderId}`);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to finalize order");
    } finally {
      setIsFinalizing(false);
    }
  };

  const handleFinalize = () => {
    if (!validateRows()) return;
    setConfirmAction("finalize");
  };

  const confirmProceed = () => {
    const action = confirmAction;
    setConfirmAction(null);
    if (action === "update") doUpdate();
    if (action === "finalize") doFinalize();
  };

  const isLoading = isLoadingOrder || isLoadingProducts || orderRows.length === 0;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-6">
        <div className="container mx-auto px-4">
          <PageHeaderSkeleton />
          <Card className="shadow-sm border-gray-200 dark:border-gray-800">
            <CardContent className="pt-6">
              <ListSkeleton rows={2} rowHeight="h-16" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (order && order.status !== "pending" && order.status !== "draft") {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-6">
        <div className="container mx-auto px-4 text-center">
          <p className="text-gray-600 dark:text-gray-400 mb-4">{t("Only pending orders or drafts can be updated. This order is")} {order.status}.</p>
          <Link href={`/dashboard/orders/${orderId}`}>
            <Button variant="outline">{t("Back to Order")}</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-6">
      <div className="container mx-auto px-4">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <PencilLine className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{isDraft ? t("Edit Draft") : t("Update Order")}</h1>
              <p className="text-gray-600 dark:text-gray-400">
                {isDraft
                  ? t("Edit products, quantities, and prices, then save or finalize this draft")
                  : t("Edit products, quantities, and prices for this pending order")}
              </p>
            </div>
          </div>
          {order?.customer ? (
            <p className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 mt-1">
              <Layers className="h-3.5 w-3.5" />
              {t("Pricing for")} {order.customer.fullName}: <span className="font-medium text-gray-700 dark:text-gray-300">{getTierLabel(priceTier)}</span>
            </p>
          ) : order?.customerNameText ? (
            <p className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 mt-1">
              <Layers className="h-3.5 w-3.5" />
              <OrderCustomerName order={order} />
            </p>
          ) : null}
          {!canOverride && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {t(
                "Prices are set automatically for your account. Ask an owner for the \"Override order pricing\" permission to set a price or price a custom item."
              )}
            </p>
          )}
        </div>

        <Card className="shadow-sm border-gray-200 dark:border-gray-800">
          <CardHeader>
            <CardTitle className="text-xl">{t("Order Details")}</CardTitle>
            <CardDescription>{t("Update products and quantities for this order")}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                {orderRows.map((row, index) => (
                  <div key={row.id} className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-950 space-y-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor={`product-${row.id}`} className="text-sm font-medium">
                        {row.isCustom ? t("Custom Item") : t("Product")} {index + 1}
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

                    {row.isCustom ? (
                      <Input
                        type="text"
                        value={row.customName}
                        onChange={(e) => handleRowChange(row.id, "customName", e.target.value)}
                        placeholder={t("Item name (not in inventory)")}
                        required
                      />
                    ) : (
                      <Combobox
                        id={`product-${row.id}`}
                        options={products}
                        value={row.productId}
                        onChange={(value) => handleRowChange(row.id, "productId", value)}
                        placeholder={t("Select a product")}
                        renderOption={(product) => (
                          <span>
                            {product.name}{" "}
                            <span className="text-gray-400 dark:text-gray-500">(${getTierPrice(product, priceTier).toFixed(2)} {t("· stock:")} {product.quantity})
                            </span>
                          </span>
                        )}
                      />
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor={`price-${row.id}`} className="text-sm font-medium">
                          {t("Price ($)")}
                        </Label>
                        <Input
                          id={`price-${row.id}`}
                          type="text"
                          value={row.free ? "0" : row.price}
                          onChange={(e) => handleRowChange(row.id, "price", e.target.value)}
                          placeholder={row.isCustom ? "0.00" : t("Select a product")}
                          disabled={row.free || !canOverride}
                          className={row.free || !canOverride ? "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400" : ""}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`quantity-${row.id}`} className="text-sm font-medium">
                          {t("Quantity")}
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

                      <div className="space-y-2">
                        <Label htmlFor={`discount-${row.id}`} className="text-sm font-medium">
                          {t("Discount ($)")}
                        </Label>
                        <Input
                          id={`discount-${row.id}`}
                          type="text"
                          value={row.discount}
                          disabled={row.free}
                          onChange={(e) => handleRowChange(row.id, "discount", e.target.value)}
                          placeholder="0.00"
                        />
                      </div>
                    </div>

                    <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer w-fit">
                      <input
                        type="checkbox"
                        checked={row.free}
                        disabled={row.isCustom && !canOverride}
                        onChange={(e) => handleRowChange(row.id, "free", e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 dark:border-gray-700 text-green-600 focus:ring-green-500"
                      />
                      <Gift className="h-3.5 w-3.5 text-green-600" />
                      {t("Free (offer)")}
                    </label>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-3">
                <Button type="button" variant="outline" onClick={addProductRow} className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  {t("Add Another Product")}
                </Button>
                <Button type="button" variant="outline" onClick={addCustomRow} className="flex items-center gap-2">
                  <PackagePlus className="h-4 w-4" />
                  {t("Add Custom Item")}
                </Button>
              </div>

              <div className="space-y-2 max-w-xs">
                <Label htmlFor="tax-rate" className="text-sm font-medium">
                  {t("Tax Rate (%)")}
                </Label>
                <Input
                  id="tax-rate"
                  type="text"
                  value={taxRate}
                  onChange={(e) => setTaxRate(e.target.value.replace(/[^0-9.]/g, ""))}
                  placeholder="0"
                />
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-900/50 space-y-2">
                <div className="flex justify-between items-center text-sm text-blue-900/80">
                  <span>{t("Subtotal")}</span>
                  <span>${calculateSubtotal().toFixed(2)}</span>
                </div>
                {calculateDiscountTotal() > 0 && (
                  <div className="flex justify-between items-center text-sm text-amber-700">
                    <span>{t("Discount")}</span>
                    <span>-${calculateDiscountTotal().toFixed(2)}</span>
                  </div>
                )}
                {calculateTaxAmount() > 0 && (
                  <div className="flex justify-between items-center text-sm text-blue-900/80">
                    <span>{t("Tax (")}{parseFloat(taxRate) || 0}%)</span>
                    <span>+${calculateTaxAmount().toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-2 border-t border-blue-200 dark:border-blue-900/50">
                  <span className="text-lg font-semibold text-blue-900 dark:text-blue-300">{t("Total Amount:")}</span>
                  <span className="text-2xl font-bold text-blue-900 dark:text-blue-300">${calculateTotal().toFixed(2)}</span>
                </div>
                {settings?.dollarRate > 0 && (
                  <div className="flex justify-between items-center text-sm text-blue-900/70">
                    <span>≈</span>
                    <span>{formatLL(calculateTotal(), settings.dollarRate)}</span>
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <Link href={`/dashboard/orders/${orderId}`} className="sm:flex-1">
                  <Button type="button" variant="outline" className="w-full">
                    {t("Cancel")}
                  </Button>
                </Link>
                <Button type="submit" disabled={isSubmitting || isFinalizing || !canEditOrders} className="sm:flex-1">
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="animate-spin h-4 w-4" />
                      {isDraft ? t("Saving Draft...") : t("Updating Order...")}
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <PencilLine className="h-4 w-4" />
                      {isDraft ? t("Save Draft") : t("Update Order")}
                    </span>
                  )}
                </Button>
                {isDraft && (
                  <Button
                    type="button"
                    onClick={handleFinalize}
                    disabled={isSubmitting || isFinalizing || !canFinalizeOrders}
                    className="sm:flex-1 bg-green-600 hover:bg-green-700"
                  >
                    {isFinalizing ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="animate-spin h-4 w-4" />
                        {t("Finalizing...")}
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4" />
                        {t("Finalize Order")}
                      </span>
                    )}
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
      <ConfirmDialog
        open={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        title={confirmAction === "finalize" ? t("Finalize draft?") : t("Update order?")}
        description={
          confirmAction === "finalize"
            ? t(
            "Finalize this draft into a real order for ${0}? This will deduct stock and add to the customer's debt.",
            {
              0: calculateTotal().toFixed(2)
            }
          )
            : t(
            "Update this order to ${0}? Stock and the customer's debt will be adjusted for the difference.",
            {
              0: calculateTotal().toFixed(2)
            }
          )
        }
        confirmLabel={confirmAction === "finalize" ? t("Finalize Order") : t("Update Order")}
        variant="default"
        onConfirm={confirmProceed}
        loading={isSubmitting || isFinalizing}
      />
    </div>
  );
}
