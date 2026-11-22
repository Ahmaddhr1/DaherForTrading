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
  return (
    <ThermalPrintPage
      variant="document"
      queryKey={["print-company-statement", id, from, to]}
      fetchUrl={`/api/companies/${id}/statement${statementApiQuery(from, to)}`}
      backHref={`/dashboard/companies/${id}/statement${statementPrintQuery(from, to)}`}
    >
      {(statement) => <CompanyStatementDoc statement={statement} periodLabel={statementPeriodLabel(from, to)} />}
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
