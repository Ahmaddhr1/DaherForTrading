"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FormSkeleton, PageHeaderSkeleton } from "@/components/ui/skeleton-patterns";
import {
  Loader2,
  Building2,
  Phone,
  MapPin,
  ArrowLeft,
  ShoppingBag,
  Plus,
  History,
  Lock,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "sonner";
import { useParams } from "next/navigation";
import Link from "next/link";

const EditCompanyPage = () => {
  const router = useRouter();
  const { id } = useParams();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    name: "",
    phoneNumber: "",
    address: "",
    debt: "",
  });

  const { data, isLoading, isError } = useQuery({
    queryKey: ["company", id],
    queryFn: async () => {
      const res = await axios.get(`/api/companies/${id}`);
      return res.data;
    },
    enabled: !!id,
  });

  useEffect(() => {
    if (data) {
      setForm({
        name: data.name || "",
        phoneNumber: data.phoneNumber || "",
        address: data.address || "",
        debt: data.debt?.toString() || "0",
      });
    }
    if (isError) {
      toast.error("Failed to fetch company data.");
    }
  }, [data, isError]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const mutation = useMutation({
    mutationFn: async (updatedData) => {
      const res = await axios.put(`/api/companies/${id}`, updatedData);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Company Updated Successfully!");
      queryClient.invalidateQueries(["company", id]);
    },
    onError: (error) => {
      toast.error("Update Failed", {
        description: error.response?.data?.error || "Failed to update company.",
      });
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Validation Error", { description: "Company name is required." });
      return;
    }
    const { debt, ...editableFields } = form;
    mutation.mutate(editableFields);
  };

  const hasDebt = parseFloat(form.debt) > 0;
  const purchasesCount = data?.purchases?.length || 0;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50/30 py-8">
        <div className="container mx-auto px-4 max-w-4xl">
          <PageHeaderSkeleton />
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <Card className="shadow-sm border-gray-200">
                <CardContent className="pt-6">
                  <FormSkeleton fields={4} />
                </CardContent>
              </Card>
            </div>
            <div className="lg:col-span-1">
              <Card className="shadow-sm border-gray-200">
                <CardContent className="pt-6 space-y-4">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-20 w-full rounded-lg" />
                  <Skeleton className="h-20 w-full rounded-lg" />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/30 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Companies
          </Button>

          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Building2 className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{data?.name || "Company"}</h1>
                <p className="text-gray-600">Supplier details and purchase history</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link href={`/dashboard/companies/${id}/purchases`}>
                <Button variant="outline" className="flex items-center gap-2">
                  <History className="h-4 w-4" />
                  Purchase History ({purchasesCount})
                </Button>
              </Link>
              <Link href={`/dashboard/companies/${id}/addpurchase`}>
                <Button className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  New Purchase
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Card className="shadow-sm border-gray-200">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Company Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm font-medium flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Company Name *
                    </Label>
                    <Input id="name" name="name" value={form.name} onChange={handleChange} required />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phoneNumber" className="text-sm font-medium flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      Phone Number
                    </Label>
                    <Input id="phoneNumber" name="phoneNumber" value={form.phoneNumber} onChange={handleChange} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address" className="text-sm font-medium flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Address
                    </Label>
                    <Input id="address" name="address" value={form.address} onChange={handleChange} />
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label htmlFor="debt" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      Amount We Owe ($)
                      <Lock className="h-3 w-3 text-gray-400" />
                    </Label>
                    <Input
                      id="debt"
                      name="debt"
                      value={form.debt}
                      disabled
                      readOnly
                      className="max-w-xs bg-gray-100 text-gray-500 cursor-not-allowed"
                    />
                    <p className="text-xs text-gray-500">
                      This is tracked automatically from unpaid purchases and can&apos;t be edited directly.
                    </p>
                  </div>

                  <Separator />

                  <div className="flex gap-3 pt-2">
                    <Button type="button" variant="outline" onClick={() => router.back()} className="flex-1">
                      Cancel
                    </Button>
                    <Button type="submit" disabled={mutation.isPending} className="flex-1 bg-blue-600 hover:bg-blue-700">
                      {mutation.isPending ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="animate-spin h-4 w-4" />
                          Updating...
                        </span>
                      ) : (
                        "Update Company"
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-1">
            <Card className="shadow-sm border-gray-200 sticky top-6">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Summary</CardTitle>
                <CardDescription>Current standing with this supplier</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="text-sm text-gray-600">Total Purchases</span>
                  <Badge variant="outline" className="flex items-center gap-1">
                    <ShoppingBag className="h-3 w-3" />
                    {purchasesCount}
                  </Badge>
                </div>

                <div className="flex justify-between items-center p-3 rounded-lg bg-amber-50 border border-amber-200">
                  <span className="text-sm font-medium text-amber-800">We Owe</span>
                  <span className="text-lg font-bold text-amber-900">
                    ${(parseFloat(form.debt) || 0).toLocaleString()}
                  </span>
                </div>

                <Badge
                  variant={hasDebt ? "destructive" : "default"}
                  className="w-full justify-center text-sm px-3 py-1"
                >
                  {hasDebt ? "Outstanding Balance" : "Settled"}
                </Badge>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditCompanyPage;
