"use client";
import { t } from "@/lib/i18n";
import { useT } from "@/lib/i18n/LangProvider";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Search, User, Package, Building2, ShoppingCart, Loader2 } from "lucide-react";

export function GlobalSearchModal({ open, onClose }) {
  const t = useT();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setDebouncedQuery("");
    }
  }, [open]);

  const { data, isFetching } = useQuery({
    queryKey: ["global-search", debouncedQuery],
    queryFn: async () => (await axios.get("/api/search", { params: { q: debouncedQuery } })).data,
    enabled: open && debouncedQuery.length >= 2,
  });

  const goTo = (path) => {
    router.push(path);
    onClose();
  };

  const customers = data?.customers || [];
  const products = data?.products || [];
  const companies = data?.companies || [];
  const orders = data?.orders || [];
  const hasAnyResults = customers.length || products.length || companies.length || orders.length;
  const hasSearched = debouncedQuery.length >= 2;

  return (
    <Modal open={open} onClose={onClose} title={t("Search")} maxWidth="max-w-xl">
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            type="text"
            placeholder={t("Search customers, products, companies, orders...")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="ps-10"
            autoFocus
          />
          {isFetching && (
            <Loader2 className="absolute end-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4 animate-spin" />
          )}
        </div>

        {!hasSearched ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-6">
            {t("Type at least 2 characters to search")}
          </p>
        ) : !isFetching && !hasAnyResults ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-6">
            {t("No results for \"")}{debouncedQuery}"
          </p>
        ) : (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            {customers.length > 0 && (
              <ResultSection title={t("Customers")} icon={<User className="h-3.5 w-3.5" />}>
                {customers.map((c) => (
                  <ResultRow
                    key={c._id}
                    onClick={() => goTo(`/dashboard/customers/${c._id}`)}
                    primary={c.fullName}
                    secondary={c.phoneNumber}
                    trailing={c.debt > 0 ? `Debt: $${c.debt}` : null}
                    trailingClassName="text-red-600"
                  />
                ))}
              </ResultSection>
            )}

            {products.length > 0 && (
              <ResultSection title={t("Products")} icon={<Package className="h-3.5 w-3.5" />}>
                {products.map((p) => (
                  <ResultRow
                    key={p._id}
                    onClick={() => goTo(`/dashboard/products/${p._id}`)}
                    primary={p.name}
                    secondary={`${p.quantity} in stock`}
                    trailing={`$${p.price?.toFixed(2)}`}
                  />
                ))}
              </ResultSection>
            )}

            {companies.length > 0 && (
              <ResultSection title={t("Companies")} icon={<Building2 className="h-3.5 w-3.5" />}>
                {companies.map((co) => (
                  <ResultRow
                    key={co._id}
                    onClick={() => goTo(`/dashboard/companies/${co._id}`)}
                    primary={co.name}
                    trailing={co.debt > 0 ? `Owed: $${co.debt}` : null}
                    trailingClassName="text-red-600"
                  />
                ))}
              </ResultSection>
            )}

            {orders.length > 0 && (
              <ResultSection title={t("Orders")} icon={<ShoppingCart className="h-3.5 w-3.5" />}>
                {orders.map((o) => (
                  <ResultRow
                    key={o._id}
                    onClick={() => goTo(`/dashboard/orders/${o._id}`)}
                    primary={o.customer?.fullName || o.customerNameText || "Unknown customer"}
                    secondary={o.status}
                    trailing={`$${o.total?.toFixed(2)}`}
                  />
                ))}
              </ResultSection>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}

function ResultSection({ title, icon, children }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1 px-1">
        {icon}
        {title}
      </div>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function ResultRow({ onClick, primary, secondary, trailing, trailingClassName = "text-gray-500 dark:text-gray-400" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center justify-between gap-3 px-2 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-start"
    >
      <div className="min-w-0">
        <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{primary}</div>
        {secondary && <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{secondary}</div>}
      </div>
      {trailing && (
        <div className={`text-xs font-medium whitespace-nowrap ${trailingClassName}`}>{trailing}</div>
      )}
    </button>
  );
}
