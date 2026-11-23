"use client";
import { t } from "@/core/shared/i18n";
import { useT } from "@/core/shared/i18n/LangProvider";

import { useEffect } from "react";
import { X } from "lucide-react";

export function Modal({ open, onClose, title, description, children, maxWidth = "max-w-lg" }) {
  const t = useT();
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div
        className={`relative bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full ${maxWidth} max-h-[90vh] overflow-y-auto`}
      >
        <div className="flex items-start justify-between p-4 border-b">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
            {description && <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 rounded-md p-1"
            aria-label={t("Close")}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}
