"use client";

import { useParams } from "next/navigation";
import ThermalPrintPage from "@/components/ThermalPrintPage";
import ThermalReceipt from "@/app/dashboard/invoices/[id]/ThermalReceipt";

export default function PrintOrderReceiptPage() {
  const { id } = useParams();
  return (
    <ThermalPrintPage queryKey={["print-order", id]} fetchUrl={`/api/orders/${id}`} backHref={`/dashboard/invoices/${id}`}>
      {(order) => <ThermalReceipt order={order} />}
    </ThermalPrintPage>
  );
}
