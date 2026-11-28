"use client";
// Adds the enabled modules' pages (Styles, Serials & Warranty...) to the
// core navigation tabs, as children of their parent tab (e.g. Products).
import { useMemo } from "react";
import { Shirt, ScanLine, Puzzle } from "lucide-react";
import { useModules } from "../ModulesProvider";

const ICONS = { Shirt, ScanLine };

export function useModuleTabs(tabs) {
  const { nav } = useModules();
  return useMemo(() => {
    if (!nav.length) return tabs;
    return tabs.map((tab) => {
      const extra = nav.filter((n) => n.parent === tab.label);
      if (!extra.length) return tab;
      const Icon = (n) => ICONS[n.icon] || Puzzle;
      const children = extra.map((n) => {
        const I = Icon(n);
        return { label: n.label, path: n.path, icon: <I />, permission: n.permission };
      });
      return { ...tab, children: [...(tab.children || []), ...children] };
    });
  }, [tabs, nav]);
}

// Labels of module pages that belong to a mobile bottom-bar section.
export function useModuleNavLabels(parent) {
  const { nav } = useModules();
  return nav.filter((n) => n.parent === parent).map((n) => n.label);
}
