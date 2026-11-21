"use client";
import { t } from "@/lib/i18n";
import { useT } from "@/lib/i18n/LangProvider";

import { useMemo, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Search, Check } from "lucide-react";

// Mobile-only category picker for the Products page - a searchable list
// inside a modal, opened from a button, instead of the inline Combobox
// used on desktop (see app/dashboard/products/page.js).
export default function CategoryFilterModal({ open, onClose, categories, value, onChange }) {
  const t = useT();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter((cat) => cat.name.toLowerCase().includes(q));
  }, [categories, query]);

  const handleClose = () => {
    setQuery("");
    onClose();
  };

  const handleSelect = (id) => {
    onChange(id);
    handleClose();
  };

  return (
    <Modal open={open} onClose={handleClose} title={t("Filter by Category")}>
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 h-4 w-4" />
          <Input
            placeholder={t("Search categories...")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="ps-10"
            autoFocus
          />
        </div>
        <div className="max-h-80 overflow-y-auto divide-y rounded-md border">
          <button
            type="button"
            onClick={() => handleSelect("")}
            className={`w-full flex items-center justify-between px-3 py-2 text-start hover:bg-gray-50 dark:hover:bg-gray-800/60 ${
              !value ? "font-medium text-blue-700" : "text-gray-900 dark:text-gray-100"
            }`}
          >
            {t("All Categories")}
            {!value && <Check className="h-4 w-4" />}
          </button>
          {filtered.length === 0 ? (
            <div className="px-3 py-4 text-center text-sm text-gray-500 dark:text-gray-400">{t("No matching categories")}</div>
          ) : (
            filtered.map((cat) => (
              <button
                key={cat._id}
                type="button"
                onClick={() => handleSelect(cat._id)}
                className={`w-full flex items-center justify-between px-3 py-2 text-start hover:bg-gray-50 dark:hover:bg-gray-800/60 ${
                  value === cat._id ? "font-medium text-blue-700" : "text-gray-900 dark:text-gray-100"
                }`}
              >
                {cat.name}
                {value === cat._id && <Check className="h-4 w-4" />}
              </button>
            ))
          )}
        </div>
      </div>
    </Modal>
  );
}
