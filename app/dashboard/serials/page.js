import { Suspense } from "react";
import { notFound } from "next/navigation";
import { isEnabled } from "@/modules/server";
import SerialsPage from "@/modules/serials/ui/SerialsPage";

export default function Page() {
  if (!isEnabled("serials")) notFound();
  return (
    <Suspense>
      <SerialsPage />
    </Suspense>
  );
}
