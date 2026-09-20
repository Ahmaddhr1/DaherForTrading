"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { format } from "date-fns";
import { useSettings, formatLL } from "@/lib/currency";

// Narrow, monospace, supermarket-style receipt meant for printing on an
// 80mm thermal printer. Rendered via a portal so it becomes a direct
// sibling of the app root under <body> - see the "printing-thermal" rules
// in globals.css for how it's swapped in during printing.
export default function ThermalReceipt({ order }) {
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
          <p className="text-sm font-bold">M.D.T</p>
          <p>Daher For Trading</p>
        </div>

        <div className="border-t border-dashed border-black my-1" />

        <p>Order #{order._id?.slice(-6).toUpperCase()}</p>
        <p>{format(new Date(order.createdAt), "MMM d, yyyy h:mm a")}</p>
        <p>Customer: {order.customer?.fullName || "Walk-in"}</p>

        <div className="border-t border-dashed border-black my-1" />

        <div className="flex justify-between font-bold">
          <span>Item</span>
          <span>Qty x Price - Disc = Total</span>
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
                  {item.quantity} x ${Number(item.price).toFixed(3)}
                  {lineDiscount > 0 ? ` - $${lineDiscount.toFixed(3)}` : ""}
                </span>
                <span>${lineTotal.toFixed(3)}</span>
              </div>
            </div>
          );
        })}

        <div className="border-t border-dashed border-black my-1" />

        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>${subtotal.toFixed(3)}</span>
        </div>
        {discountTotal > 0 && (
          <div className="flex justify-between">
            <span>Discount</span>
            <span>-${discountTotal.toFixed(3)}</span>
          </div>
        )}
        {taxAmount > 0 && (
          <div className="flex justify-between">
            <span>Tax ({taxRate}%)</span>
            <span>+${taxAmount.toFixed(3)}</span>
          </div>
        )}

        <div className="flex justify-between font-bold">
          <span>TOTAL</span>
          <span>${Number(order.total).toFixed(3)}</span>
        </div>
        {dollarRate > 0 && (
          <div className="flex justify-between">
            <span>≈</span>
            <span>{formatLL(order.total, dollarRate)}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span>Paid</span>
          <span>${Number(order.amountpaid || 0).toFixed(3)}</span>
        </div>
        <div className="flex justify-between">
          <span>Remaining</span>
          <span>${Number(order.remainingBalance || 0).toFixed(3)}</span>
        </div>
        <div className="flex justify-between font-bold">
          <span>Status</span>
          <span>{isPaidInFull ? "PAID" : "NOT PAID"}</span>
        </div>

        {typeof customerDebt === "number" && (
          <>
            <div className="border-t border-dashed border-black my-1" />
            <div className="flex justify-between font-bold">
              <span>Customer Total Debt</span>
              <span>${customerDebt.toFixed(3)}</span>
            </div>
          </>
        )}

        <div className="border-t border-dashed border-black my-1" />

        <p className="text-center mt-2">Thank you for your business!</p>
      </div>
    </div>,
    document.body
  );
}
