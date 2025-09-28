"use client";

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, Clock, DollarSign } from "lucide-react";
import TodaysOrders from "./components/TodaysOrders";
import PendingOrders from "./components/PendingOrders";
import PartiallyPaidOrders from "./components/PartiallyPaidOrders";

const OrdersPage = () => {
  const [activeTab, setActiveTab] = useState("today");

  const renderActiveComponent = () => {
    switch (activeTab) {
      case "today":
        return <TodaysOrders />;
      case "pending":
        return <PendingOrders />;
      case "partially-paid":
        return <PartiallyPaidOrders />;
      default:
        return <TodaysOrders />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="container mx-auto px-4 max-w-4xl">
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
              Browse orders by their payment status and timeline
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
              <TabsList className="grid grid-cols-3 w-full">
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4 text-center">
              <Package className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-blue-900">Today</div>
              <div className="text-sm text-blue-700">Orders</div>
            </CardContent>
          </Card>

          <Card className="bg-yellow-50 border-yellow-200">
            <CardContent className="p-4 text-center">
              <Clock className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-yellow-900">Pending</div>
              <div className="text-sm text-yellow-700">Awaiting Payment</div>
            </CardContent>
          </Card>

          <Card className="bg-orange-50 border-orange-200">
            <CardContent className="p-4 text-center">
              <DollarSign className="h-8 w-8 text-orange-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-orange-900">Partial</div>
              <div className="text-sm text-orange-700">Partially Paid</div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default OrdersPage;
