// Shared 1-4 price tier mapping, used on both the client (product/customer
// forms, order/purchase creation) and could be reused server-side. Kept as a
// plain, dependency-free module so it's safe to import from client
// components. Tier 1 (Retail) always reads Product.price - the other three
// are separate fields on Product that fall back to Product.price when unset
// (e.g. a product created before this feature existed, or where the owner
// hasn't bothered setting a different price for that tier).

export const PRICE_TIERS = [
  { value: 1, label: "Retail", field: "price" },
  { value: 2, label: "Wholesale", field: "priceWholesale" },
  { value: 3, label: "Distributor", field: "priceDistributor" },
  { value: 4, label: "VIP", field: "priceVip" },
];

export function getTierInfo(tierValue) {
  return PRICE_TIERS.find((t) => t.value === Number(tierValue)) || PRICE_TIERS[0];
}

export function getTierLabel(tierValue) {
  return getTierInfo(tierValue).label;
}

// Resolve the price a given product should sell for at a given customer's
// price tier, falling back to the Retail price when that tier isn't set on
// the product.
export function getTierPrice(product, tierValue) {
  if (!product) return 0;
  const { field } = getTierInfo(tierValue);
  const tierPrice = product[field];
  if (tierPrice === null || tierPrice === undefined || tierPrice === "") {
    return product.price ?? 0;
  }
  return tierPrice;
}
