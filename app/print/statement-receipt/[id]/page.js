"use client";

import { Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import ThermalPrintPage from "@/components/ThermalPrintPage";
import StatementThermalReceipt from "@/components/StatementThermalReceipt";
import { buildCustomerStatementReceipt } from "@/lib/statementReceiptData";
import { statementApiQuery, statementPeriodLabel, statementPrintQuery } from "@/lib/statementPeriod";

// Phone print page for the customer statement as an 80mm thermal receipt.
function Inner() {
  const { id } = useParams();
  const search = useSearchParams();
  const from = search.get("from") || "";
  const to = search.get("to") || "";
  const back = statementPrintQuery(from, to);
  return (
    <ThermalPrintPage
      queryKey={["print-statement-receipt", id, from, to]}
      fetchUrl={`/api/customers/${id}/statement${statementApiQuery(from, to)}`}
      backHref={`/dashboard/customers/${id}/statement${back}`}
    >
      {(statement) => <StatementThermalReceipt data={buildCustomerStatementReceipt(statement, statementPeriodLabel(from, to))} />}
    </ThermalPrintPage>
  );
}

export default function Page() {
  return (
    <Suspense>
      <Inner />
    </Suspense>
  );
}
