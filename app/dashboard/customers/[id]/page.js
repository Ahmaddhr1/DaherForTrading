"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Eye, Loader2, User, Phone, DollarSign, ArrowLeft, UserCog, Package, PhoneCall, PillBottle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "sonner";
import { useParams } from "next/navigation";
import Link from "next/link";

const EditCustomerPage = () => {
  const router = useRouter();
  const { id } = useParams();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    fullName: "",
    phoneNumber: "",
    debt: "",
    orders: [],
    smallBottlesDebt: 0,
    bigBottlesDebt: 0
  });

  // Fetch existing customer data
  const { data, isLoading, isError } = useQuery({
    queryKey: ["customer", id],
    queryFn: async () => {
      const res = await axios.get(`/api/customers/${id}`);
      return res.data;
    },
    enabled: !!id,
  });

  useEffect(() => {
    if (data) {
      setForm({
        fullName: data.fullName || "",
        phoneNumber: data.phoneNumber || "",
        debt: data.debt?.toString() || "",
        orders: data?.orders || [],
        smallBottlesDebt: data.smallBottlesDebt || 0,
        bigBottlesDebt: data.bigBottlesDebt || 0
      });
    }
    if (isError) {
      toast.error("Failed to fetch customer data.");
    }
  }, [data, isError]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    const numericFields = ["phoneNumber", "debt", "bigBottlesDebt", "smallBottlesDebt"];
    const cleanValue = numericFields.includes(name) ? value.replace(/\D/g, "") : value;
    
    setForm((prev) => ({ ...prev, [name]: cleanValue }));
  };

  // Mutation for updating customer info
  const mutation = useMutation({
    mutationFn: async (updatedData) => {
      const res = await axios.put(`/api/customers/${id}`, updatedData);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success("Customer Updated Successfully!", {
        description: `${form.fullName}'s information has been updated.`
      });
      queryClient.invalidateQueries(["customer", id]);
    },
    onError: (error) => {
      const message = error.response?.data?.error || "Failed to update customer.";
      toast.error("Update Failed", {
        description: message
      });
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!form.fullName.trim()) {
      toast.error("Validation Error", {
        description: "Full name is required."
      });
      return;
    }

    if (!form.phoneNumber) {
      toast.error("Validation Error", {
        description: "Phone number is required."
      });
      return;
    }

    mutation.mutate({
      ...form,
      debt: form.debt || "0",
      smallBottlesDebt: parseInt(form.smallBottlesDebt) || 0,
      bigBottlesDebt: parseInt(form.bigBottlesDebt) || 0
    });
  };

  const hasMonetaryDebt = parseInt(form.debt) > 0;
  const hasBottleDebt = parseInt(form.smallBottlesDebt) > 0 || parseInt(form.bigBottlesDebt) > 0;
  const hasAnyDebt = hasMonetaryDebt || hasBottleDebt;
  const ordersCount = form.orders?.length || 0;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50/30 py-8">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="flex justify-center items-center min-h-96">
            <div className="text-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-gray-600 mx-auto" />
              <p className="text-gray-600">Loading customer data...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
            Back to Customers
          </Button>
          
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <UserCog className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Edit Customer</h1>
                <p className="text-gray-600">Update customer profile and debt information</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Link href={`/dashboard/customers/${id}/addorder`}>
                <Button className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Create Order
                </Button>
              </Link>
            </div>
          </div>

          {/* Customer Quick Actions */}
          <div className="flex flex-wrap gap-4 mb-4">
            <a
              href={`https://wa.me/${form.phoneNumber}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" className="flex items-center gap-2">
                <PhoneCall className="h-4 w-4" />
                Contact via WhatsApp
              </Button>
            </a>
            
            {ordersCount > 0 && (
              <Link href={`/dashboard/customers/${id}/orders`}>
                <Button variant="outline" className="flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  View Orders ({ordersCount})
                </Button>
              </Link>
            )}
          </div>

          {ordersCount === 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-amber-800">
                <Package className="h-4 w-4" />
                <span className="font-medium">No Orders Yet</span>
              </div>
              <p className="text-amber-700 text-sm mt-1">
                This customer doesn&apos;t have any orders. Create their first order to get started.
              </p>
            </div>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Form */}
          <div className="lg:col-span-2">
            <Card className="shadow-sm border-gray-200">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Customer Information
                </CardTitle>
                <CardDescription>
                  Update customer details and debt information
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Personal Information Section */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-500 uppercase tracking-wide">
                      <div className="w-1 h-4 bg-blue-600 rounded"></div>
                      Personal Details
                    </div>
                    
                    <div className="grid gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="fullName" className="text-sm font-medium flex items-center gap-2">
                          <User className="h-4 w-4" />
                          Full Name *
                        </Label>
                        <Input
                          id="fullName"
                          type="text"
                          placeholder="Enter full name"
                          name="fullName"
                          value={form.fullName}
                          onChange={handleChange}
                          className="focus:border-blue-500 transition-colors"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="phoneNumber" className="text-sm font-medium flex items-center gap-2">
                          <Phone className="h-4 w-4" />
                          Phone Number *
                        </Label>
                        <Input
                          id="phoneNumber"
                          type="text"
                          inputMode="numeric"
                          placeholder="Enter phone number"
                          name="phoneNumber"
                          value={form.phoneNumber}
                          onChange={handleChange}
                          className="focus:border-blue-500 transition-colors"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Debt Information Section */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-500 uppercase tracking-wide">
                      <div className="w-1 h-4 bg-amber-600 rounded"></div>
                      Debt Information
                    </div>
                    
                    <div className="space-y-6">
                      {/* Monetary Debt */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-5 w-5 text-amber-600" />
                          <h3 className="font-medium text-gray-900">Monetary Debt</h3>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="debt" className="text-sm font-medium text-gray-700">
                            Amount Owed ($)
                          </Label>
                          <Input
                            id="debt"
                            type="text"
                            inputMode="numeric"
                            placeholder="0"
                            name="debt"
                            value={form.debt}
                            onChange={handleChange}
                            className="focus:border-amber-500 transition-colors max-w-xs"
                          />
                        </div>
                      </div>

                      <Separator />

                      {/* Bottle Debt */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <PillBottle className="h-5 w-5 text-green-600" />
                          <h3 className="font-medium text-gray-900">Bottle Debt</h3>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="smallBottlesDebt" className="text-sm font-medium text-gray-700">
                              Small Bottles
                            </Label>
                            <Input
                              id="smallBottlesDebt"
                              type="number"
                              inputMode="numeric"
                              placeholder="0"
                              name="smallBottlesDebt"
                              value={form.smallBottlesDebt}
                              onChange={handleChange}
                              min="0"
                              className="focus:border-green-500 transition-colors"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="bigBottlesDebt" className="text-sm font-medium text-gray-700">
                              Big Bottles
                            </Label>
                            <Input
                              id="bigBottlesDebt"
                              type="number"
                              inputMode="numeric"
                              placeholder="0"
                              name="bigBottlesDebt"
                              value={form.bigBottlesDebt}
                              onChange={handleChange}
                              min="0"
                              className="focus:border-green-500 transition-colors"
                            />
                          </div>
                        </div>
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
                      disabled={mutation.isPending}
                      className="flex-1 bg-blue-600 hover:bg-blue-700"
                    >
                      {mutation.isPending ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="animate-spin h-4 w-4" />
                          Updating Customer...
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <UserCog className="h-4 w-4" />
                          Update Customer
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
                <CardTitle className="text-lg">Customer Summary</CardTitle>
                <CardDescription>Current customer overview</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Customer Info */}
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-900 flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Customer Details
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Name</span>
                      <span className="font-medium text-gray-900 truncate max-w-[120px] text-right">
                        {form.fullName || "Not provided"}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Phone</span>
                      <span className="font-medium text-gray-900">
                        {form.phoneNumber || "Not provided"}
                      </span>
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t">
                      <span className="text-sm text-gray-600">Total Orders</span>
                      <Badge variant="outline">{ordersCount}</Badge>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Monetary Debt Summary */}
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-900 flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Money Debt
                  </h4>
                  <div className="flex justify-between items-center p-3 rounded-lg bg-amber-50 border border-amber-200">
                    <span className="text-sm font-medium text-amber-800">Amount Owed</span>
                    <div className="text-right">
                      <span className="text-lg font-bold text-amber-900">
                        ${(parseInt(form.debt) || 0).toLocaleString()}
                      </span>
                      <Badge 
                        variant={hasMonetaryDebt ? "default" : "outline"} 
                        className={`ml-2 ${hasMonetaryDebt ? 'bg-amber-100 text-amber-800' : ''}`}
                      >
                        {hasMonetaryDebt ? "Owes Money" : "No Money Debt"}
                      </Badge>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Bottle Debt Summary */}
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-900 flex items-center gap-2">
                    <PillBottle className="h-4 w-4" />
                    Bottle Debt
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Small Bottles</span>
                      <span className="font-medium text-gray-900">{form.smallBottlesDebt || 0}</span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Big Bottles</span>
                      <span className="font-medium text-gray-900">{form.bigBottlesDebt || 0}</span>
                    </div>
                    
                    <div className="flex justify-between items-center pt-2 border-t">
                      <span className="text-sm font-medium text-gray-700">Total Bottles</span>
                      <Badge 
                        variant={hasBottleDebt ? "default" : "outline"} 
                        className={hasBottleDebt ? 'bg-green-100 text-green-800' : ''}
                      >
                        {hasBottleDebt ? "Owes Bottles" : "No Bottle Debt"}
                      </Badge>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Overall Status */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 flex items-center gap-2 mb-2">
                    <UserCog className="h-4 w-4" />
                    Overall Status
                  </h4>
                  <div className="text-center">
                    <Badge 
                      variant={hasAnyDebt ? "destructive" : "default"} 
                      className="text-sm px-3 py-1 mb-2"
                    >
                      {hasAnyDebt ? "Customer Has Debt" : "Debt-Free Customer"}
                    </Badge>
                    <p className="text-xs text-gray-600">
                      {hasAnyDebt 
                        ? "This customer has outstanding obligations" 
                        : "No current debts or bottle obligations"
                      }
                    </p>
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

export default EditCustomerPage;