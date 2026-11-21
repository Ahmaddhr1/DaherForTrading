// Fills the activity log with realistic, clearly-fake audit entries so the
// detailed audit trail (Activity Log + each entry's previous-vs-current page)
// can be demoed or screenshotted without real business data.
//
// Every entry is tagged metadata.demo = true, so it can be removed again
// without touching real log entries.
//
// Usage:
//   DATABASE_CONNECTION="<connection string>" node scripts/seed-audit-demo.mjs           # insert
//   DATABASE_CONNECTION="<connection string>" node scripts/seed-audit-demo.mjs --remove  # delete demo entries
//   node scripts/seed-audit-demo.mjs --json                                              # print entries, no DB

import mongoose from "mongoose";

const ADMINS = {
  ahmad: { id: "64b000000000000000000001", name: "ahmad" },
  sara: { id: "64b000000000000000000002", name: "sara" },
  omar: { id: "64b000000000000000000003", name: "omar" },
};

let seq = 0;
const fakeId = (prefix = "65d0") => `${prefix}${String(++seq).padStart(20, "0")}`;

const c = (field, label, before, after, format = "text") => ({ field, label, format, before, after });

// Entries are listed newest first; `minutesAgo` spaces them through the day.
function demoEntries() {
  const orderId = fakeId("65e1");
  const productId = fakeId("65e2");
  return [
    {
      by: "sara",
      minutesAgo: 6,
      action: "product.priceChange",
      entityType: "Product",
      entityId: productId,
      entityLabel: "Basmati Rice 5kg",
      summary: 'Edited product "Basmati Rice 5kg": Retail price: $11.50 → $12.75; Wholesale price: $10.80 → $11.90; Stock quantity: 40 → 46 (+2 more)',
      changes: [
        c("price", "Retail price", 11.5, 12.75, "money"),
        c("priceWholesale", "Wholesale price", 10.8, 11.9, "money"),
        c("quantity", "Stock quantity", 40, 46, "number"),
        c("lowStockThreshold", "Low-stock alert at", 5, 10, "number"),
        c("category", "Category", "Grains", "Rice & Grains"),
      ],
    },
    {
      by: "omar",
      minutesAgo: 14,
      action: "order.edit",
      entityType: "Order",
      entityId: orderId,
      entityLabel: "order #4F2A91",
      summary: "Edited order #4F2A91: Item: Olive Oil 1L: 6 × $8.50 → 10 × $8.50 − $4.00 discount; Item: Arabic Coffee 250g: — → 4 × $5.25 (+3 more)",
      changes: [
        c("items.olive", "Item: Olive Oil 1L", { quantity: 6, price: 8.5, discount: 0, free: false }, { quantity: 10, price: 8.5, discount: 4, free: false }, "line"),
        c("items.coffee", "Item: Arabic Coffee 250g", null, { quantity: 4, price: 5.25, discount: 0, free: false }, "line"),
        c("items.tahini", "Item: Tahini 500g", { quantity: 3, price: 4.75, discount: 0, free: false }, null, "line"),
        c("total", "Total", 65.25, 102, "money"),
        c("discountTotal", "Discount total", 0, 4, "money"),
        c("customer.debt", "Customer debt", 1240, 1276.75, "money"),
      ],
    },
    {
      by: "ahmad",
      minutesAgo: 27,
      action: "admin.edit",
      entityType: "Admin",
      entityId: ADMINS.sara.id,
      entityLabel: "sara",
      summary: 'Edited admin "sara": Create new products: No → Yes; Edit existing products, adjust stock, and bulk price/category updates: No → Yes',
      changes: [
        c("permissions.canCreateProducts", "Permission: Create new products", false, true, "bool"),
        c("permissions.canEditProducts", "Permission: Edit existing products, adjust stock, and bulk price/category updates", false, true, "bool"),
        c("permissions.canOverrideOrderPricing", "Permission: Override catalog prices and price custom items on an order", true, false, "bool"),
      ],
    },
    {
      by: "sara",
      minutesAgo: 41,
      action: "customer.edit",
      entityType: "Customer",
      entityId: fakeId("65e3"),
      entityLabel: "Al-Noor Market",
      summary: 'Edited customer "Al-Noor Market": Phone number: 71 234 567 → 76 845 120; Price tier: Retail (tier 1) → Wholesale (tier 2)',
      changes: [
        c("phoneNumber", "Phone number", "71 234 567", "76 845 120"),
        c("priceTier", "Price tier", 1, 2, "tier"),
      ],
    },
    {
      by: "omar",
      minutesAgo: 58,
      action: "order.payment",
      entityType: "Order",
      entityId: fakeId("65e1"),
      entityLabel: "order #9C07B3",
      summary: "Recorded a $250.00 payment on order #9C07B3 from Rami's Hardware",
      changes: [
        c("status", "Status", "pending", "partiallyPaid", "status"),
        c("amountpaid", "Amount paid", 0, 250, "money"),
        c("remainingBalance", "Remaining balance", 480, 230, "money"),
        c("customer.debt", "Customer debt", 1490, 1240, "money"),
      ],
    },
    {
      by: "sara",
      minutesAgo: 73,
      action: "purchase.create",
      entityType: "Purchase",
      entityId: fakeId("65e4"),
      entityLabel: "24 x Olive Oil 1L",
      summary: 'Recorded a purchase of 24 x "Olive Oil 1L" from Beirut Grocers Co. for $165.60',
      changes: [
        c("company", "Supplier", null, "Beirut Grocers Co."),
        c("unitPrice", "Unit price", null, 6.9, "money"),
        c("quantity", "Quantity", null, 24, "number"),
        c("total", "Total", null, 165.6, "money"),
        c("product.quantity", "Olive Oil 1L — Stock quantity", 8, 32, "number"),
        c("product.initialPrice", "Olive Oil 1L — Cost price", 6.5, 6.9, "money"),
        c("company.debt", "Beirut Grocers Co. — Debt (owed to them)", 420, 585.6, "money"),
      ],
    },
    {
      by: "ahmad",
      minutesAgo: 96,
      action: "settings.update",
      entityType: "Settings",
      entityId: fakeId("65e5"),
      entityLabel: "Business settings",
      summary: "Updated business settings: Dollar rate (LBP): 89,500 → 89,700; Default tax rate: 0% → 11%",
      changes: [
        c("dollarRate", "Dollar rate (LBP)", 89500, 89700, "number"),
        c("taxRate", "Default tax rate", 0, 11, "percent"),
      ],
    },
    {
      by: "omar",
      minutesAgo: 118,
      action: "product.stockAdjustment",
      entityType: "Product",
      entityId: fakeId("65e2"),
      entityLabel: "Fresh Labneh 1kg",
      summary: 'Adjusted stock of "Fresh Labneh 1kg" by -3 (expired): 15 → 12',
      changes: [
        c("quantity", "Stock quantity", 15, 12, "number"),
        c("adjustment.type", "Adjustment type", null, "expired"),
        c("adjustment.reason", "Reason", null, "Past best-before date"),
      ],
    },
    {
      by: "sara",
      minutesAgo: 141,
      action: "order.create",
      entityType: "Order",
      entityId: fakeId("65e1"),
      entityLabel: "order #B81E04",
      summary: "Created an order worth $96.40 for Sea View Cafe",
      changes: [
        c("customer", "Customer", null, "Sea View Cafe"),
        c("status", "Status", null, "pending", "status"),
        c("total", "Total", null, 96.4, "money"),
        c("items.cups", "Item: Paper Cups (50)", null, { quantity: 8, price: 3.8, discount: 0, free: false }, "line"),
        c("items.sugar", "Item: Sugar 1kg", null, { quantity: 12, price: 1.95, discount: 0, free: false }, "line"),
        c("items.coffee", "Item: Arabic Coffee 250g", null, { quantity: 8, price: 5.25, discount: 0, free: false }, "line"),
        c("customer.debt", "Customer debt", 0, 96.4, "money"),
      ],
    },
    {
      by: "ahmad",
      minutesAgo: 166,
      action: "product.delete",
      entityType: "Product",
      entityId: fakeId("65e2"),
      entityLabel: "Sparkling Water 250ml",
      summary: 'Deleted product "Sparkling Water 250ml"',
      changes: [
        c("name", "Name", "Sparkling Water 250ml", null),
        c("price", "Retail price", 0.75, null, "money"),
        c("initialPrice", "Cost price", 0.45, null, "money"),
        c("quantity", "Stock quantity", 0, null, "number"),
        c("category", "Category", "Drinks", null),
      ],
    },
    {
      by: "sara",
      minutesAgo: 190,
      action: "company.edit",
      entityType: "Company",
      entityId: fakeId("65e6"),
      entityLabel: "Tripoli Fresh Market",
      summary: 'Edited supplier "Tripoli Fresh Market": Address: Mina St. → Port Road, Bldg 12; Phone number: 06 401 220 → 06 401 228',
      changes: [
        c("address", "Address", "Mina St.", "Port Road, Bldg 12"),
        c("phoneNumber", "Phone number", "06 401 220", "06 401 228"),
      ],
    },
    {
      by: "omar",
      minutesAgo: 214,
      action: "recurringDisbursement.edit",
      entityType: "RecurringDisbursement",
      entityId: fakeId("65e7"),
      entityLabel: "Shop rent",
      summary: 'Updated the recurring disbursement "Shop rent": Amount: $600.00 → $650.00; Day of month: 1 → 5',
      changes: [
        c("amount", "Amount", 600, 650, "money"),
        c("dayOfMonth", "Day of month", 1, 5, "number"),
      ],
    },
    {
      by: "ahmad",
      minutesAgo: 238,
      action: "category.edit",
      entityType: "Category",
      entityId: fakeId("65e8"),
      entityLabel: "Rice & Grains",
      summary: 'Renamed category "Grains" to "Rice & Grains"',
      changes: [c("name", "Name", "Grains", "Rice & Grains")],
    },
  ];
}

