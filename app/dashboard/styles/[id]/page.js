import { notFound } from "next/navigation";
import { isEnabled } from "@/modules/server";
import StyleDetail from "@/modules/variants/ui/StyleDetail";

export default async function StylePage({ params }) {
  if (!isEnabled("variants")) notFound();
  const { id } = await params;
  return <StyleDetail id={id} />;
}
