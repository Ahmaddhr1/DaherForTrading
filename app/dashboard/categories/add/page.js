
"use client";

import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ArrowLeft, FolderPlus, Loader2, Tag, FileText } from "lucide-react";

export default function AddCategoryPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    description: ""
  });

  // Create category mutation
  const mutation = useMutation({
    mutationFn: async (categoryData) => {
      const response = await axios.post("/api/categories", categoryData);
      return response.data;
    },
    onSuccess: () => {
      toast.success("Category Created Successfully!", {
        description: `${formData.name} has been added to your categories.`
      });
      router.push("/dashboard/categories");
    },
    onError: (error) => {
      toast.error("Category Creation Failed", {
        description: error.response?.data?.error || "Error creating category"
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

    mutation.mutate(formData);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="container mx-auto px-4 max-w-2xl">
        
        {/* Header */}
        <div className="mb-8">
          <Link href="/dashboard/categories">
            <Button variant="ghost" className="mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-900">
              <ArrowLeft className="h-4 w-4" />
              Back to Categories
            </Button>
          </Link>
          
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FolderPlus className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Add New Category</h1>
              <p className="text-gray-600">Create a new category to organize your products</p>
            </div>
          </div>
        </div>

        <div className="w-full">
          {/* Main Form */}
          <div className="lg:col-span-2">
            <Card className="shadow-sm border-gray-200">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl flex items-center gap-2">
                  <Tag className="h-5 w-5" />
                  Category Information
                </CardTitle>
                <CardDescription>
                  Enter the details for your new category
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  
                  {/* Category Name */}
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm font-medium flex items-center gap-2">
                      <Tag className="h-4 w-4" />
                      Category Name *
                    </Label>
                    <Input
                      id="name"
                      name="name"
                      placeholder="e.g., Electronics, Clothing, Food"
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
                      disabled={mutation.isPending}
                      className="flex-1 bg-blue-600 hover:bg-blue-700"
                    >
                      {mutation.isPending ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="animate-spin h-4 w-4" />
                          Creating Category...
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <FolderPlus className="h-4 w-4" />
                          Create Category
                        </span>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            Need to manage existing categories?{" "}
            <Link href="/dashboard/categories" className="text-blue-600 hover:text-blue-700 underline">
              View all categories
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}