"use client";
// Tells client components which edition/modules this deployment runs. The
// root layout reads the env vars on the server and passes the result in, so
// there's no extra request and no NEXT_PUBLIC_ build-time variable.
import { createContext, useContext, useMemo } from "react";
import { EDITIONS, fieldSections, listsFor, navFor } from "./registry";

const ModulesContext = createContext({ edition: "base", modules: ["expiry"] });

export function ModulesProvider({ edition = "base", modules = [], children }) {
  const value = useMemo(() => ({ edition, modules }), [edition, modules]);
  return <ModulesContext.Provider value={value}>{children}</ModulesContext.Provider>;
}

export function useModules() {
  const { edition, modules } = useContext(ModulesContext);
  return useMemo(
    () => ({
      edition,
      editionName: EDITIONS[edition]?.name || "Invento",
      modules,
      has: (id) => modules.includes(id),
      sections: fieldSections(modules),
      lists: listsFor(modules),
      nav: navFor(modules),
    }),
    [edition, modules]
  );
}

export function useModule(id) {
  return useContext(ModulesContext).modules.includes(id);
}
