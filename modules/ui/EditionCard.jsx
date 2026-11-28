"use client";
// Settings: which edition this deployment runs, its add-ons, and the way to
// the option lists (sizes, colors, brands...). The edition itself is chosen in
// Vercel (INVENTO_EDITION / INVENTO_MODULES), not here.
import Link from "next/link";
import { Puzzle, ListChecks, ChevronRight, Check } from "lucide-react";
import { useT } from "@/core/shared/i18n/LangProvider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useModules } from "../ModulesProvider";
import { MODULES } from "../registry";

export function EditionCard() {
  const t = useT();
  const { editionName, modules, lists } = useModules();
  return (
    <Card className="shadow-sm border-gray-200 dark:border-gray-800 mb-6">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Puzzle className="h-5 w-5 text-teal-600" />
          {t("Edition & add-ons")}
        </CardTitle>
        <CardDescription>{t("This system runs {0}.", { 0: editionName })}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {modules.length ? (
          <ul className="grid gap-2 sm:grid-cols-2">
            {modules.map((id) => (
              <li key={id} className="flex items-start gap-2 rounded-lg border border-gray-200 dark:border-gray-800 p-3 text-sm">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                <span>
                  <span className="font-medium">{t(MODULES[id].name)}</span>
                  <span className="block text-xs text-gray-500">{t(MODULES[id].description)}</span>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-500">{t("No add-ons are switched on.")}</p>
        )}
        {lists.length > 0 && (
          <Link href="/dashboard/settings/options" className="flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-900 hover:bg-blue-100 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200">
            <span className="flex items-center gap-2">
              <ListChecks className="h-4 w-4" />
              {t("Product options: sizes, colors, brands and more")}
            </span>
            <ChevronRight className="rtl-flip h-4 w-4" />
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
