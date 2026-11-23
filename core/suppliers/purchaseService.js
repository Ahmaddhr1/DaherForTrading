// Recording a purchase from a supplier: restock, cost price, what we owe the
// supplier (or an upfront supplier payment) and the audit entry.
import Company from "@/core/suppliers/models/Company";
import Product from "@/core/products/models/Products";
import Purchase from "@/core/suppliers/models/Purchase";
import { recordSupplierPayment } from "@/core/payments/recordPayment";
import { logActivity } from "@/core/audit/activityLog";
import { auditView, snapshotChanges, extraChange } from "@/core/audit/audit";
import { ServiceError } from "@/core/shared/serviceError";

// input: { productId, unitPrice, quantity, discount, taxRate, paid, batchId, expiryDate } -> the purchase
export async function recordPurchase({ companyId, input, user }) {
  const id = companyId;
  const { productId, unitPrice, quantity, discount, taxRate, paid, batchId, expiryDate } = input;

  if (!productId || !unitPrice || !quantity) {
    throw new ServiceError(400, { message: "Product, unit price and quantity are required" });
  }

  const numericUnitPrice = parseFloat(unitPrice);
  const numericQuantity = parseInt(quantity, 10);

  if (numericUnitPrice <= 0 || numericQuantity <= 0) {
    throw new ServiceError(400, { message: "Unit price and quantity must be greater than 0" });
  }

  const lineSubtotal = numericUnitPrice * numericQuantity;
  const numericDiscount = Math.max(0, Math.min(parseFloat(discount) || 0, lineSubtotal));
  const numericTaxRate = Math.max(0, parseFloat(taxRate) || 0);
  const afterDiscount = lineSubtotal - numericDiscount;
  const numericTaxAmount = afterDiscount * (numericTaxRate / 100);
  const total = afterDiscount + numericTaxAmount;

  const company = await Company.findById(id);
  if (!company) {
    throw new ServiceError(404, { message: "Company not found" });
  }

  const product = await Product.findById(productId);
  if (!product) {
    throw new ServiceError(404, { message: "Product not found" });
  }

  const isPaid = !!paid;

  const purchase = await Purchase.create({
    company: id,
    product: productId,
    productName: product.name,
    unitPrice: numericUnitPrice,
    quantity: numericQuantity,
    discount: numericDiscount,
    taxRate: numericTaxRate,
    taxAmount: numericTaxAmount,
    total,
    paid: isPaid,
    batchId: typeof batchId === "string" && batchId ? batchId.slice(0, 64) : undefined,
    expiryDate: expiryDate && !isNaN(new Date(expiryDate)) ? new Date(expiryDate) : null,
  });

  // Restock the product and refresh its cost basis to the new unit price.
  await Product.findByIdAndUpdate(productId, {
    $inc: { quantity: numericQuantity },
    $set: { initialPrice: numericUnitPrice },
  });

  // A purchase paid upfront is money paid to the supplier on the spot, so it
  // gets its own supplier payment (owed amount unchanged, since nothing was
  // ever owed for it). Unpaid ones get theirs later, when marked as paid.
  if (isPaid) {
    await recordSupplierPayment({
      companyId: id,
      amount: total,
      purchase: purchase._id,
      admin: user,
      affectsDebt: false,
    });
  }

  // Track what we owe the company if the purchase wasn't paid upfront.
  await Company.findByIdAndUpdate(id, {
    $push: { purchases: purchase._id },
    $inc: { debt: isPaid ? 0 : total },
  });

  await logActivity({
    admin: user,
    action: "purchase.create",
    entityType: "Purchase",
    entityId: purchase._id,
    entityLabel: `${numericQuantity} x ${product.name}`,
    changes: [
      ...snapshotChanges("Purchase", await auditView("Purchase", purchase), "create"),
      extraChange("product.quantity", `${product.name} — Stock quantity`, product.quantity, product.quantity + numericQuantity, "number"),
      extraChange("product.initialPrice", `${product.name} — Cost price`, product.initialPrice, numericUnitPrice, "money"),
      extraChange("company.debt", `${company.name} — Debt (owed to them)`, company.debt, company.debt + (isPaid ? 0 : total), "money"),
    ],
    summary: `Recorded a purchase of ${numericQuantity} x "${product.name}" from ${company.name} for $${total.toFixed(2)}`,
    metadata: { companyId: id, productId, unitPrice: numericUnitPrice, quantity: numericQuantity, discount: numericDiscount, taxRate: numericTaxRate, paid: isPaid },
  });

  return purchase;
}
