"use client";

import { Languages } from "lucide-react";
import { useLang } from "@/core/shared/i18n/LangProvider";

// Switches the whole app between English and Arabic (RTL). Shows the OTHER
// language, written in its own script, so it's recognisable either way.
//   variant "sidebar" - full-width row like the sidebar's Logout button
//   variant "segmented" - English | العربية pill (Settings page)
//   variant "pill" - small floating button (login screen)
export function LanguageSwitch({ variant = "sidebar", collapsed = false, className = "" }) {
  const { lang, setLang } = useLang();
  const other = lang === "ar" ? "en" : "ar";
  const otherLabel = other === "ar" ? "العربية" : "English";

  if (variant === "segmented") {
    return (
      <div className={`inline-flex rounded-lg border border-gray-200 dark:border-gray-800 p-1 ${className}`}>
        {[
          { value: "en", label: "English" },
          { value: "ar", label: "العربية" },
        ].map((opt) => (
          <button
            key={opt.value}
            type="button"
            lang={opt.value}
            onClick={() => opt.value !== lang && setLang(opt.value)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              lang === opt.value
                ? "bg-primary text-primary-foreground"
                : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    );
  }

  if (variant === "pill") {
    return (
      <button
        type="button"
        lang={other}
        onClick={() => setLang(other)}
        className={`inline-flex items-center gap-1.5 rounded-full border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 ${className}`}
      >
        <Languages className="h-4 w-4" />
        {otherLabel}
      </button>
    );
  }

  return (
    <button
      type="button"
      lang={other}
      onClick={() => setLang(other)}
      title={collapsed ? otherLabel : undefined}
      className={`w-full p-4 flex items-center hover:bg-primary hover:text-white cursor-pointer duration-150 ${
        collapsed ? "justify-center" : ""
      } ${className}`}
    >
      <Languages />
      {!collapsed && <span className="ms-3">{otherLabel}</span>}
    </button>
  );
}
