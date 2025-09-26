"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { format } from "date-fns";
import { Loader2, User, Package, CreditCard, Calendar, Tag } from "lucide-react";

import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const fetchOrder = async (id) => {
  const res = await fetch(`/api/orders/${id}`);
  if (!res.ok) throw new Error("Failed to fetch order");
  return res.json();
};

export default function OrderDetailsPage() {
  const { id } = useParams();

  const { data: order, isLoading, isError } = useQuery({
    queryKey: ["order", id],
    queryFn: () => fetchOrder(id),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-96">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-gray-600 mx-auto" />
          <p className="text-gray-600">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (isError || !order) {
    return (
      <div className="flex justify-center items-center min-h-96">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <div className="text-red-500 bg-red-50 rounded-full p-3 w-12 h-12 mx-auto mb-4 flex items-center justify-center">
              <Tag className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Order</h3>
            <p className="text-gray-600">Unable to load order details. Please try again.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusConfig = {
    paid: { label: "Paid", color: "bg-green-100 text-green-800" },
    partiallyPaid: { label: "Partially Paid", color: "bg-yellow-100 text-yellow-800" },
    unpaid: { label: "Unpaid", color: "bg-red-100 text-red-800" },
  };

  const status = statusConfig[order.status] || statusConfig.unpaid;

  return (
    <div className="min-h-screen bg-gray-50/30 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-2">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Order Details</h1>
              <p className="text-gray-600 mt-1">Order #{order._id}</p>
            </div>
            <Badge className={`px-3 py-1 text-sm font-medium ${status.color} self-start sm:self-auto`}>
              {status.label}
            </Badge>
          </div>
          <div className="flex items-center text-gray-500 text-sm">
            <Calendar className="h-4 w-4 mr-1" />
            {format(new Date(order.createdAt), "EEEE, MMMM d, yyyy 'at' h:mm a")}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Products Table */}
            <Card className="shadow-sm border-gray-200">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center text-lg">
                  <Package className="h-5 w-5 mr-2 text-blue-600" />
                  Order Items
                </CardTitle>
                <CardDescription>Products included in this order</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-gray-50/50">
                    <TableRow>
                      <TableHead className="font-semibold text-gray-700">Product</TableHead>
                      <TableHead className="text-center font-semibold text-gray-700">Quantity</TableHead>
                      <TableHead className="text-center font-semibold text-gray-700">Unit Price</TableHead>
                      <TableHead className="text-right font-semibold text-gray-700">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {order.products.map((item, index) => (
                      <TableRow key={item.productId} className={index % 2 === 0 ? "bg-gray-50/30" : ""}>
                        <TableCell className="font-medium text-gray-900">{item.name}</TableCell>
                        <TableCell className="text-center text-gray-600">{item.quantity}</TableCell>
                        <TableCell className="text-center text-gray-600">
                          ${item.price.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right font-medium text-gray-900">
                          ${(item.price * item.quantity).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Customer Info */}
            <Card className="shadow-sm border-gray-200">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center text-lg">
                  <User className="h-5 w-5 mr-2 text-blue-600" />
                  Customer Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-gray-500">Full Name</p>
                  <p className="text-gray-900">{order.customer?.fullName || "Not provided"}</p>
                </div>
                <Separator />
                <div>
                  <p className="text-sm font-medium text-gray-500">Phone Number</p>
                  <p className="text-gray-900">{order.customer?.phoneNumber || "Not provided"}</p>
                </div>
              </CardContent>
            </Card>

            {/* Payment Summary */}
            <Card className="shadow-sm border-gray-200">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center text-lg">
                  <CreditCard className="h-5 w-5 mr-2 text-blue-600" />
                  Payment Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium text-gray-900">${Number(order.total).toFixed(2)}</span>
                </div>
                
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="text-gray-600">Amount Paid</span>
                  <span className="text-green-600 font-medium">
                    ${Number(order.amountpaid || 0).toFixed(2)}
                  </span>
                </div>
                
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="text-gray-600">Remaining Balance</span>
                  <span className={`font-medium ${
                    Number(order.remainingBalance || 0) > 0 ? "text-red-600" : "text-gray-900"
                  }`}>
                    ${Number(order.remainingBalance || 0).toFixed(2)}
                  </span>
                </div>
                
                <Separator />
                
                <div className="flex justify-between items-center pt-2">
                  <span className="font-semibold text-gray-900">Status</span>
                  <Badge variant="outline" className={status.color}>
                    {status.label}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-gray-200 text-center">
          <p className="text-gray-500 text-sm">
            Order management system • Powered by Ahmad Daher
          </p>
        </div>
      </div>
    </div>
  );
}