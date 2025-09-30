
"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "sonner";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Folder, Eye, Loader2, Trash2, Package, Edit, AlertTriangle } from "lucide-react";

const EditCategoryPage = () => {
  const { id } = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    name: "",
  });
  const [showProducts, setShowProducts] = useState(false);

  // Fetch category data
  const { data: category, isLoading, error } = useQuery({
    queryKey: ["category", id],
    queryFn: async () => {
      const response = await axios.get(`/api/categories/${id}`);
      return response.data;
    },
    enabled: !!id,
  });

  // Prefill form when data is loaded
  useEffect(() => {
    if (category) {
      setFormData({
        name: category.name || "",
      });
    }
  }, [category]);

  // Update category mutation
  const updateMutation = useMutation({
    mutationFn: async (updatedData) => {
      const response = await axios.put(`/api/categories/${id}`, updatedData);
      return response.data;
    },
    onSuccess: () => {
      toast.success("Category Updated Successfully!", {
        description: `${formData.name} has been updated.`
      });
      queryClient.invalidateQueries(["category", id]);
      queryClient.invalidateQueries(["categories"]);
    },
    onError: (error) => {
      toast.error("Update Failed", {
        description: error.response?.data?.error || "Failed to update category"
      });
    },
  });

  // Delete category mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      await axios.delete(`/api/categories/${id}`);
    },
    onSuccess: () => {
      toast.success("Category Deleted", {
        description: "Category has been removed successfully."
      });
      queryClient.invalidateQueries(["categories"]);
      router.push("/dashboard/categories");
    },
    onError: (error) => {
      toast.error("Deletion Failed", {
        description: error.response?.data?.error || "Failed to delete category"
      });
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("Validation Error", {
        description: "Category name is required."
      });
      return;
    }

    updateMutation.mutate(formData);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleDelete = () => {
    const productCount = category?.products?.length || 0;
    const message = productCount > 0
      ? `This category contains ${productCount} product(s). Deleting it will remove the category and its products. Are you sure?`
      : "Are you sure you want to delete this category?";

    if (window.confirm(message)) {
      deleteMutation.mutate();
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-6">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="flex justify-center items-center min-h-96">
            <div className="text-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
              <p className="text-gray-600">Loading category data...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-6">
        <div className="container mx-auto px-4 max-w-4xl">
          <Card className="max-w-md mx-auto">
            <CardContent className="pt-6 text-center">
              <div className="text-red-500 bg-red-50 rounded-full p-3 w-12 h-12 mx-auto mb-4 flex items-center justify-center">
                <Folder className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Category Not Found</h3>
              <p className="text-gray-600 mb-4">Unable to load category details.</p>
              <Link href="/dashboard/categories">
                <Button>Back to Categories</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const products = category?.products || [];
  const productCount = products.length;

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="container mx-auto px-4 max-w-4xl">

        {/* Header */}
        <div className="mb-8">
          <Link href="/dashboard/categories">
            <Button variant="ghost" className="mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-900">
              <ArrowLeft className="h-4 w-4" />
              Back to Categories
            </Button>
          </Link>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Edit className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Edit Category</h1>
                <p className="text-gray-600">Update category information and products</p>
              </div>
            </div>

            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="flex items-center gap-2"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="animate-spin h-4 w-4" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Delete Category
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Form */}
          <div className="lg:col-span-2">
            <Card className="shadow-sm border-gray-200">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl flex items-center gap-2">
                  <Folder className="h-5 w-5" />
                  Category Information
                </CardTitle>
                <CardDescription>
                  Update the details for this category
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">

                  {/* Category Name */}
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm font-medium">
                      Category Name *
                    </Label>
                    <Input
                      id="name"
                      name="name"
                      placeholder="Enter category name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="focus:border-blue-500 transition-colors"
                      required
                    />
                  </div>

                  {/* Submit Buttons */}
                  <div className="flex gap-3 pt-4">
                    <Link href="/dashboard/categories" className="flex-1">
                      <Button type="button" variant="outline" className="w-full">
                        Cancel
                      </Button>
                    </Link>
                    <Button
                      type="submit"
                      disabled={updateMutation.isPe}
                      className="flex-1 bg-blue-600 hover:bg-blue-700"
                    >
                      {updateMutation.isPending ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="animate-spin h-4 w-4" />
                          Updating...
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <Edit className="h-4 w-4" />
                          Update Category
                        </span>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* Products Section */}
            <Card className="shadow-sm border-gray-200 mt-6">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Products in this Category
                  <span className="bg-blue-100 text-blue-800 text-sm px-2 py-1 rounded-full">
                    {productCount}
                  </span>
                </CardTitle>
                <CardDescription>
                  {productCount === 0
                    ? "No products are currently assigned to this category"
                    : `Products that belong to "${formData.name}"`
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                {productCount === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p>No products in this category</p>
                    <Link href="/dashboard/products/add">
                      <Button variant="outline" className="mt-3">
                        Add Products
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <>
                    <Button
                      onClick={() => setShowProducts(!showProducts)}
                      variant="outline"
                      className="mb-4"
                    >
                      {showProducts ? "Hide Products" : "View Products"}
                    </Button>

                    {showProducts && (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Product Name</TableHead>
                            <TableHead className="text-center">Price</TableHead>
                            <TableHead className="text-center">Stock</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {products.map((product) => (
                            <TableRow key={product._id}>
                              <TableCell className="font-medium">
                                <div className="flex items-center gap-3">
                                  <Package className="h-5 w-5 text-gray-400" />
                                  {product.name}
                                </div>
                              </TableCell>
                              <TableCell className="text-center font-medium">
                                ${product?.price.toFixed(2)}
                              </TableCell>
                              <TableCell className="text-center">
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${product.quantity > 10
                                  ? "bg-green-100 text-green-800"
                                  : product.quantity > 0
                                    ? "bg-yellow-100 text-yellow-800"
                                    : "bg-red-100 text-red-800"
                                  }`}>
                                  {product?.quantity} in stock
                                </span>
                              </TableCell>
                              <TableCell className="text-right">
                                <Link href={`/dashboard/products/${product._id}`}>
                                  <Button variant="outline" size="sm">
                                    <Eye className="h-3 w-3 mr-1" />
                                    View
                                  </Button>
                                </Link>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditCategoryPage;