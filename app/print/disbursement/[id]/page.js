"use client";

import { useParams } from "next/navigation";
import ThermalPrintPage from "@/components/ThermalPrintPage";
import DisbursementThermalReceipt from "@/app/dashboard/disbursements/[id]/DisbursementThermalReceipt";

export default function PrintDisbursementReceiptPage() {
  const { id } = useParams();
  return (
    <ThermalPrintPage queryKey={["print-disbursement", id]} fetchUrl={`/api/disbursements/${id}`} backHref={`/dashboard/disbursements/${id}`}>
      {(disbursement) => <DisbursementThermalReceipt disbursement={disbursement} />}
    </ThermalPrintPage>
  );
}
