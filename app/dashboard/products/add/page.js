"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useMutation, useQuery } from "@tanstack/react-query";
import axios from "axios";
import { Loader2, PackagePlus, ArrowLeft, DollarSign, Tag, Package, TrendingUp, Box } from "lucide-react";
import React, { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

const fetchCategories = async () => {
  const { data } = await axios.get("/api/categories");
  return data;
};

const Page = () => {
  const router = useRouter();

  const { data: categories, isLoading: categoriesLoading, isError: categoriesError } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
  });

  const [form, setForm] = useState({
    name: "",
    quantity: "",
    price: "",
    initialPrice: "",
    category: "",
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const price = parseFloat(form.price);
      const initialPrice = parseFloat(form.initialPrice);
      const profit = price - initialPrice;

      const payload = {
        name: form.name,
        quantity: parseInt(form.quantity, 10),
        price,
        initialPrice,
        profit,
        category: form.category,
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

    if (name === "quantity") {
      cleanValue = value.replace(/\D/g, "");
    }

    if (name === "price" || name === "initialPrice") {
      cleanValue = value.replace(/[^0-9.]/g, "").replace(/(\..*?)\..*/g, "$1");
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
  const quantity = parseInt(form.quantity) || 0;
  const totalValue = sellingPrice * quantity;

  const isFormValid =
    form.name.trim() !== "" &&
    form.quantity.trim() !== "" &&
    form.price.trim() !== "" &&
    form.initialPrice.trim() !== "" &&
    form.category.trim() !== "";

  return (
    <div className="min-h-screen bg-gray-50/30 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <Button 
            variant="ghost" 
            onClick={() => router.back()}
            className="mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Products
          </Button>
          
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <PackagePlus className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Add New Product</h1>
              <p className="text-gray-600">Add a new product to your inventory</p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Form */}
          <div className="lg:col-span-2">
            <Card className="shadow-sm border-gray-200">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Product Information
                </CardTitle>
                <CardDescription>
                  Enter product details, pricing, and category information
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Basic Information Section */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-500 uppercase tracking-wide">
                      <div className="w-1 h-4 bg-blue-600 rounded"></div>
                      Basic Information
                    </div>
                    
                    <div className="grid gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name" className="text-sm font-medium flex items-center gap-2">
                          <Tag className="h-4 w-4" />
                          Product Name *
                        </Label>
                        <Input
                          id="name"
                          placeholder="Enter product name"
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
                          Category *
                        </Label>
                        <select
                          id="category"
                          name="category"
                          value={form.category}
                          onChange={handleChange}
                          className="w-full p-2 border border-gray-300 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                          disabled={categoriesLoading || categoriesError}
                          required
                        >
                          <option value="">Select a category</option>
                          {categoriesLoading && <option>Loading categories...</option>}
                          {categoriesError && <option>Error loading categories</option>}
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
                          Quantity in Stock *
                        </Label>
                        <Input
                          id="quantity"
                          placeholder="Enter quantity"
                          name="quantity"
                          value={form.quantity}
                          onChange={handleChange}
                          inputMode="numeric"
                          className="focus:border-blue-500 transition-colors"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Pricing Information Section */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-500 uppercase tracking-wide">
                      <div className="w-1 h-4 bg-green-600 rounded"></div>
                      Pricing Information
                    </div>
                    
                    <div className="grid gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="initialPrice" className="text-sm font-medium flex items-center gap-2">
                          <DollarSign className="h-4 w-4" />
                          Cost Price *
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
                        <p className="text-xs text-gray-500">The price you paid to acquire the product</p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="price" className="text-sm font-medium flex items-center gap-2">
                          <DollarSign className="h-4 w-4" />
                          Selling Price *
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
                        <p className="text-xs text-gray-500">The price customers will pay</p>
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
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={mutation.isPending || !isFormValid}
                      className="flex-1 bg-blue-600 hover:bg-blue-700"
                    >
                      {mutation.isPending ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="animate-spin h-4 w-4" />
                          Creating Product...
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <PackagePlus className="h-4 w-4" />
                          Create Product
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
            <Card className="shadow-sm border-gray-200 sticky top-6">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Product Summary</CardTitle>
                <CardDescription>Pricing and profit overview</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Basic Info */}
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-900 flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Product Details
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Name</span>
                      <span className="font-medium text-gray-900 truncate max-w-[120px] text-right">
                        {form.name || "Not provided"}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Quantity</span>
                      <Badge variant="outline">{quantity}</Badge>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Pricing Summary */}
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-900 flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Pricing
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Cost Price</span>
                      <span className="font-medium text-gray-900">${costPrice.toFixed(2)}</span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Selling Price</span>
                      <span className="font-medium text-gray-900">${sellingPrice.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Profit Analysis */}
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-900 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Profit Analysis
                  </h4>
                  
                  <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium text-green-800">Profit per Unit</span>
                      <Badge variant={profit >= 0 ? "default" : "destructive"} className="bg-green-100 text-green-800">
                        ${Math.abs(profit).toFixed(2)}
                      </Badge>
                    </div>
                    
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-green-700">Profit Margin</span>
                      <span className={`text-sm font-medium ${profitMargin >= 0 ? 'text-green-800' : 'text-red-800'}`}>
                        {profitMargin.toFixed(1)}%
                      </span>
                    </div>
                    
                    <div className="pt-2 border-t border-green-200">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-green-700">Total Inventory Value</span>
                        <span className="text-sm font-bold text-green-900">${totalValue.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Profit Status */}
                  <div className="text-center">
                    <Badge 
                      variant={profit >= 0 ? "default" : "destructive"} 
                      className="text-sm px-3 py-1"
                    >
                      {profit >= 0 ? "Profitable" : "Selling at Loss"}
                    </Badge>
                    <p className="text-xs text-gray-600 mt-1">
                      {profit >= 0 
                        ? "This product will generate profit" 
                        : "Warning: Selling below cost price"
                      }
                    </p>
                  </div>
                </div>

                <Separator />

                {/* Validation Status */}
                <div className="bg-gray-50 rounded-lg p-3">
                  <h4 className="font-medium text-gray-900 text-sm mb-2">Form Status</h4>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">All fields completed</span>
                    <Badge variant={isFormValid ? "default" : "outline"} className={isFormValid ? 'bg-green-100 text-green-800' : ''}>
                      {isFormValid ? "Ready" : "Incomplete"}
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