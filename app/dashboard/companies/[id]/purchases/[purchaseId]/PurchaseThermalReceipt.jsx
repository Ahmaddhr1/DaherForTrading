"use client";
import { t } from "@/lib/i18n";
import { useT } from "@/lib/i18n/LangProvider";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { format } from "@/lib/i18n/date";
import { useSettings, formatLL } from "@/lib/currency";

// Same narrow 80mm thermal-receipt look as the order receipt (see
// app/dashboard/invoices/[id]/ThermalReceipt.jsx) but for a single
// purchase from a supplier - one line item (this purchase's product),
// plus the company's overall remaining debt.
export default function PurchaseThermalReceipt({ purchase }) {
  const t = useT();
  const [mounted, setMounted] = useState(false);
  const { data: settings } = useSettings();

  useEffect(() => setMounted(true), []);

  if (!mounted || !purchase) return null;

  const lineSubtotal = purchase.unitPrice * purchase.quantity;
  const discount = purchase.discount || 0;
  const taxRate = purchase.taxRate || 0;
  const taxAmount = purchase.taxAmount || 0;
  const dollarRate = settings?.dollarRate;
  const companyDebt = purchase.company?.debt;

  return createPortal(
    <div id="thermal-receipt-root">
      <div className="thermal-receipt mx-auto w-[80mm] px-[3mm] py-2 font-mono text-[13px] font-normal leading-snug text-black bg-white">
        <div className="text-center mb-2">
          <p className="text-lg font-bold">{t("Invento")}</p>
          <p>{t("Purchase Receipt")}</p>
        </div>

        <div className="border-t border-dashed border-black my-1" />

        <p>{t("Purchase #")}{purchase._id?.slice(-6).toUpperCase()}</p>
        <p>{format(new Date(purchase.createdAt), "MMM d, yyyy h:mm a")}</p>
        <p>{t("Supplier:")} {purchase.company?.name || t("Unknown")}</p>

        <div className="border-t border-dashed border-black my-1" />

        <div className="mb-1">
          <div className="flex justify-between">
            <span>{purchase.productName}</span>
          </div>
          <div className="flex justify-between">
            <span>
              {purchase.quantity} {t("x $")}{Number(purchase.unitPrice).toFixed(2)}
              {discount > 0 ? ` - $${discount.toFixed(2)}` : ""}
            </span>
            <span>${(lineSubtotal - discount).toFixed(2)}</span>
          </div>
        </div>

        <div className="border-t border-dashed border-black my-1" />

        <div className="flex justify-between">
          <span>{t("Subtotal")}</span>
          <span>${lineSubtotal.toFixed(2)}</span>
        </div>
        {discount > 0 && (
          <div className="flex justify-between">
            <span>{t("Discount")}</span>
            <span>-${discount.toFixed(2)}</span>
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
          <span>${Number(purchase.total).toFixed(2)}</span>
        </div>
        {dollarRate > 0 && (
          <div className="flex justify-between">
            <span>≈</span>
            <span>{formatLL(purchase.total, dollarRate)}</span>
          </div>
        )}
        <div className="flex justify-between font-bold">
          <span>{t("Status")}</span>
          <span>{purchase.paid ? t("PAID") : t("NOT PAID")}</span>
        </div>

        {typeof companyDebt === "number" && (
          <>
            <div className="border-t border-dashed border-black my-1" />
            <div className="flex justify-between font-bold">
              <span>{t("Supplier Total Debt")}</span>
              <span>${companyDebt.toFixed(2)}</span>
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
