"use client";
import { t } from "@/lib/i18n";
import { useT } from "@/lib/i18n/LangProvider";

import { Card, CardContent } from "@/components/ui/card";
import { Calendar, Package } from "lucide-react";
import OrderActions from "./OrderActions";
import OrderCustomerName from "./OrderCustomerName";
import { orderNumber } from "@/lib/orderNumber";

// One card design for orders everywhere in the Orders tab (All Orders on
// mobile, Today's, Pending, Partially Paid). Status drives the left accent
// colour and badge; the order number is always shown so it can be matched
// against invoices/payments and searched for.
export const ORDER_STATUS_STYLES = {
  paid: {
    label: "Paid",
    accent: "border-s-green-500",
    badge: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  },
  pending: {
    label: "Pending",
    accent: "border-s-amber-500",
    badge: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  },
  partiallyPaid: {
    label: "Partially Paid",
    accent: "border-s-orange-500",
    badge: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  },
  draft: {
    label: "Draft",
    accent: "border-s-gray-400",
    badge: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  },
};

export function OrderStatusBadge({ status }) {
  const t = useT();
  const style = ORDER_STATUS_STYLES[status] || ORDER_STATUS_STYLES.draft;
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${style.badge}`}>
      {t(style.label)}
    </span>
  );
}

const money = (n) =>
  `$${Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// `actions`: custom footer/menu content. When omitted, the standard
// OrderActions buttons are shown.
const OrderCard = ({ order, onStatusUpdate, actions }) => {
  const t = useT();
  const style = ORDER_STATUS_STYLES[order.status] || ORDER_STATUS_STYLES.draft;
  const itemsCount = order.products?.length || 0;
  const paid = order.amountpaid || 0;
  const paidPct = order.total > 0 ? Math.min(100, Math.round((paid / order.total) * 100)) : 0;
  const created = new Date(order.createdAt);

  return (
    <Card className={`border-s-4 ${style.accent} shadow-sm hover:shadow-md transition-shadow`}>
      <CardContent className="p-4">
        {/* Top row: order number + status */}
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-xs font-semibold tracking-wide text-gray-500 dark:text-gray-400">
            #{orderNumber(order._id)}
          </span>
          <OrderStatusBadge status={order.status} />
        </div>

        {/* Customer + amount */}
        <div className="mt-2 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">
              <OrderCustomerName order={order} />
            </h3>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-500 dark:text-gray-400">
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {created.toLocaleDateString()} · {created.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
              <span className="inline-flex items-center gap-1">
                <Package className="h-3 w-3" />
                {itemsCount} {itemsCount === 1 ? t("item") : t("items")}
              </span>
            </div>
          </div>
          <p className="text-lg font-bold text-gray-900 dark:text-gray-100 whitespace-nowrap">{money(order.total)}</p>
        </div>

        {/* Payment progress for partially paid orders */}
        {order.status === "partiallyPaid" && (
          <div className="mt-3">
            <div className="h-1.5 w-full rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
              <div className="h-full rounded-full bg-orange-500" style={{ width: `${paidPct}%` }} />
            </div>
            <div className="mt-1 flex justify-between text-xs">
              <span className="text-gray-600 dark:text-gray-400">{t("Paid")} {money(paid)}</span>
              <span className="font-medium text-orange-600">{t("Remaining")} {money(order.remainingBalance)}</span>
            </div>
          </div>
        )}

        {/* Footer actions */}
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
          {actions ?? <OrderActions order={order} onStatusUpdate={onStatusUpdate} />}
        </div>
      </CardContent>
    </Card>
  );
};

export default OrderCard;
