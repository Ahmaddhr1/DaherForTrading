"use client";
import { t } from "@/lib/i18n";
import { useT } from "@/lib/i18n/LangProvider";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";

// Cycles light -> dark -> light. Deliberately skips "system" as a toggle
// state (system is still the default on first load, set in lib/providers.jsx)
// to keep this a simple two-state switch rather than a 3-way cycle.
export function ThemeToggle({ className = "", collapsed = false }) {
  const t = useT();
  const { resolvedTheme, setTheme } = useTheme();
  // Avoids a hydration mismatch: the real theme isn't known until after
  // mount (next-themes reads localStorage/system preference client-side).
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={`icon-only-mobile flex items-center gap-2 rounded-lg p-2 hover:bg-primary hover:text-white transition-colors duration-150 ${className}`}
      aria-label={isDark ? t("Switch to light mode") : t("Switch to dark mode")}
    >
      {mounted && isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
      {!collapsed && <span>{mounted && isDark ? t("Light Mode") : t("Dark Mode")}</span>}
    </button>
  );
}
