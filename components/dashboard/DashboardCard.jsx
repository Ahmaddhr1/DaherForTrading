// components/dashboard/DashboardCard.jsx
"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const DashboardCard = ({ title, value, description, color }) => {
  // Simple color mapping
  const colorClasses = {
    green: "text-green-600",
    blue: "text-blue-600", 
    purple: "text-purple-600",
    orange: "text-orange-600"
  };

  return (
    <Card className="shadow-sm border-gray-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-medium text-gray-700">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${colorClasses[color] || "text-gray-900"}`}>
          {value}
        </div>
        {description && (
          <p className="text-sm text-gray-500 mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );
};

export default DashboardCard;