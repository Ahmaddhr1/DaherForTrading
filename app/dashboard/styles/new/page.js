import { notFound } from "next/navigation";
import { isEnabled } from "@/modules/server";
import StyleForm from "@/modules/variants/ui/StyleForm";

export default function NewStylePage() {
  if (!isEnabled("variants")) notFound();
  return <StyleForm />;
}
