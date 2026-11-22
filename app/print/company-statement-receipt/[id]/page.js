"use client";

import { Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import ThermalPrintPage from "@/components/ThermalPrintPage";
import StatementThermalReceipt from "@/components/StatementThermalReceipt";
import { buildCompanyStatementReceipt } from "@/lib/statementReceiptData";
import { statementApiQuery, statementPeriodLabel, statementPrintQuery } from "@/lib/statementPeriod";

// Phone print page for the company statement as an 80mm thermal receipt.
function Inner() {
  const { id } = useParams();
  const search = useSearchParams();
  const from = search.get("from") || "";
  const to = search.get("to") || "";
  const view = search.get("view") === "products" ? "products" : "orders";
  const back = statementPrintQuery(from, to);
  return (
    <ThermalPrintPage
      queryKey={["print-company-statement-receipt", id, from, to, view]}
      fetchUrl={`/api/companies/${id}/statement${statementApiQuery(from, to)}`}
      backHref={`/dashboard/companies/${id}/statement${view === "products" ? `${back}${back ? "&" : "?"}view=products` : back}`}
    >
      {(statement) => <StatementThermalReceipt data={buildCompanyStatementReceipt(statement, statementPeriodLabel(from, to), view)} />}
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
