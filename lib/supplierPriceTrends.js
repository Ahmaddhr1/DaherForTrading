import Purchase from "@/models/Purchase";

// Per-supplier unit-price history for one product, so you can see whether
// Company A is getting more expensive relative to Company B for the exact
// same item. Each purchase is a data point (not bucketed by month) since
// purchases for any one product/company pair are usually infrequent enough
// that every data point is worth showing on the chart.
export async function getSupplierPriceTrend(productId) {
  const purchases = await Purchase.find({ product: productId })
    .select("company unitPrice createdAt")
    .populate({ path: "company", select: "name" })
    .sort({ createdAt: 1 })
    .lean();

  const byCompany = new Map();
  for (const purchase of purchases) {
    if (!purchase.company) continue; // company was deleted since
    const key = String(purchase.company._id);
    if (!byCompany.has(key)) {
      byCompany.set(key, { companyId: key, companyName: purchase.company.name, points: [] });
    }
    byCompany.get(key).points.push({ date: purchase.createdAt, unitPrice: purchase.unitPrice });
  }

  const companies = Array.from(byCompany.values()).map((c) => {
    const prices = c.points.map((p) => p.unitPrice);
    const firstPrice = prices[0];
    const latestPrice = prices[prices.length - 1];
    const avgPrice = prices.reduce((sum, p) => sum + p, 0) / prices.length;
    const changePercent = firstPrice > 0 ? ((latestPrice - firstPrice) / firstPrice) * 100 : 0;
    return {
      ...c,
      purchaseCount: c.points.length,
      firstPrice,
      latestPrice,
      avgPrice,
      changePercent,
    };
  });

  // Most purchased-from first, so the comparison leads with whoever you
  // actually buy this product from most often.
  companies.sort((a, b) => b.purchaseCount - a.purchaseCount);

  return { companies };
}
