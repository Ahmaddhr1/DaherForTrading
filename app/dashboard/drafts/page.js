"use client";

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";
import DraftOrders from "../orders/components/DraftOrders";

const DraftsPage = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Draft Orders</h1>
              <p className="text-gray-600">
                Orders started from the product cart, awaiting a customer and/or finalization
              </p>
            </div>
          </div>
        </div>

        <Card className="shadow-sm border-gray-200">
          <CardHeader>
            <CardTitle className="text-xl">Drafts</CardTitle>
            <CardDescription>
              Link a customer, continue editing, finalize into a real order, or delete
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DraftOrders />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DraftsPage;
