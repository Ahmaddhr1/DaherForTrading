"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import {
  Box, Pencil, ScanBarcode, Printer, Tag, Ruler, AlertTriangle, CalendarClock, BellRing, Truck, Percent, DollarSign, TrendingUp, History, PackagePlus,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeaderSkeleton, FormSkeleton } from "@/components/ui/skeleton-patterns";
import { useT } from "@/core/shared/i18n/LangProvider";
import { format } from "@/core/shared/i18n/date";
import { useHasPermission } from "@/core/platform/useHasPermission";
import { useSettings } from "@/core/shared/currency";
import { PRICE_TIERS } from "@/core/products/priceTiers";
import ProductBatches from "@/components/ProductBatches";
import { useModules } from "@/modules/ModulesProvider";
import { ProductModuleDetails } from "@/modules/ui/ProductModuleDetails";
import { SerialsPanel } from "@/modules/serials/ui/SerialsPanel";
import StockAdjustments from "./StockAdjustments";
import ProductHistory from "./ProductHistory";

// Read-only product page. Editing lives at /dashboard/products/[id]/edit
// (needs canEditProducts - see middleware.js). Cost and profit are shown
// only to the owner / admins with canViewStats, like the other profit data.
export default function ProductViewPage() {
  const t = useT();
  const { id } = useParams();
  const { hasPermission: canEdit } = useHasPermission("canEditProducts");
  const { hasPermission: canSeeProfit } = useHasPermission("canViewStats");
  const { hasPermission: canRecordPurchases } = useHasPermission("canRecordPurchases");
  const { data: settings } = useSettings();
  const mods = useModules();

  const { data: product, isLoading, isError } = useQuery({
    queryKey: ["product", id],
    queryFn: async () => (await axios.get(`/api/products/${id}`)).data,
    enabled: !!id,
  });
  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => (await axios.get("/api/categories", { params: { all: true } })).data,
  });
  const { data: companies } = useQuery({
    queryKey: ["companies", "for-supplier-select"],
    queryFn: async () => (await axios.get("/api/companies", { params: { limit: 200 } })).data,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50/30 dark:bg-gray-900/30 py-8">
        <div className="container mx-auto px-4">
          <PageHeaderSkeleton />
          <Card><CardContent className="pt-6"><FormSkeleton fields={5} /></CardContent></Card>
        </div>
      </div>
    );
  }
  if (isError || !product) return <p className="p-10 text-center text-red-600">{t("Product not found")}</p>;

  const categoryList = Array.isArray(categories) ? categories : categories?.categories || [];
  const companyList = Array.isArray(companies) ? companies : companies?.companies || [];
  const categoryId = product.category?._id || product.category;
  const categoryName = product.category?.name || categoryList.find((c) => c._id === categoryId)?.name;
  const supplierId = product.defaultSupplier?._id || product.defaultSupplier;
  const supplierName = product.defaultSupplier?.name || companyList.find((c) => c._id === supplierId)?.name;
  const threshold = product.lowStockThreshold ?? 5;
  const lowStock = product.quantity <= threshold;
  const margin = product.price > 0 ? ((product.price - product.initialPrice) / product.price) * 100 : 0;
  const alertDays = product.expiryAlertDays || settings?.expiryAlertDays || 30;
  const money = (n) => `$${Number(n || 0).toFixed(2)}`;

  const Field = ({ icon: Icon, label, children }) => (
    <div className="flex items-start gap-3 py-3 border-b border-gray-100 dark:border-gray-800 last:border-0">
      <Icon className="h-4 w-4 mt-0.5 text-gray-400 shrink-0" />
      <div className="min-w-0">
        <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
        <div className="text-gray-900 dark:text-gray-100 break-words">{children}</div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50/30 dark:bg-gray-900/30 py-8">
      <div className="container mx-auto px-4">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {product.img?.[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={product.img[0]} alt="" className="h-12 w-12 rounded-lg object-cover shrink-0 border border-gray-200 dark:border-gray-800" />
            ) : (
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg shrink-0"><Box className="h-6 w-6 text-purple-600" /></div>
            )}
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 truncate">{product.name}</h1>
              <p className="text-gray-600 dark:text-gray-400 text-sm">{categoryName || t("Product details")}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {canRecordPurchases && supplierId && (
              <Link href={`/dashboard/companies/${supplierId}/addpurchase?productId=${id}`}>
                <Button variant="outline" className="flex items-center gap-2"><PackagePlus className="h-4 w-4" />{t("Reorder")}</Button>
              </Link>
            )}
            <Link href={`/dashboard/products/${id}/history`}>
              <Button variant="outline" className="flex items-center gap-2"><History className="h-4 w-4" />{t("Stock History")}</Button>
            </Link>
            {canEdit && (
              <Link href={`/dashboard/products/${id}/edit`}>
                <Button className="flex items-center gap-2"><Pencil className="h-4 w-4" />{t("Edit")}</Button>
              </Link>
            )}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card className="shadow-sm border-gray-200 dark:border-gray-800">
              <CardHeader className="pb-2"><CardTitle className="text-lg">{t("Product Information")}</CardTitle></CardHeader>
              <CardContent>
                <Field icon={ScanBarcode} label={t("Barcode")}>
                  {product.barcode ? (
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="font-mono ltr-text">{product.barcode}</span>
                      <Button size="sm" variant="outline" className="flex items-center gap-1.5" data-keep-label onClick={() => window.open(`/print/labels?ids=${id}`, "_blank")}>
                        <Printer className="h-3.5 w-3.5" />
                        {t("Print Label")}
                      </Button>
                    </div>
                  ) : (
                    <span className="text-gray-500">—</span>
                  )}
                </Field>
                <Field icon={Tag} label={t("Category")}>{categoryName || "—"}</Field>
                <Field icon={Ruler} label={t("Unit of Measure")}>{t(product.unit || "pcs")}</Field>
                <Field icon={Truck} label={t("Default Supplier")}>
                  {supplierName ? <Link href={`/dashboard/companies/${supplierId}`} className="text-blue-600 hover:underline">{supplierName}</Link> : "—"}
                </Field>
                <Field icon={Percent} label={t("Default Discount (%)")}>{Number(product.discount || 0)}%</Field>
                {mods.has("expiry") && (
                  <>
                    <Field icon={CalendarClock} label={t("Expiry Date")}>
                      {product.expiryDate ? format(new Date(product.expiryDate), "MMM d, yyyy") : "—"}
                    </Field>
                    <Field icon={BellRing} label={t("Alert days before expiry")}>
                      {alertDays} {product.expiryAlertDays ? "" : <span className="text-xs text-gray-500">({t("default")})</span>}
                    </Field>
                  </>
                )}
              </CardContent>
            </Card>

            <ProductModuleDetails product={product} />
            {mods.has("serials") && <SerialsPanel product={product} />}
            {mods.has("expiry") && <ProductBatches productId={id} />}
            <StockAdjustments productId={id} currentQuantity={product.quantity} unit={product.unit} />
            {canSeeProfit && <ProductHistory productId={id} />}
          </div>

          <div className="space-y-6">
            <Card className="shadow-sm border-gray-200 dark:border-gray-800">
              <CardHeader className="pb-2"><CardTitle className="text-lg">{t("Stock")}</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <p className={`text-3xl font-bold ${lowStock ? "text-amber-600" : "text-gray-900 dark:text-gray-100"}`}>
                  {product.quantity} <span className="text-base font-normal text-gray-500">{t(product.unit || "pcs")}</span>
                </p>
                {lowStock ? (
                  <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                    <AlertTriangle className="h-3 w-3 me-1" />
                    {product.quantity === 0 ? t("Out of stock") : t("Low stock")}
                  </Badge>
                ) : (
                  <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">{t("In stock")}</Badge>
                )}
                <p className="text-xs text-gray-500 dark:text-gray-400">{t("Low Stock Threshold")}: {threshold}</p>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-gray-200 dark:border-gray-800">
              <CardHeader className="pb-2"><CardTitle className="text-lg flex items-center gap-2"><DollarSign className="h-4 w-4" />{t("Prices")}</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                {PRICE_TIERS.map((tier) => {
                  const value = tier.value === 1 ? product.price : product[tier.field];
                  return (
                    <div key={tier.value} className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">{t(tier.label)}</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">{value != null && value !== "" ? money(value) : "—"}</span>
                    </div>
                  );
                })}
                {canSeeProfit && (
                  <div className="mt-2 border-t border-gray-100 dark:border-gray-800 pt-2 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">{t("Cost Price")}</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">{money(product.initialPrice)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="flex items-center gap-1 text-gray-600 dark:text-gray-400"><TrendingUp className="h-3.5 w-3.5" />{t("Profit per unit")}</span>
                      <span className={`font-medium ${product.price - product.initialPrice >= 0 ? "text-green-700 dark:text-green-400" : "text-red-600"}`}>
                        {money(product.price - product.initialPrice)} <span className="text-xs">({margin.toFixed(1)}%)</span>
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
