// app/dashboard/customers/[id]/addorder/page.jsx
"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, ShoppingCart, ArrowLeft } from "lucide-react";
import Link from "next/link";

const MakeOrderPage = () => {
  const { id: customerId } = useParams();
  const router = useRouter();

  const [products, setProducts] = useState([]);
  const [orderRows, setOrderRows] = useState([{ 
    id: 1, 
    productId: "", 
    quantity: 1, 
    price: "" 
  }]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load products
  useEffect(() => {
    const loadProducts = async () => {
      try {
        const response = await axios.get("/api/products");
        setProducts(response.data);
      } catch (error) {
        toast.error("Failed to load products");
      } finally {
        setIsLoading(false);
      }
    };

    loadProducts();
  }, []);

  // Add new product row
  const addProductRow = () => {
    const newId = orderRows.length + 1;
    setOrderRows([...orderRows, { 
      id: newId, 
      productId: "", 
      quantity: 1, 
      price: "" 
    }]);
  };

  // Remove product row
  const removeProductRow = (id) => {
    if (orderRows.length > 1) {
      setOrderRows(orderRows.filter(row => row.id !== id));
    }
  };

  // Handle row changes
  const handleRowChange = (id, field, value) => {
    setOrderRows(orderRows.map(row => {
      if (row.id !== id) return row;

      const updatedRow = { ...row };

      if (field === "productId") {
        updatedRow.productId = value;
        // Auto-fill price when product is selected
        const selectedProduct = products.find(p => p._id === value);
        if (selectedProduct) {
          updatedRow.price = selectedProduct.price.toString();
        }
      } 
      else if (field === "quantity") {
        updatedRow.quantity = parseInt(value) || 1;
      }
      else if (field === "price") {
        updatedRow.price = value.replace(/[^0-9.]/g, "");
      }

      return updatedRow;
    }));
  };

  // Calculate total order amount
  const calculateTotal = () => {
    return orderRows.reduce((total, row) => {
      const price = parseFloat(row.price) || 0;
      const quantity = row.quantity || 0;
      return total + (price * quantity);
    }, 0);
  };

  // Get product name by ID
  const getProductName = (productId) => {
    const product = products.find(p => p._id === productId);
    return product ? product.name : "Select Product";
  };

  // Submit order
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    for (const row of orderRows) {
      if (!row.productId) {
        toast.error("Please select a product for all items");
        return;
      }
      if (!row.quantity || row.quantity < 1) {
        toast.error("Quantity must be at least 1");
        return;
      }
      if (!row.price || parseFloat(row.price) <= 0) {
        toast.error("Please enter a valid price");
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const orderData = {
        products: orderRows.map(row => ({
          productId: row.productId,
          quantity: row.quantity,
          price: parseFloat(row.price)
        })),
        total: calculateTotal()
      };

      await axios.post(`/api/orders/${customerId}`, orderData);
      
      toast.success("Order created successfully!");
      router.push(`/dashboard/customers/${customerId}/orders`);
      
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create order");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-6">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="flex justify-center items-center min-h-96">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
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
                  <div key={row.id} className="grid grid-cols-12 gap-4 items-end p-4 border rounded-lg bg-gray-50">
                    
                    {/* Product Selection */}
                    <div className="col-span-5">
                      <Label htmlFor={`product-${row.id}`} className="text-sm font-medium">
                        Product {index + 1}
                      </Label>
                      <select
                        id={`product-${row.id}`}
                        value={row.productId}
                        onChange={(e) => handleRowChange(row.id, "productId", e.target.value)}
                        className="w-full p-2 border rounded-md focus:border-blue-500"
                        required
                      >
                        <option value="">Select a product</option>
                        {products.map(product => (
                          <option key={product._id} value={product._id}>
                            {product.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Price */}
                    <div className="col-span-3">
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

                    {/* Quantity */}
                    <div className="col-span-2">
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

                    {/* Remove Button */}
                    <div className="col-span-2">
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => removeProductRow(row.id)}
                        disabled={orderRows.length <= 1}
                        className="w-full"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add Product Button */}
              <Button
                type="button"
                variant="outline"
                onClick={addProductRow}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Another Product
              </Button>

              {/* Total Amount */}
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-blue-900">Total Amount:</span>
                  <span className="text-2xl font-bold text-blue-900">
                    ${calculateTotal().toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex gap-3 pt-4">
                <Link href={`/dashboard/customers/${customerId}`} className="flex-1">
                  <Button type="button" variant="outline" className="w-full">
                    Cancel
                  </Button>
                </Link>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
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