"use client";
import { t } from "@/core/shared/i18n";
import { useT } from "@/core/shared/i18n/LangProvider";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Package, ShoppingCart } from "lucide-react";

export default function ProductGridView({ products, onAddToCart }) {
  const t = useT();
  if (products.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
        <Package className="h-12 w-12 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
        <p>{t("No products found")}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {products.map((product) => {
        const outOfStock = !product.quantity || product.quantity <= 0;
        return (
          <Card key={product._id} className="shadow-sm border-gray-200 dark:border-gray-800 overflow-hidden py-0 gap-0">
            <div className="aspect-square bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              {product.img?.[0] ? (
                <img
                  src={product.img[0]}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Package className="h-10 w-10 text-gray-400 dark:text-gray-500" />
              )}
            </div>
            <CardContent className="p-3 space-y-2">
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{product.name}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {outOfStock ? (
                    <span className="text-red-600">{t("Out of stock")}</span>
                  ) : (
                    t("{0} {1} in stock", {
                      0: product.quantity,
                      1: t(product.unit || "pcs")
                    })
                  )}
                </p>
              </div>
              <span className="block font-semibold text-green-600 text-lg">
                ${Number(product.price).toFixed(2)}
              </span>
              <Button
                disabled={outOfStock}
                onClick={() => onAddToCart(product)}
                className="w-full flex items-center justify-center gap-1.5"
              >
                <ShoppingCart className="h-4 w-4" />
                {t("Add to Cart")}
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
