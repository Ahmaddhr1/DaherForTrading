// components/dashboard/TopProducts.jsx
"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Package } from "lucide-react";

const fetchTopProducts = async () => {
  const response = await axios.get("/api/dashboard/top-products");
  return response.data;
};

const TopProducts = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboard-top-products"],
    queryFn: fetchTopProducts,
  });

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-red-500">Error loading top products</div>
        </CardContent>
      </Card>
    );
  }

  const topProducts = data?.topProducts || [];

  return (
    <Card className="shadow-sm border-gray-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg font-medium">
          <Package className="h-5 w-5 text-blue-600" />
          Top 5 Products
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((item) => (
              <Skeleton key={item} className="h-16 rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {topProducts.slice(0, 5).map((product, index) => (
              <div
                key={product._id || index}
                className="flex items-center justify-between bg-gray-50 rounded-lg p-4"
              >
                <div className="flex items-center gap-3">
                  {product.img?.[0] ? (
                    <img
                      src={product.img[0]}
                      alt={product.name}
                      className="w-10 h-10 rounded object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center">
                      <Package className="h-5 w-5 text-gray-400" />
                    </div>
                  )}
                  <div>
                    <p className="font-medium">{product.name}</p>
                    <p className="text-sm text-gray-500">
                      {product.nbOfOrders} orders
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold">${product.price}</p>
                  <p className="text-sm text-gray-500">each</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TopProducts;