"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import ThermalPrintPage from "@/components/ThermalPrintPage";
import ClosingDoc from "@/components/closing/ClosingDoc";
import { localDayStartISO, localDayEndISO, getTodayDateString } from "@/core/shared/dateUtils";

// Print page for the daily closing (A4, Back / Print, print dialog opens by
// itself - like the statements).
function Inner() {
  const search = useSearchParams();
  const day = search.get("date") || getTodayDateString();
  const opening = search.get("opening") || "0";
  const counted = search.get("counted");
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = "@page { size: A4 portrait; margin: 14mm; }";
    document.head.appendChild(style);
    return () => style.remove();
  }, []);
  return (
    <ThermalPrintPage
      variant="document"
      queryKey={["print-closing", day]}
      fetchUrl={`/api/reports/closing?start=${encodeURIComponent(localDayStartISO(day))}&end=${encodeURIComponent(localDayEndISO(day))}`}
      backHref={`/dashboard/reports/closing?date=${day}&opening=${opening}${counted !== null ? `&counted=${counted}` : ""}`}
    >
      {(data) => <ClosingDoc data={data} day={new Date(`${day}T00:00:00`)} opening={opening} counted={counted} printable />}
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
