"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { format } from "date-fns";
import { useSettings, formatLL } from "@/lib/currency";

// Same narrow 80mm thermal-receipt look as the order/purchase receipts,
// simplified for a disbursement: it's a single internal expense, not a
// sale or a restock, so there's no discount, no tax, and no customer/
// company debt to show - it's always "Paid" since the money has already
// gone out by the time the record exists.
export default function DisbursementThermalReceipt({ disbursement }) {
  const [mounted, setMounted] = useState(false);
  const { data: settings } = useSettings();

  useEffect(() => setMounted(true), []);

  if (!mounted || !disbursement) return null;

  const dollarRate = settings?.dollarRate;

  return createPortal(
    <div id="thermal-receipt-root">
      <div className="mx-auto w-[80mm] p-2 font-mono text-[11px] leading-tight text-black bg-white">
        <div className="text-center mb-2">
          <p className="text-sm font-bold">M.D.T</p>
          <p>Daher For Trading</p>
          <p>Disbursement Receipt</p>
        </div>

        <div className="border-t border-dashed border-black my-1" />

        <p>Disbursement #{disbursement._id?.slice(-6).toUpperCase()}</p>
        <p>{format(new Date(disbursement.createdAt), "MMM d, yyyy h:mm a")}</p>
        <p>Category: {disbursement.category}</p>

        <div className="border-t border-dashed border-black my-1" />

        <div className="flex justify-between">
          <span>{disbursement.description}</span>
        </div>
        <div className="flex justify-between">
          <span>1 x ${Number(disbursement.amount).toFixed(2)}</span>
          <span>${Number(disbursement.amount).toFixed(2)}</span>
        </div>

        <div className="border-t border-dashed border-black my-1" />

        <div className="flex justify-between font-bold">
          <span>TOTAL</span>
          <span>${Number(disbursement.amount).toFixed(2)}</span>
        </div>
        {dollarRate > 0 && (
          <div className="flex justify-between">
            <span>≈</span>
            <span>{formatLL(disbursement.amount, dollarRate)}</span>
          </div>
        )}
        <div className="flex justify-between font-bold">
          <span>Status</span>
          <span>PAID</span>
        </div>

        <div className="border-t border-dashed border-black my-1" />

        <p className="text-center mt-2">Daher For Trading</p>
      </div>
    </div>,
    document.body
  );
}
