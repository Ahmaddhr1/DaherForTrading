// components/dashboard/TopProducts.jsx
"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Package } from "lucide-react";

const fetchTopProducts = async (limit, sort, category) => {
  const response = await axios.get("/api/dashboard/top-products", {
    params: { limit, sort, category: category || undefined },
  });
  return response.data;
};

const TopProducts = ({ limit = 10, sort = "orders", category = "" }) => {
  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboard-top-products", limit, sort, category],
    queryFn: () => fetchTopProducts(limit, sort, category),
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
          Top {limit} Products ({sort === "profit" ? "Most Profitable" : "Most Ordered"})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: Math.min(limit, 5) }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-lg" />
            ))}
          </div>
        ) : topProducts.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No products found</div>
        ) : (
          <div className="space-y-4">
            {topProducts.map((product, index) => (
              <div
                key={product._id || index}
                className="flex items-center justify-between bg-gray-50 rounded-lg p-4"
              >
                <div className="flex items-center gap-3">
                  <Badge className="bg-blue-500 hover:bg-blue-500 w-7 h-7 rounded-full flex items-center justify-center p-0">
                    {index + 1}
                  </Badge>
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
                  {sort === "profit" ? (
                    <p className="font-semibold text-green-600">
                      ${(product.totalProfit || 0).toFixed(3)}
                    </p>
                  ) : (
                    <p className="font-semibold">${product.price}</p>
                  )}
                  <p className="text-sm text-gray-500">
                    {sort === "profit" ? "total profit" : "each"}
                  </p>
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
