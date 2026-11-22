"use client";
import { t } from "@/lib/i18n";
import { useT } from "@/lib/i18n/LangProvider";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { format } from "@/lib/i18n/date";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Combobox } from "@/components/ui/combobox";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { LineChart } from "@/components/ui/charts/line-chart";
import { AvailableChartColors } from "@/components/ui/charts/chart-utils";
import { TrendingUp, ArrowUp, ArrowDown, Minus, Package } from "lucide-react";

const currencyFormatter = (value) => `$${value.toFixed(2)}`;

export default function SupplierPriceTrendsPage() {
  const t = useT();
  const [productId, setProductId] = useState("");

  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ["products-all-for-trends"],
    queryFn: async () => (await axios.get("/api/products/all")).data,
  });
  const products = productsData?.products || [];

  const { data, isLoading: trendLoading } = useQuery({
    queryKey: ["supplier-price-trends", productId],
    queryFn: async () => (await axios.get("/api/reports/supplier-price-trends", { params: { productId } })).data,
    enabled: !!productId,
  });

  const companies = data?.companies || [];

  const chartData = useMemo(() => {
    if (companies.length === 0) return [];
    const rowsByDate = new Map();
    const topCompanies = companies.slice(0, AvailableChartColors.length);
    for (const company of topCompanies) {
      for (const point of company.points) {
        const label = format(new Date(point.date), "MMM d, yy");
        if (!rowsByDate.has(label)) rowsByDate.set(label, { label, _sort: new Date(point.date).getTime() });
        rowsByDate.get(label)[company.companyName] = point.unitPrice;
      }
    }
    return Array.from(rowsByDate.values()).sort((a, b) => a._sort - b._sort);
  }, [companies]);

  const chartCategories = companies.slice(0, AvailableChartColors.length).map((c) => c.companyName);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-6">
      <div className="container mx-auto px-4">
        <div className="mb-8 flex items-center gap-3">
          <div className="p-2 bg-violet-100 dark:bg-violet-900/30 rounded-lg">
            <TrendingUp className="h-6 w-6 text-violet-600" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
              {t("Supplier Price Trends")}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base">
              {t(
                "Compare how much each supplier charges you for the same product, over time"
              )}
            </p>
          </div>
        </div>

        <Card className="mb-6 shadow-sm border-gray-200 dark:border-gray-800">
          <CardContent className="p-4">
            <Combobox
              options={products}
              value={productId}
              onChange={setProductId}
              placeholder={t("Search for a product...")}
              disabled={productsLoading}
              renderOption={(product) => (
                <span className="flex items-center gap-2">
                  <Package className="h-3.5 w-3.5 text-gray-400" />
                  {product.name}
                  <span className="text-gray-400 dark:text-gray-500">
                    {product.category?.name ? `(${product.category.name})` : ""}
                  </span>
                </span>
              )}
            />
          </CardContent>
        </Card>

        {!productId ? (
          <div className="text-center py-16 text-gray-500 dark:text-gray-400">
            <Package className="h-12 w-12 mx-auto mb-3 text-gray-300 dark:text-gray-700" />
            <p className="text-lg">{t("Pick a product to compare supplier prices")}</p>
          </div>
        ) : trendLoading ? (
          <Skeleton className="h-72 rounded-lg" />
        ) : companies.length === 0 ? (
          <div className="text-center py-16 text-gray-500 dark:text-gray-400">
            <p className="text-lg">{t("No purchase history for this product yet")}</p>
          </div>
        ) : (
          <>
            <Card className="mb-6 shadow-sm border-gray-200 dark:border-gray-800">
              <CardHeader>
                <CardTitle className="text-lg font-medium">{t("Unit Price Over Time")}</CardTitle>
              </CardHeader>
              <CardContent>
                <LineChart
                  data={chartData}
                  index="label"
                  categories={chartCategories}
                  colors={AvailableChartColors.slice(0, chartCategories.length)}
                  valueFormatter={currencyFormatter}
                  connectNulls
                  className="h-72"
                />
              </CardContent>
            </Card>

            <Card className="shadow-sm border-gray-200 dark:border-gray-800 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("Supplier")}</TableHead>
                    <TableHead className="text-center">{t("Purchases")}</TableHead>
                    <TableHead className="text-end">{t("First Price")}</TableHead>
                    <TableHead className="text-end">{t("Latest Price")}</TableHead>
                    <TableHead className="text-end">{t("Avg Price")}</TableHead>
                    <TableHead className="text-end">{t("Change")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {companies.map((c) => (
                    <TableRow key={c.companyId}>
                      <TableCell className="font-medium text-gray-900 dark:text-gray-100">
                        {c.companyName}
                      </TableCell>
                      <TableCell className="text-center">{c.purchaseCount}</TableCell>
                      <TableCell className="text-end">{currencyFormatter(c.firstPrice)}</TableCell>
                      <TableCell className="text-end">{currencyFormatter(c.latestPrice)}</TableCell>
                      <TableCell className="text-end text-gray-600 dark:text-gray-400">
                        {currencyFormatter(c.avgPrice)}
                      </TableCell>
                      <TableCell className="text-end">
                        <Badge
                          variant="outline"
                          className={
                            c.changePercent > 0.5
                              ? "text-red-600 border-red-200 dark:border-red-900/50"
                              : c.changePercent < -0.5
                                ? "text-green-600 border-green-200 dark:border-green-900/50"
                                : "text-gray-500"
                          }
                        >
                          {c.changePercent > 0.5 ? (
                            <ArrowUp className="h-3 w-3" />
                          ) : c.changePercent < -0.5 ? (
                            <ArrowDown className="h-3 w-3" />
                          ) : (
                            <Minus className="h-3 w-3" />
                          )}
                          {Math.abs(c.changePercent).toFixed(1)}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
