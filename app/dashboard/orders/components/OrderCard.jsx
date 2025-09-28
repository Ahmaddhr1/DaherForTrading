"use client";

import { Card, CardContent } from "@/components/ui/card";
import OrderActions from "./OrderActions";

const OrderCard = ({ order, borderColor = "border-gray-200", onStatusUpdate }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case "paid":
        return "text-green-600";
      case "pending":
        return "text-yellow-600";
      case "partiallyPaid":
        return "text-orange-600";
      default:
        return "text-gray-600";
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "paid":
        return "Paid";
      case "pending":
        return "Pending";
      case "partiallyPaid":
        return "Partially Paid";
      default:
        return status;
    }
  };

  return (
    <Card className={`hover:shadow-md transition-shadow ${borderColor}`}>
      <CardContent className="p-4">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-semibold text-gray-900">
                {order.customer?.fullName}
              </h3>
              {order.orderNumber && (
                <span className="text-sm text-gray-500">#{order.orderNumber}</span>
              )}
            </div>

            <div className="space-y-1">
              <p className={`text-sm font-medium ${getStatusColor(order.status)}`}>
                {getStatusText(order.status)}
              </p>

              {order.status === "partiallyPaid" && (
                <div className="text-xs text-orange-600">
                  <p>Paid: ${order.amountpaid || 0} of ${order.total}</p>
                  <p>Remaining: ${order.remainingBalance || 0}</p>
                </div>
              )}

              <p className="text-xs text-gray-500">
                {new Date(order.createdAt).toLocaleDateString()} at{" "}
                {new Date(order.createdAt).toLocaleTimeString()}
              </p>
            </div>
          </div>

          <div className="text-right">
            <p className="font-bold text-lg text-gray-900">${order.total}</p>
            <p className="text-sm text-gray-600">
              {order.products?.length || 0} items
            </p>
          </div>
        </div>

        <OrderActions order={order} onStatusUpdate={onStatusUpdate} />
      </CardContent>
    </Card>
  );
};

export default OrderCard;
