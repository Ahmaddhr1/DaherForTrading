"use client";
import { t } from "@/lib/i18n";
import { useT } from "@/lib/i18n/LangProvider";
import { useBusiness } from "@/lib/business";

import { useState } from "react";
import axios from "axios";
import { toast } from "@/lib/i18n/toast";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Loader2, FileDown } from "lucide-react";
import { CATALOG_FIELDS, generateProductsCatalogPdf } from "@/lib/productsCatalogPdf";
import { sharePdfOrDownload } from "@/lib/thermalPdf";

const DEFAULT_SELECTION = Object.fromEntries(CATALOG_FIELDS.map((f) => [f.key, true]));

export default function GeneratePdfModal({ open, onClose }) {
  const t = useT();
  const business = useBusiness();
  const [selectedFields, setSelectedFields] = useState(DEFAULT_SELECTION);
  const [generating, setGenerating] = useState(false);

  const toggleField = (key) => {
    setSelectedFields((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const anySelected = Object.values(selectedFields).some(Boolean);

  const handleGenerate = async () => {
    if (!anySelected) {
      toast.error("Pick at least one field to include");
      return;
    }
    try {
      setGenerating(true);
      const { data } = await axios.get("/api/products/all");
      const products = data.products || [];
      if (products.length === 0) {
        toast.error("No products to include in the catalog");
        return;
      }
      const blob = generateProductsCatalogPdf({ products, selectedFields, businessName: business.name });
      await sharePdfOrDownload(blob, `product-catalog-${new Date().toISOString().slice(0, 10)}.pdf`);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to generate PDF");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("Generate Product Catalog PDF")}
      description={t("Choose which fields to include - products are grouped by category")}
    >
      <div className="space-y-3">
        {CATALOG_FIELDS.map((field) => (
          <label
            key={field.key}
            className="flex items-center gap-3 p-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800/60 cursor-pointer"
          >
            <input
              type="checkbox"
              checked={!!selectedFields[field.key]}
              onChange={() => toggleField(field.key)}
              className="h-4 w-4 rounded border-gray-300 dark:border-gray-700"
            />
            <span className="text-sm text-gray-900 dark:text-gray-100">{t(field.label)}</span>
          </label>
        ))}

        <Button className="w-full flex items-center gap-2 mt-2" onClick={handleGenerate} disabled={generating}>
          {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
          {t("Generate PDF")}
        </Button>
      </div>
    </Modal>
  );
}
