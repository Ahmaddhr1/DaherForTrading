import { notFound } from "next/navigation";
import { isEnabled } from "@/modules/server";
import StylesList from "@/modules/variants/ui/StylesList";

export default function StylesPage() {
  if (!isEnabled("variants")) notFound();
  return <StylesList />;
}
