"use client";

import { Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import ThermalPrintPage from "@/components/ThermalPrintPage";
import CustomerStatementDoc from "@/components/statements/CustomerStatementDoc";
import { statementApiQuery, statementPeriodLabel, statementPrintQuery } from "@/lib/statementPeriod";

function Inner() {
  const { id } = useParams();
  const search = useSearchParams();
  const from = search.get("from") || "";
  const to = search.get("to") || "";
  return (
    <ThermalPrintPage
      variant="document"
      embed={search.get("embed") === "1"}
      queryKey={["print-customer-statement", id, from, to]}
      fetchUrl={`/api/customers/${id}/statement${statementApiQuery(from, to)}`}
      backHref={`/dashboard/customers/${id}/statement${statementPrintQuery(from, to)}`}
    >
      {(statement) => <CustomerStatementDoc statement={statement} periodLabel={statementPeriodLabel(from, to)} />}
    </ThermalPrintPage>
  );
}

export default function PrintCustomerStatementPage() {
  return (
    <Suspense>
      <Inner />
    </Suspense>
  );
}
