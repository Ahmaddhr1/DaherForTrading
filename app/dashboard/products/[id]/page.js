"use client";
import { t } from "@/lib/i18n";
import { useT } from "@/lib/i18n/LangProvider";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "@/lib/i18n/toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FormSkeleton, PageHeaderSkeleton } from "@/components/ui/skeleton-patterns";
import { Loader2, Package, DollarSign, Tag, Box, TrendingUp, PackageCheck, Ruler, AlertTriangle, Truck, Layers, ImagePlus, X, Percent } from "lucide-react";
import Link from "next/link";
import ProductHistory from "./ProductHistory";
import StockAdjustments from "./StockAdjustments";
import { useHasPermission } from "@/lib/useHasPermission";

const fetchProduct = async (id) => {
  const res = await axios.get(`/api/products/${id}`);
  return res.data;
};

const fetchCategories = async () => {
  const res = await axios.get("/api/categories", { params: { all: true } });
  return res.data;
};

const fetchCompanies = async () => {
  const res = await axios.get("/api/companies", { params: { limit: 200 } });
  return res.data;
};

const UNIT_SUGGESTIONS = ["pcs", "kg", "g", "box", "carton", "liter", "ml", "meter", "pack", "bag"];

const EditProductPage = () => {
  const t = useT();
  const router = useRouter();
  const { id } = useParams();
  const queryClient = useQueryClient();
  const { hasPermission: canEditProducts } = useHasPermission("canEditProducts");

  const { data: product, isLoading: productLoading, isError: productError } = useQuery({
    queryKey: ["product", id],
    queryFn: () => fetchProduct(id),
    enabled: !!id,
  });

  const { data: categories = [], isLoading: categoriesLoading, isError: categoriesError } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
  });

  const { data: companiesData } = useQuery({
    queryKey: ["companies", "for-supplier-select"],
    queryFn: fetchCompanies,
  });
  const companies = companiesData?.companies || companiesData || [];

  const [form, setForm] = useState({
    name: "",
    quantity: "",
    price: "",
    priceWholesale: "",
    priceDistributor: "",
    priceVip: "",
    initialPrice: "",
    category: "",
    unit: "pcs",
    lowStockThreshold: "5",
    defaultSupplier: "",
    discount: "",
  });

  const [existingImageUrl, setExistingImageUrl] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageRemoved, setImageRemoved] = useState(false);

  // Sync product data into form
  useEffect(() => {
    if (product) {
      setForm({
        name: product.name || "",
        quantity: product.quantity?.toString() || "",
        price: product.price?.toString() || "",
        priceWholesale: product.priceWholesale?.toString() || "",
        priceDistributor: product.priceDistributor?.toString() || "",
        priceVip: product.priceVip?.toString() || "",
        initialPrice: product.initialPrice?.toString() || "",
        category: product.category || "",
        unit: product.unit || "pcs",
        lowStockThreshold: product.lowStockThreshold?.toString() ?? "5",
        defaultSupplier: product.defaultSupplier || "",
        discount: product.discount?.toString() ?? "0",
      });
      setExistingImageUrl(product.img?.[0] || null);
      setImageFile(null);
      setImagePreview(null);
      setImageRemoved(false);
    }
  }, [product]);

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setImageRemoved(false);
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setExistingImageUrl(null);
    setImageRemoved(true);
  };

  const mutation = useMutation({
    mutationFn: async () => {
      let img;
      if (imageFile) {
        const uploadData = new FormData();
        uploadData.append("file", imageFile);
        const { data: uploadResult } = await axios.post("/api/products/upload-image", uploadData);
        img = [uploadResult.url];
      } else if (imageRemoved) {
        img = [];
      }

      const payload = {
        ...form,
        price: parseFloat(form.price),
        initialPrice: parseFloat(form.initialPrice),
        profit: parseFloat(form.price) - parseFloat(form.initialPrice),
        quantity: parseInt(form.quantity, 10),
        defaultSupplier: form.defaultSupplier || null,
        ...(img !== undefined ? { img } : {}),
      };
      const res = await axios.put(`/api/products/${id}`, payload);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success("Product Updated Successfully!", {
        description: `${form.name} has been updated in your inventory.`
      });
      queryClient.invalidateQueries(["product", id]);
      queryClient.invalidateQueries(["products"]);
    },
    onError: (err) => {
      toast.error("Update Failed", {
        description: err?.response?.data?.error || "Failed to update product."
      });
    },
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    let cleanValue = value;

    if (name === "quantity") cleanValue = value.replace(/\D/g, "");
    if (["price", "initialPrice", "priceWholesale", "priceDistributor", "priceVip"].includes(name))
      cleanValue = value.replace(/[^0-9.]/g, "").replace(/(\..*?)\..*/g, "$1");

    setForm((prev) => ({ ...prev, [name]: cleanValue }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!isFormValid) {
      toast.error("Validation Error", {
        description: "Please fill in all required fields."
      });
      return;
    }

    mutation.mutate();
  };

  // Calculate profit and metrics
  const sellingPrice = parseFloat(form.price) || 0;
  const costPrice = parseFloat(form.initialPrice) || 0;
  const profit = sellingPrice - costPrice;
  const profitMargin = costPrice > 0 ? (profit / costPrice) * 100 : 0;
  const quantity = parseInt(form.quantity) || 0;
  const totalValue = sellingPrice * quantity;
  const previousProfit = product ? product.price - product.initialPrice : 0;
  const profitChange = profit - previousProfit;

  const isFormValid =
    form.name.trim() &&
    form.quantity &&
    form.price &&
    form.initialPrice &&
    form.category;

  if (productLoading) {
    return (
      <div className="min-h-screen bg-gray-50/30 dark:bg-gray-900/30 py-8">
        <div className="container mx-auto px-4">
          <PageHeaderSkeleton />
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <Card className="shadow-sm border-gray-200 dark:border-gray-800">
                <CardContent className="pt-6">
                  <FormSkeleton fields={5} />
                </CardContent>
              </Card>
            </div>
            <div className="lg:col-span-1">
              <Card className="shadow-sm border-gray-200 dark:border-gray-800">
                <CardContent className="pt-6 space-y-4">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-20 w-full rounded-lg" />
                  <Skeleton className="h-24 w-full rounded-lg" />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (productError) {
    return (
      <div className="min-h-screen bg-gray-50/30 dark:bg-gray-900/30 py-8">
        <div className="container mx-auto px-4">
          <Card className="max-w-md mx-auto">
            <CardContent className="pt-6 text-center">
              <div className="text-red-500 bg-red-50 dark:bg-red-900/20 rounded-full p-3 w-12 h-12 mx-auto mb-4 flex items-center justify-center">
                <Package className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">{t("Product Not Found")}</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">{t("Unable to load product details. Please try again.")}</p>
              <Button onClick={() => router.back()}>{t("Back to Products")}</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/30 dark:bg-gray-900/30 py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <PackageCheck className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{t("Edit Product")}</h1>
              <p className="text-gray-600 dark:text-gray-400">{t("Update product information and pricing")}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Form */}
          <div className="lg:col-span-2">
            <Card className="shadow-sm border-gray-200 dark:border-gray-800">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  {t("Product Information")}
                </CardTitle>
                <CardDescription>
                  {t("Update product details, pricing, and category information")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <fieldset disabled={!canEditProducts} className="space-y-6 border-0 p-0 m-0 min-w-0 disabled:opacity-60">
                  {/* Basic Information Section */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      <div className="w-1 h-4 bg-blue-600 rounded"></div>
                      {t("Basic Information")}
                    </div>
                    
                    <div className="grid gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name" className="text-sm font-medium flex items-center gap-2">
                          <Tag className="h-4 w-4" />
                          {t("Product Name *")}
                        </Label>
                        <Input
                          id="name"
                          placeholder={t("Enter product name")}
                          name="name"
                          value={form.name}
                          onChange={handleChange}
                          className="focus:border-blue-500 transition-colors"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="category" className="text-sm font-medium flex items-center gap-2">
                          <Box className="h-4 w-4" />
                          {t("Category *")}
                        </Label>
                        <select
                          id="category"
                          name="category"
                          value={form.category}
                          onChange={handleChange}
                          className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                          disabled={categoriesLoading}
                          required
                        >
                          <option value="">{t("Select a category")}</option>
                          {categoriesLoading && <option>{t("Loading categories...")}</option>}
                          {categoriesError && <option>{t("Error loading categories")}</option>}
                          {categories.map((cat) => (
                            <option key={cat._id} value={cat._id}>
                              {cat.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="quantity" className="text-sm font-medium flex items-center gap-2">
                          <Package className="h-4 w-4" />
                          {t("Quantity in Stock *")}
                        </Label>
                        <Input
                          id="quantity"
                          placeholder={t("Enter quantity")}
                          name="quantity"
                          value={form.quantity}
                          onChange={handleChange}
                          inputMode="numeric"
                          className="focus:border-blue-500 transition-colors"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="productImage" className="text-sm font-medium flex items-center gap-2">
                          <ImagePlus className="h-4 w-4" />
                          {t("Product Image (optional)")}
                        </Label>
                        {imagePreview || existingImageUrl ? (
                          <div className="flex items-center gap-3">
                            <img
                              src={imagePreview || existingImageUrl}
                              alt={t("Preview")}
                              className="h-20 w-20 rounded-md border border-gray-200 dark:border-gray-800 object-cover"
                            />
                            <Button type="button" variant="outline" size="sm" onClick={handleRemoveImage} className="flex items-center gap-1">
                              <X className="h-3.5 w-3.5" />
                              {t("Remove")}
                            </Button>
                          </div>
                        ) : (
                          <Input
                            id="productImage"
                            type="file"
                            accept="image/*"
                            onChange={handleImageChange}
                            className="focus:border-blue-500 transition-colors"
                          />
                        )}
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Inventory Details Section */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      <div className="w-1 h-4 bg-purple-600 rounded"></div>
                      {t("Inventory Details")}
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="unit" className="text-sm font-medium flex items-center gap-2">
                          <Ruler className="h-4 w-4" />
                          {t("Unit of Measure")}
                        </Label>
                        <Input
                          id="unit"
                          list="unit-suggestions"
                          placeholder={t("pcs")}
                          name="unit"
                          value={form.unit}
                          onChange={handleChange}
                          className="focus:border-purple-500 transition-colors"
                        />
                        <datalist id="unit-suggestions">
                          {UNIT_SUGGESTIONS.map((u) => (
                            <option key={u} value={u} />
                          ))}
                        </datalist>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="lowStockThreshold" className="text-sm font-medium flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4" />
                          {t("Low Stock Threshold")}
                        </Label>
                        <Input
                          id="lowStockThreshold"
                          type="number"
                          min="0"
                          placeholder="5"
                          name="lowStockThreshold"
                          value={form.lowStockThreshold}
                          onChange={handleChange}
                          className="focus:border-purple-500 transition-colors"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="discount" className="text-sm font-medium flex items-center gap-2">
                          <Percent className="h-4 w-4" />
                          {t("Default Discount (%)")}
                        </Label>
                        <Input
                          id="discount"
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          placeholder="0"
                          name="discount"
                          value={form.discount}
                          onChange={handleChange}
                          className="focus:border-purple-500 transition-colors"
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400">{t("Pre-fills this product's discount when added to an order")}</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="defaultSupplier" className="text-sm font-medium flex items-center gap-2">
                        <Truck className="h-4 w-4" />
                        {t("Default Supplier")}
                      </Label>
                      <select
                        id="defaultSupplier"
                        name="defaultSupplier"
                        value={form.defaultSupplier}
                        onChange={handleChange}
                        className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded-md focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
                      >
                        <option value="">{t("No default supplier")}</option>
                        {companies.map((c) => (
                          <option key={c._id} value={c._id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                      {form.defaultSupplier && (
                        <Link
                          href={`/dashboard/companies/${form.defaultSupplier}/addpurchase?productId=${id}`}
                          className="text-xs text-purple-600 hover:text-purple-800 hover:underline inline-flex items-center gap-1 mt-1"
                        >
                          <Truck className="h-3 w-3" />
                          {t("Reorder from")} {companies.find((c) => c._id === form.defaultSupplier)?.name || t("supplier")}
                        </Link>
                      )}
                    </div>
                  </div>

                  <Separator />

                  {/* Pricing Information Section */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      <div className="w-1 h-4 bg-green-600 rounded"></div>
                      {t("Pricing Information")}
                    </div>
                    
                    <div className="grid gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="initialPrice" className="text-sm font-medium flex items-center gap-2">
                          <DollarSign className="h-4 w-4" />
                          {t("Cost Price *")}
                        </Label>
                        <Input
                          id="initialPrice"
                          placeholder="0.00"
                          name="initialPrice"
                          value={form.initialPrice}
                          onChange={handleChange}
                          inputMode="decimal"
                          className="focus:border-green-500 transition-colors"
                          required
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400">{t("The price you paid to acquire the product")}</p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="price" className="text-sm font-medium flex items-center gap-2">
                          <DollarSign className="h-4 w-4" />
                          {t("Selling Price *")}
                        </Label>
                        <Input
                          id="price"
                          placeholder="0.00"
                          name="price"
                          value={form.price}
                          onChange={handleChange}
                          inputMode="decimal"
                          className="focus:border-green-500 transition-colors"
                          required
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400">{t("The price customers will pay")}</p>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Price Tiers Section */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      <div className="w-1 h-4 bg-teal-600 rounded"></div>
                      {t("Price Tiers")}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 -mt-2">
                      {t(
                        "Selling Price above is the Retail price. Set different prices for other customer tiers here, or leave a field blank to use the Retail price for that tier."
                      )}
                    </p>

                    <div className="grid gap-4 sm:grid-cols-3">
                      <div className="space-y-2">
                        <Label htmlFor="priceWholesale" className="text-sm font-medium flex items-center gap-2">
                          <Layers className="h-4 w-4" />
                          {t("Wholesale")}
                        </Label>
                        <Input
                          id="priceWholesale"
                          placeholder={form.price || "0.00"}
                          name="priceWholesale"
                          value={form.priceWholesale}
                          onChange={handleChange}
                          inputMode="decimal"
                          className="focus:border-teal-500 transition-colors"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="priceDistributor" className="text-sm font-medium flex items-center gap-2">
                          <Layers className="h-4 w-4" />
                          {t("Distributor")}
                        </Label>
                        <Input
                          id="priceDistributor"
                          placeholder={form.price || "0.00"}
                          name="priceDistributor"
                          value={form.priceDistributor}
                          onChange={handleChange}
                          inputMode="decimal"
                          className="focus:border-teal-500 transition-colors"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="priceVip" className="text-sm font-medium flex items-center gap-2">
                          <Layers className="h-4 w-4" />
                          {t("VIP")}
                        </Label>
                        <Input
                          id="priceVip"
                          placeholder={form.price || "0.00"}
                          name="priceVip"
                          value={form.priceVip}
                          onChange={handleChange}
                          inputMode="decimal"
                          className="focus:border-teal-500 transition-colors"
                        />
                      </div>
                    </div>
                  </div>
                  </fieldset>

                  <Separator />

                  {/* Submit Button */}
                  <div className="flex gap-3 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => router.back()}
                      className="flex-1"
                    >
                      {t("Cancel")}
                    </Button>
                    <Button
                      type="submit"
                      disabled={mutation.isPending || !isFormValid || !canEditProducts}
                      className="flex-1"
                    >
                      {mutation.isPending ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="animate-spin h-4 w-4" />
                          {t("Updating Product...")}
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <PackageCheck className="h-4 w-4" />
                          {t("Update Product")}
                        </span>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Summary Sidebar */}
          <div className="lg:col-span-1">
            <Card className="shadow-sm border-gray-200 dark:border-gray-800 sticky top-6">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">{t("Product Summary")}</CardTitle>
                <CardDescription>{t("Pricing and profit overview")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Basic Info */}
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    {t("Product Details")}
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 dark:text-gray-400">{t("Name")}</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100 truncate max-w-[120px] text-right">
                        {form.name || t("Not provided")}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 dark:text-gray-400">{t("Quantity")}</span>
                      <Badge variant="outline">{quantity}</Badge>
                    </div>

                    {product && (
                      <div className="flex justify-between items-center pt-2 border-t">
                        <span className="text-sm text-gray-600 dark:text-gray-400">{t("Last Updated")}</span>
                        <Badge variant="outline" className="text-xs">
                          {new Date(product.updatedAt).toLocaleDateString()}
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Pricing Summary */}
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    {t("Pricing")}
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 dark:text-gray-400">{t("Cost Price")}</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">${costPrice.toFixed(2)}</span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 dark:text-gray-400">{t("Selling Price")}</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">${sellingPrice.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Profit Analysis */}
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    {t("Profit Analysis")}
                  </h4>
                  
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 border border-green-200 dark:border-green-900/50">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium text-green-800 dark:text-green-400">{t("Profit per Unit")}</span>
                      <Badge variant={profit >= 0 ? "default" : "destructive"} className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400">
                        ${Math.abs(profit).toFixed(2)}
                      </Badge>
                    </div>
                    
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-green-700">{t("Profit Margin")}</span>
                      <span className={`text-sm font-medium ${profitMargin >= 0 ? 'text-green-800 dark:text-green-400' : 'text-red-800 dark:text-red-400'}`}>
                        {profitMargin.toFixed(1)}%
                      </span>
                    </div>
                    
                    <div className="pt-2 border-t border-green-200 dark:border-green-900/50">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-green-700">{t("Total Inventory Value")}</span>
                        <span className="text-sm font-bold text-green-900 dark:text-green-300">${totalValue.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Profit Change Indicator */}
                  {product && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-900/50">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-blue-800 dark:text-blue-400">{t("Profit Change")}</span>
                        <Badge variant={profitChange >= 0 ? "default" : "destructive"} className={profitChange >= 0 ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400' : ''}>
                          {profitChange >= 0 ? '+' : ''}{profitChange.toFixed(2)}$
                        </Badge>
                      </div>
                      <p className="text-xs text-blue-700 mt-1">
                        {profitChange >= 0 ? t("Increase") : t("Decrease")} {t("from previous profit")}
                      </p>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Validation Status */}
                <div className="bg-gray-50 dark:bg-gray-950 rounded-lg p-3">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 text-sm mb-2">{t("Form Status")}</h4>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">{t("All fields completed")}</span>
                    <Badge variant={isFormValid ? "default" : "outline"} className={isFormValid ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400' : ''}>
                      {isFormValid ? t("Ready") : t("Incomplete")}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <StockAdjustments productId={id} currentQuantity={product?.quantity} unit={product?.unit} />

        <ProductHistory productId={id} />
      </div>
    </div>
  );
};

export default EditProductPage;