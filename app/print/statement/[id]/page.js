"use client";

import { Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import ThermalPrintPage from "@/components/ThermalPrintPage";
import StatementPrintDoc from "@/components/statements/StatementPrintDoc";
import { buildCustomerStatementReceipt } from "@/lib/statementReceiptData";
import { statementApiQuery, statementPeriodLabel, statementPrintQuery } from "@/lib/statementPeriod";

// Print page for the customer statement (black-and-white), like the order
// receipt page: shows the statement with Back / Print, and opens the print
// dialog (choose a printer) by itself.
function Inner() {
  const { id } = useParams();
  const search = useSearchParams();
  const from = search.get("from") || "";
  const to = search.get("to") || "";
  const back = statementPrintQuery(from, to);
  return (
    <ThermalPrintPage
      variant="document"
      queryKey={["print-statement", id, from, to]}
      fetchUrl={`/api/customers/${id}/statement${statementApiQuery(from, to)}`}
      backHref={`/dashboard/customers/${id}/statement${back}`}
    >
      {(statement) => <StatementPrintDoc data={buildCustomerStatementReceipt(statement, statementPeriodLabel(from, to))} />}
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
