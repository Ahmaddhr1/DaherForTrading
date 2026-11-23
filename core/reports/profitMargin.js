import Order from "@/core/orders/models/Orders";
import Product from "@/core/products/models/Products";

const CUSTOM_CATEGORY = "Custom Items";
const DELETED_CATEGORY = "Deleted Product";
const NO_CATEGORY = "No Category";

function monthKey(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function emptyTotals() {
  return { revenue: 0, cost: 0, profit: 0 };
}

function addTotals(target, revenue, cost) {
  target.revenue += revenue;
  target.cost += cost;
  target.profit += revenue - cost;
}

function withMargin(entry) {
  return {
    ...entry,
    marginPercent: entry.revenue > 0 ? (entry.profit / entry.revenue) * 100 : 0,
  };
}

// Per-category and per-product profit margin, including a month-by-month
// breakdown per category, for every real (non-draft) order in the last N
// months. Line-item cost comes from the order's own costAtSale snapshot
// (set at the time the order was placed - see core/orders/orderPricing.js) so a
// later change to a product's cost doesn't rewrite historical margins;
// orders placed before that field existed fall back to the product's
// current cost as the closest available estimate.
export async function getProfitMarginReport({ months = 6 } = {}) {
  const start = new Date();
  start.setMonth(start.getMonth() - (months - 1));
  start.setDate(1);
  start.setHours(0, 0, 0, 0);

  const orders = await Order.find({ status: { $ne: "draft" }, createdAt: { $gte: start } })
    .select("products createdAt")
    .lean();

  const productIds = [
    ...new Set(
      orders.flatMap((o) => o.products.filter((p) => !p.isCustom && p.productId).map((p) => String(p.productId)))
    ),
  ];

  const products = await Product.find({ _id: { $in: productIds } })
    .select("name category initialPrice")
    .populate({ path: "category", select: "name" })
    .lean();
  const productById = new Map(products.map((p) => [String(p._id), p]));

  const byCategoryOverTime = new Map(); // `${month}|${categoryKey}` -> totals + label
  const byCategory = new Map(); // categoryKey -> totals + label
  const byProduct = new Map(); // productKey -> totals + label + categoryName

  for (const order of orders) {
    const month = monthKey(order.createdAt);

    for (const line of order.products) {
      const quantity = line.quantity || 0;
      const revenue = (line.price || 0) * quantity - (line.discount || 0);

      let categoryKey, categoryName, cost, productKey, productName;

      if (line.isCustom) {
        categoryKey = "custom";
        categoryName = CUSTOM_CATEGORY;
        cost = 0;
        productKey = `custom:${line.name}`;
        productName = line.name;
      } else {
        const product = productById.get(String(line.productId));
        const unitCost = line.costAtSale ?? product?.initialPrice ?? line.price ?? 0;
        cost = unitCost * quantity;
        productKey = String(line.productId);
        productName = product?.name || line.name;
        if (product?.category) {
          categoryKey = String(product.category._id);
          categoryName = product.category.name;
        } else if (!product) {
          categoryKey = "deleted";
          categoryName = DELETED_CATEGORY;
        } else {
          categoryKey = "none";
          categoryName = NO_CATEGORY;
        }
      }

      const catTimeKey = `${month}|${categoryKey}`;
      if (!byCategoryOverTime.has(catTimeKey)) {
        byCategoryOverTime.set(catTimeKey, { month, categoryKey, categoryName, ...emptyTotals() });
      }
      addTotals(byCategoryOverTime.get(catTimeKey), revenue, cost);

      if (!byCategory.has(categoryKey)) {
        byCategory.set(categoryKey, { categoryKey, categoryName, ...emptyTotals() });
      }
      addTotals(byCategory.get(categoryKey), revenue, cost);

      if (!byProduct.has(productKey)) {
        byProduct.set(productKey, { productKey, productName, categoryName, ...emptyTotals() });
      }
      addTotals(byProduct.get(productKey), revenue, cost);
    }
  }

  return {
    months,
    byCategoryOverTime: Array.from(byCategoryOverTime.values()).map(withMargin).sort((a, b) => a.month.localeCompare(b.month)),
    byCategory: Array.from(byCategory.values()).map(withMargin).sort((a, b) => b.profit - a.profit),
    byProduct: Array.from(byProduct.values()).map(withMargin).sort((a, b) => b.profit - a.profit),
  };
}
