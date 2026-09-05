"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { format } from "date-fns";

// Narrow, monospace, supermarket-style receipt meant for printing on an
// 80mm thermal printer. Rendered via a portal so it becomes a direct
// sibling of the app root under <body> - see the "printing-thermal" rules
// in globals.css for how it's swapped in during printing.
export default function ThermalReceipt({ order }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted || !order) return null;

  const products = order.products || [];

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

        {products.map((item) => (
          <div key={item._id || item.productId} className="mb-1">
            <div className="flex justify-between">
              <span>{item.name}</span>
            </div>
            <div className="flex justify-between">
              <span>
                {item.quantity} x ${Number(item.price).toFixed(2)}
              </span>
              <span>${(item.quantity * item.price).toFixed(2)}</span>
            </div>
          </div>
        ))}

        <div className="border-t border-dashed border-black my-1" />

        <div className="flex justify-between font-bold">
          <span>TOTAL</span>
          <span>${Number(order.total).toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span>Paid</span>
          <span>${Number(order.amountpaid || 0).toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span>Remaining</span>
          <span>${Number(order.remainingBalance || 0).toFixed(2)}</span>
        </div>

        <div className="border-t border-dashed border-black my-1" />

        <p className="text-center mt-2">Thank you for your business!</p>
      </div>
    </div>,
    document.body
  );
}
