"use client";

import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { Layers3 } from "lucide-react";
import { useT } from "@/core/shared/i18n/LangProvider";
import { format } from "@/core/shared/i18n/date";

// Dated batches of this product still in stock (from purchases with an
// expiry date), earliest expiry first.
export default function ProductBatches({ productId }) {
  const t = useT();
  const { data } = useQuery({
    queryKey: ["product-batches", productId],
    queryFn: async () => (await axios.get(`/api/products/${productId}/batches`)).data,
    enabled: !!productId,
  });
  const batches = data?.batches || [];
  if (!batches.length) return null;

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-800 p-3">
      <p className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-gray-100">
        <Layers3 className="h-4 w-4" />
        {t("Batches in stock")}
      </p>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-gray-500 dark:text-gray-400">
            <th className="text-start font-medium pb-1">{t("Expiry Date")}</th>
            <th className="text-start font-medium pb-1">{t("Received")}</th>
            <th className="text-end font-medium pb-1">{t("Left")}</th>
          </tr>
        </thead>
        <tbody>
          {batches.map((b) => (
            <tr key={b._id} className="border-t border-gray-100 dark:border-gray-800">
              <td className="py-1 font-medium text-gray-900 dark:text-gray-100">{format(new Date(b.expiryDate), "MMM d, yyyy")}</td>
              <td className="py-1 text-gray-600 dark:text-gray-400">
                {format(new Date(b.purchasedAt), "MMM d")}
                {b.supplier ? ` · ${b.supplier}` : ""}
              </td>
              <td className="py-1 text-end text-gray-900 dark:text-gray-100">
                {b.remaining}
                <span className="text-xs text-gray-500 dark:text-gray-400"> / {b.quantity}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{t("Assumes the earliest expiry is sold first.")}</p>
    </div>
  );
}
