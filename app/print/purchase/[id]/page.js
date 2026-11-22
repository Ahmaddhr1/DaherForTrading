"use client";

import { useParams, useSearchParams } from "next/navigation";
import ThermalPrintPage from "@/components/ThermalPrintPage";
import PurchaseThermalReceipt from "@/app/dashboard/companies/[id]/purchases/[purchaseId]/PurchaseThermalReceipt";

export default function PrintPurchaseReceiptPage() {
  const { id } = useParams();
  const companyId = useSearchParams().get("company");
  const backHref = companyId ? `/dashboard/companies/${companyId}/purchases/${id}` : "/dashboard/companies";
  return (
    <ThermalPrintPage queryKey={["print-purchase", id]} fetchUrl={`/api/purchases/${id}`} backHref={backHref}>
      {(purchase) => <PurchaseThermalReceipt purchase={purchase} />}
    </ThermalPrintPage>
  );
}
