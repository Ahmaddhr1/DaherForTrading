"use client";
import { t } from "@/core/shared/i18n";
import { useT } from "@/core/shared/i18n/LangProvider";
import { useSettings } from "@/core/shared/currency";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useMutation, useQuery } from "@tanstack/react-query";
import axios from "axios";
import { Loader2, PackagePlus, DollarSign, Tag, Package, TrendingUp, Box, Ruler, AlertTriangle, Truck, Layers, ImagePlus, X, Percent, CalendarClock, BellRing, ScanBarcode } from "lucide-react";
import React, { useState } from "react";
import { toast } from "@/core/shared/i18n/toast";
import { useRouter } from "next/navigation";

const fetchCategories = async () => {
  const { data } = await axios.get("/api/categories", { params: { all: true } });
  return data;
};

const fetchCompanies = async () => {
  const { data } = await axios.get("/api/companies", { params: { limit: 200 } });
  return data;
};

// Common unit-of-measure suggestions - the field itself stays freeform text
// since businesses vary in what they stock.
const UNIT_SUGGESTIONS = ["pcs", "kg", "g", "box", "carton", "liter", "ml", "meter", "pack", "bag"];

const Page = () => {
  const t = useT();
  const { data: appSettings } = useSettings();
  const defaultAlertDays = appSettings?.expiryAlertDays || 30;
  const router = useRouter();

  const { data: categories, isLoading: categoriesLoading, isError: categoriesError } = useQuery({
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
    expiryDate: "",
    barcode: "",
    expiryAlertDays: "",
    defaultSupplier: "",
    discount: "",
  });

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const price = parseFloat(form.price);
      const initialPrice = parseFloat(form.initialPrice);
      const profit = price - initialPrice;

      let img = [];
      if (imageFile) {
        const uploadData = new FormData();
        uploadData.append("file", imageFile);
        const { data: uploadResult } = await axios.post("/api/products/upload-image", uploadData);
        img = [uploadResult.url];
      }

      const payload = {
        name: form.name,
        quantity: form.quantity === "" ? 0 : parseInt(form.quantity, 10),
        price,
        priceWholesale: form.priceWholesale,
        priceDistributor: form.priceDistributor,
        priceVip: form.priceVip,
        initialPrice,
        profit,
        category: form.category,
        unit: form.unit,
        lowStockThreshold: form.lowStockThreshold,
        expiryDate: form.expiryDate || null,
        barcode: form.barcode,
        expiryAlertDays: form.expiryAlertDays || null,
        defaultSupplier: form.defaultSupplier || null,
        discount: form.discount === "" ? 0 : parseFloat(form.discount),
        img,
      };

      const { data } = await axios.post("/api/products/create", payload);
      return data;
    },
    mutationKey: ["createproduct"],
    onSuccess: () => {
      toast.success("Product Created Successfully!", {
        description: `${form.name} has been added to your inventory.`
      });
      router.push("/dashboard/products");
    },
    onError: (error) => {
      toast.error("Product Creation Failed", {
        description: error.response?.data?.error || "Error creating product"
      });
    },
  });

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

  const handleChange = (e) => {
    const { name, value } = e.target;
    let cleanValue = value;

    if (["price", "initialPrice", "priceWholesale", "priceDistributor", "priceVip"].includes(name)) {
      cleanValue = value.replace(/[^0-9.]/g, "").replace(/(\..*?)\..*/g, "$1");
    }
    if (name === "quantity") {
      cleanValue = value.replace(/\D/g, "");
    }

    setForm((prev) => ({
      ...prev,
      [name]: cleanValue,
    }));
  };

  // Calculate profit and profit margin
  const sellingPrice = parseFloat(form.price) || 0;
  const costPrice = parseFloat(form.initialPrice) || 0;
  const profit = sellingPrice - costPrice;
  const profitMargin = costPrice > 0 ? (profit / costPrice) * 100 : 0;

  const isFormValid =
    form.name.trim() !== "" &&
    form.price.trim() !== "" &&
    form.initialPrice.trim() !== "" &&
    form.category.trim() !== "";

  return (
    <div className="min-h-screen bg-gray-50/30 dark:bg-gray-900/30 py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <PackagePlus className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{t("Add New Product")}</h1>
              <p className="text-gray-600 dark:text-gray-400">{t("Add a new product to your inventory")}</p>
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
                  {t("Enter product details, pricing, and category information")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
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
                          disabled={categoriesLoading || categoriesError}
                          required
                        >
                          <option value="">{t("Select a category")}</option>
                          {categoriesLoading && <option>{t("Loading categories...")}</option>}
                          {categoriesError && <option>{t("Error loading categories")}</option>}
                          {categories && categories.map((cat) => (
                            <option key={cat._id} value={cat._id}>
                              {cat.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="quantity" className="text-sm font-medium flex items-center gap-2">
                          <Package className="h-4 w-4" />
                          {t("Quantity in Stock (optional)")}
                        </Label>
                        <Input
                          id="quantity"
                          placeholder="0"
                          name="quantity"
                          value={form.quantity}
                          onChange={handleChange}
                          inputMode="numeric"
                          className="focus:border-blue-500 transition-colors"
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400">{t("Leave blank to start at 0 and add stock later via a purchase")}</p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="productImage" className="text-sm font-medium flex items-center gap-2">
                          <ImagePlus className="h-4 w-4" />
                          {t("Product Image (optional)")}
                        </Label>
                        {imagePreview ? (
                          <div className="flex items-center gap-3">
                            <img
                              src={imagePreview}
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
                        <Label htmlFor="barcode" className="text-sm font-medium flex items-center gap-2">
                          <ScanBarcode className="h-4 w-4" />
                          {t("Barcode")}
                        </Label>
                        <div className="flex gap-2">
                          <Input
                            id="barcode"
                            name="barcode"
                            value={form.barcode}
                            onChange={handleChange}
                            placeholder={t("Scan or type the barcode")}
                            className="focus:border-purple-500 transition-colors"
                            autoComplete="off"
                            onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            data-keep-label
                            className="shrink-0"
                            onClick={async () => {
                              try {
                                const { data } = await axios.get("/api/products/barcodes");
                                setForm((f) => ({ ...f, barcode: data.barcode }));
                              } catch {
                                toast.error("Couldn't generate a barcode");
                              }
                            }}
                          >
                            {t("Generate")}
                          </Button>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{t("Optional - lets a scanner add this product to orders")}</p>
                      </div>

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
                        <p className="text-xs text-gray-500 dark:text-gray-400">{t("Alerts you when stock falls to or below this number")}</p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="expiryDate" className="text-sm font-medium flex items-center gap-2">
                          <CalendarClock className="h-4 w-4" />
                          {t("Expiry Date")}
                        </Label>
                        <Input
                          id="expiryDate"
                          type="date"
                          name="expiryDate"
                          value={form.expiryDate}
                          onChange={handleChange}
                          className="focus:border-purple-500 transition-colors"
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400">{t("Used when purchases have no expiry date - set it per delivery on Add Purchase")}</p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="expiryAlertDays" className="text-sm font-medium flex items-center gap-2">
                          <BellRing className="h-4 w-4" />
                          {t("Alert days before expiry")}
                        </Label>
                        <Input
                          id="expiryAlertDays"
                          type="number"
                          min="1"
                          max="3650"
                          name="expiryAlertDays"
                          value={form.expiryAlertDays}
                          onChange={handleChange}
                          placeholder={String(defaultAlertDays)}
                          className="focus:border-purple-500 transition-colors"
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {t("Leave empty to use the default ({0} days, set in Settings)", { 0: defaultAlertDays })}
                        </p>
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
                      <p className="text-xs text-gray-500 dark:text-gray-400">{t("Lets you quickly reorder this product from a supplier later")}</p>
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
                      disabled={mutation.isPending || !isFormValid}
                      className="flex-1"
                    >
                      {mutation.isPending ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="animate-spin h-4 w-4" />
                          {t("Creating Product...")}
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <PackagePlus className="h-4 w-4" />
                          {t("Create Product")}
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
                      <span className="font-medium text-gray-900 dark:text-gray-100 truncate max-w-[120px] text-end">
                        {form.name || t("Not provided")}
                      </span>
                    </div>
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
                  </div>
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
      </div>
    </div>
  );
};

export default Page;