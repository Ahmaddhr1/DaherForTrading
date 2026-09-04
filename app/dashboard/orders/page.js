"use client";

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, Clock, DollarSign, ListOrdered } from "lucide-react";
import AllOrders from "./components/AllOrders";
import TodaysOrders from "./components/TodaysOrders";
import PendingOrders from "./components/PendingOrders";
import PartiallyPaidOrders from "./components/PartiallyPaidOrders";

const OrdersPage = () => {
  const [activeTab, setActiveTab] = useState("all");

  const renderActiveComponent = () => {
    switch (activeTab) {
      case "all":
        return <AllOrders />;
      case "today":
        return <TodaysOrders />;
      case "pending":
        return <PendingOrders />;
      case "partially-paid":
        return <PartiallyPaidOrders />;
      default:
        return <AllOrders />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Package className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Orders Management</h1>
              <p className="text-gray-600">View and manage all customer orders</p>
            </div>
          </div>
        </div>

        <Card className="shadow-sm border-gray-200">
          <CardHeader>
            <CardTitle className="text-xl">Order Overview</CardTitle>
            <CardDescription>
              Browse all orders, or narrow down by payment status and timeline
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
              <TabsList className="grid grid-cols-4 w-full">
                <TabsTrigger value="all" className="flex items-center gap-2">
                  <ListOrdered className="h-4 w-4" />
                  All Orders
                </TabsTrigger>
                <TabsTrigger value="today" className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  {"Today's"} Orders
                </TabsTrigger>
                <TabsTrigger value="pending" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Pending
                </TabsTrigger>
                <TabsTrigger value="partially-paid" className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Partially Paid
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {renderActiveComponent()}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default OrdersPage;