export function buildDemoAuditEntries(now = new Date()) {
  seq = 0;
  return demoEntries().map(({ by, minutesAgo, ...entry }) => {
    const at = new Date(now.getTime() - minutesAgo * 60 * 1000);
    return {
      ...entry,
      admin: ADMINS[by].id,
      adminName: ADMINS[by].name,
      metadata: { demo: true },
      createdAt: at.toISOString(),
      updatedAt: at.toISOString(),
    };
  });
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes("--json")) {
    process.stdout.write(JSON.stringify(buildDemoAuditEntries(), null, 2));
    return;
  }

  if (!process.env.DATABASE_CONNECTION) {
    console.error("Set DATABASE_CONNECTION to your MongoDB connection string.");
    process.exit(1);
  }

  await mongoose.connect(process.env.DATABASE_CONNECTION);
  const collection = mongoose.connection.collection("activitylogs");

  if (args.includes("--remove")) {
    const { deletedCount } = await collection.deleteMany({ "metadata.demo": true });
    console.log(`Removed ${deletedCount} demo audit entries.`);
  } else {
    const docs = buildDemoAuditEntries().map((e) => ({
      ...e,
      _id: new mongoose.Types.ObjectId(),
      admin: new mongoose.Types.ObjectId(e.admin),
      entityId: new mongoose.Types.ObjectId(e.entityId),
      createdAt: new Date(e.createdAt),
      updatedAt: new Date(e.updatedAt),
    }));
    await collection.insertMany(docs);
    console.log(`Inserted ${docs.length} demo audit entries (tagged metadata.demo = true).`);
  }

  await mongoose.disconnect();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
