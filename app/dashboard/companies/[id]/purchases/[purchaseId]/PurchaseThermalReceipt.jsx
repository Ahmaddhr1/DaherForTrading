"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { format } from "date-fns";
import { useSettings, formatLL } from "@/lib/currency";

// Same narrow 80mm thermal-receipt look as the order receipt (see
// app/dashboard/invoices/[id]/ThermalReceipt.jsx) but for a single
// purchase from a supplier - one line item (this purchase's product),
// plus the company's overall remaining debt.
export default function PurchaseThermalReceipt({ purchase }) {
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
      <div className="mx-auto w-[80mm] p-2 font-mono text-[11px] leading-tight text-black bg-white">
        <div className="text-center mb-2">
          <p className="text-sm font-bold">M.D.T</p>
          <p>Daher For Trading</p>
          <p>Purchase Receipt</p>
        </div>

        <div className="border-t border-dashed border-black my-1" />

        <p>Purchase #{purchase._id?.slice(-6).toUpperCase()}</p>
        <p>{format(new Date(purchase.createdAt), "MMM d, yyyy h:mm a")}</p>
        <p>Supplier: {purchase.company?.name || "Unknown"}</p>

        <div className="border-t border-dashed border-black my-1" />

        <div className="mb-1">
          <div className="flex justify-between">
            <span>{purchase.productName}</span>
          </div>
          <div className="flex justify-between">
            <span>
              {purchase.quantity} x ${Number(purchase.unitPrice).toFixed(2)}
              {discount > 0 ? ` - $${discount.toFixed(2)}` : ""}
            </span>
            <span>${(lineSubtotal - discount).toFixed(2)}</span>
          </div>
        </div>

        <div className="border-t border-dashed border-black my-1" />

        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>${lineSubtotal.toFixed(2)}</span>
        </div>
        {discount > 0 && (
          <div className="flex justify-between">
            <span>Discount</span>
            <span>-${discount.toFixed(2)}</span>
          </div>
        )}
        {taxAmount > 0 && (
          <div className="flex justify-between">
            <span>Tax ({taxRate}%)</span>
            <span>+${taxAmount.toFixed(2)}</span>
          </div>
        )}

        <div className="flex justify-between font-bold">
          <span>TOTAL</span>
          <span>${Number(purchase.total).toFixed(2)}</span>
        </div>
        {dollarRate > 0 && (
          <div className="flex justify-between">
            <span>≈</span>
            <span>{formatLL(purchase.total, dollarRate)}</span>
          </div>
        )}
        <div className="flex justify-between font-bold">
          <span>Status</span>
          <span>{purchase.paid ? "PAID" : "NOT PAID"}</span>
        </div>

        {typeof companyDebt === "number" && (
          <>
            <div className="border-t border-dashed border-black my-1" />
            <div className="flex justify-between font-bold">
              <span>Supplier Total Debt</span>
              <span>${companyDebt.toFixed(2)}</span>
            </div>
          </>
        )}

        <div className="border-t border-dashed border-black my-1" />

        <p className="text-center mt-2">Thank you!</p>
      </div>
    </div>,
    document.body
  );
}
