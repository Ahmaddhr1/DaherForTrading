// components/dashboard/DashboardCard.jsx
"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";

const DashboardCard = ({ title, value, description, color, icon: Icon }) => {
  const colorClasses = {
    green: "text-green-600",
    blue: "text-blue-600",
    purple: "text-purple-600",
    orange: "text-orange-600",
    red: "text-red-600",
    yellow: "text-yellow-600",
  };

  const iconBg = {
    green: "bg-green-100 text-green-600",
    blue: "bg-blue-100 text-blue-600",
    purple: "bg-purple-100 text-purple-600",
    orange: "bg-orange-100 text-orange-600",
    red: "bg-red-100 text-red-600",
    yellow: "bg-yellow-100 text-yellow-600",
  };

  return (
    <Card className="shadow-sm border-gray-200 h-full">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide truncate">
              {title}
            </p>
            <div className={`text-2xl font-bold mt-1 ${colorClasses[color] || "text-gray-900"}`}>
              {value}
            </div>
            {description && (
              <p className="text-xs text-gray-500 mt-1">{description}</p>
            )}
          </div>
          {Icon && (
            <div className={`p-2 rounded-lg shrink-0 ${iconBg[color] || "bg-gray-100 text-gray-600"}`}>
              <Icon className="h-4 w-4" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default DashboardCard;
