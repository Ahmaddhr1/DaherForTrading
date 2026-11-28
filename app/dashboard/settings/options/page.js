import { notFound } from "next/navigation";
import { enabledModules } from "@/modules/server";
import { listsFor } from "@/modules/registry";
import OptionsManager from "@/modules/ui/OptionsManager";

export default function ProductOptionsPage() {
  if (!listsFor(enabledModules()).length) notFound();
  return <OptionsManager />;
}
