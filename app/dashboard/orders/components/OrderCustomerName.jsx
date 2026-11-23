"use client";
import { t } from "@/core/shared/i18n";
import { useT } from "@/core/shared/i18n/LangProvider";

// Shared customer-name display for an order: a real linked customer's
// name, or - for a draft created from the product-grid cart with just a
// typed name - that typed name plus a muted marker that no real customer
// has been linked yet. Falls back to "Deleted Customer" only when neither
// is present (a customer that's since been removed).
export default function OrderCustomerName({ order, className = "" }) {
  const t = useT();
  if (order.customer) {
    return <span className={className}>{order.customer.fullName || t("Deleted Customer")}</span>;
  }
  if (order.customerNameText) {
    return (
      <span className={className}>
        {order.customerNameText}{" "}
        <span className="text-xs text-amber-600 font-normal whitespace-nowrap">
          {t("(not selected real customer)")}
        </span>
      </span>
    );
  }
  return <span className={className}>{t("Deleted Customer")}</span>;
}
