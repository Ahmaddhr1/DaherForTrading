"use client";

import { Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import ThermalPrintPage from "@/components/ThermalPrintPage";
import CompanyStatementDoc from "@/components/statements/CompanyStatementDoc";
import { statementApiQuery, statementPeriodLabel, statementPrintQuery } from "@/lib/statementPeriod";

function Inner() {
  const { id } = useParams();
  const search = useSearchParams();
  const from = search.get("from") || "";
  const to = search.get("to") || "";
  const view = search.get("view") === "products" ? "products" : "orders";
  const back = statementPrintQuery(from, to);
  return (
    <ThermalPrintPage
      variant="document"
      queryKey={["print-company-statement", id, from, to, view]}
      fetchUrl={`/api/companies/${id}/statement${statementApiQuery(from, to)}`}
      backHref={`/dashboard/companies/${id}/statement${view === "products" ? `${back}${back ? "&" : "?"}view=products` : back}`}
    >
      {(statement) => <CompanyStatementDoc statement={statement} periodLabel={statementPeriodLabel(from, to)} view={view} />}
    </ThermalPrintPage>
  );
}

export default function PrintCompanyStatementPage() {
  return (
    <Suspense>
      <Inner />
    </Suspense>
  );
}
