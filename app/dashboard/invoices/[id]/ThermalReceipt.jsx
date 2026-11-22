"use client";
import { t } from "@/lib/i18n";
import { useT } from "@/lib/i18n/LangProvider";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { format } from "@/lib/i18n/date";
import { useSettings, formatLL } from "@/lib/currency";

// Narrow, monospace, supermarket-style receipt meant for printing on an
// 80mm thermal printer. Rendered via a portal so it becomes a direct
// sibling of the app root under <body> - see the "printing-thermal" rules
// in globals.css for how it's swapped in during printing.
export default function ThermalReceipt({ order }) {
  const t = useT();
  const [mounted, setMounted] = useState(false);
  const { data: settings } = useSettings();

  useEffect(() => setMounted(true), []);

  if (!mounted || !order) return null;

  const products = order.products || [];
  const subtotal = products.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discountTotal = order.discountTotal ?? products.reduce((sum, item) => sum + (item.discount || 0), 0);
  const taxRate = order.taxRate || 0;
  const taxAmount = order.taxAmount || 0;
  const isPaidInFull = order.status === "paid";
  const customerDebt = order.customer?.debt;
  const dollarRate = settings?.dollarRate;

  return createPortal(
    <div id="thermal-receipt-root">
      <div className="mx-auto w-[80mm] p-2 font-mono text-[11px] leading-tight text-black bg-white">
        <div className="text-center mb-2">
          <p className="text-sm font-bold">{t("Invento")}</p>
        </div>

        <div className="border-t border-dashed border-black my-1" />

        <p>{t("Order #")}{order._id?.slice(-6).toUpperCase()}</p>
        <p>{format(new Date(order.createdAt), "MMM d, yyyy h:mm a")}</p>
        <p>{t("Customer:")} {order.customer?.fullName || t("Walk-in")}</p>

        <div className="border-t border-dashed border-black my-1" />

        <div className="flex justify-between font-bold">
          <span>{t("Item")}</span>
          <span>{t("Qty x Price - Disc = Total")}</span>
        </div>
        {products.map((item) => {
          const lineSubtotal = item.price * item.quantity;
          const lineDiscount = item.discount || 0;
          const lineTotal = lineSubtotal - lineDiscount;
          return (
            <div key={item._id || item.productId} className="mb-1">
              <div className="flex justify-between">
                <span>{item.name}</span>
              </div>
              <div className="flex justify-between">
                <span>
                  {item.quantity} {t("x $")}{Number(item.price).toFixed(2)}
                  {lineDiscount > 0 ? ` - $${lineDiscount.toFixed(2)}` : ""}
                </span>
                <span>${lineTotal.toFixed(2)}</span>
              </div>
            </div>
          );
        })}

        <div className="border-t border-dashed border-black my-1" />

        <div className="flex justify-between">
          <span>{t("Subtotal")}</span>
          <span>${subtotal.toFixed(2)}</span>
        </div>
        {discountTotal > 0 && (
          <div className="flex justify-between">
            <span>{t("Discount")}</span>
            <span>-${discountTotal.toFixed(2)}</span>
          </div>
        )}
        {taxAmount > 0 && (
          <div className="flex justify-between">
            <span>{t("Tax (")}{taxRate}%)</span>
            <span>+${taxAmount.toFixed(2)}</span>
          </div>
        )}

        <div className="flex justify-between font-bold">
          <span>{t("TOTAL")}</span>
          <span>${Number(order.total).toFixed(2)}</span>
        </div>
        {dollarRate > 0 && (
          <div className="flex justify-between">
            <span>≈</span>
            <span>{formatLL(order.total, dollarRate)}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span>{t("Paid")}</span>
          <span>${Number(order.amountpaid || 0).toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span>{t("Remaining")}</span>
          <span>${Number(order.remainingBalance || 0).toFixed(2)}</span>
        </div>
        <div className="flex justify-between font-bold">
          <span>{t("Status")}</span>
          <span>{isPaidInFull ? t("PAID") : t("NOT PAID")}</span>
        </div>

        {typeof customerDebt === "number" && (
          <>
            <div className="border-t border-dashed border-black my-1" />
            <div className="flex justify-between font-bold">
              <span>{t("Customer Total Debt")}</span>
              <span>${customerDebt.toFixed(2)}</span>
            </div>
          </>
        )}

        <div className="border-t border-dashed border-black my-1" />

        <p className="text-center mt-2">{t("Thank you for your business!")}</p>
      </div>
    </div>,
    document.body
  );
}
