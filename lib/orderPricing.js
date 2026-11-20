import Product from "@/models/Products";
import { getTierPrice } from "@/lib/priceTiers";

export class PricingError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

// Builds the enriched line items plus subtotal/discount/tax/total/profit for
// a set of { productId, price, quantity, discount?, isCustom?, free? }
// inputs. Shared by every order-creation/edit path (customer orders, cart
// drafts with no customer yet) so the money math (discount reduces both the
// customer's charge and the recorded profit; tax is added on top of the
// discounted subtotal and never counted as profit) stays in exactly one
// place.
//
// `role`/`priceTier` are also enforced here, not just hidden in the UI - an
// employee's submitted price is only ever trusted for a "Free" line; every
// other line is repriced server-side from the product's own tier price (or,
// for a custom item, rejected outright - only an owner can price something
// outside the catalog).
export async function priceOrderItems(products, taxRate, { role, priceTier } = {}) {
  const enrichedProducts = [];
  const productLookups = [];
  let subtotal = 0;
  let discountTotal = 0;
  let totalProfit = 0;

  for (const item of products) {
    const isCustom = !!item.isCustom;
    const isFree = !!item.free;
    const isOwner = role === "owner";

    let product = null;
    if (!isCustom) {
      product = await Product.findById(item.productId);
      if (!product) {
        throw new PricingError(`Product with ID ${item.productId} not found.`, 404);
      }
    } else if (!item.name?.trim()) {
      throw new PricingError("A custom item needs a name.", 400);
    }

    let effectivePrice;
    if (isFree) {
      // Anyone can mark a line free for a promotion - it always wins over
      // whatever price was submitted.
      effectivePrice = 0;
    } else if (isCustom) {
      if (!isOwner) {
        throw new PricingError("Only an owner can set a price for a custom item.", 403);
      }
      effectivePrice = Number(item.price);
    } else if (!isOwner) {
      // Ignore whatever price an employee submitted for a catalog product -
      // always re-derive it from the product's own tier price.
      effectivePrice = getTierPrice(product, priceTier);
    } else {
      effectivePrice = Number(item.price);
    }

    if (typeof effectivePrice !== "number" || isNaN(effectivePrice) || effectivePrice < 0) {
      throw new PricingError(`Invalid price for ${isCustom ? item.name : product.name}`, 400);
    }

    const lineSubtotal = effectivePrice * item.quantity;
    const rawDiscount = Number(item.discount) || 0;
    const discount = Math.max(0, Math.min(rawDiscount, lineSubtotal));

    subtotal += lineSubtotal;
    discountTotal += discount;

    // A custom item has no tracked cost basis (it's not in inventory), so
    // its full line revenue counts toward profit.
    const itemProfit = isCustom
      ? effectivePrice * item.quantity
      : (effectivePrice - product.initialPrice) * item.quantity;
    totalProfit += itemProfit;

    enrichedProducts.push({
      productId: isCustom ? undefined : item.productId,
      name: isCustom ? item.name.trim() : product.name,
      quantity: item.quantity,
      price: effectivePrice,
      discount,
      isCustom,
      free: isFree,
      costAtSale: isCustom ? undefined : product.initialPrice,
    });
    productLookups.push(isCustom ? null : product);
  }

  const afterDiscount = subtotal - discountTotal;
  const safeTaxRate = Math.max(0, Number(taxRate) || 0);
  const taxAmount = afterDiscount * (safeTaxRate / 100);
  const total = afterDiscount + taxAmount;
  // Discounts come straight out of margin; tax is collected on the
  // customer's behalf and never counted as profit.
  const profit = totalProfit - discountTotal;

  return { enrichedProducts, subtotal, discountTotal, taxRate: safeTaxRate, taxAmount, total, profit, productLookups };
}
