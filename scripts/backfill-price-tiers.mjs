// One-off migration for the 4-tier pricing feature:
//   - Product gained priceWholesale/priceDistributor/priceVip (tiers 2-4;
//     `price` itself is reused as tier 1/Retail, so it needs no backfill).
//     Any product created before this feature existed has none of the three
//     new fields set in the database - this sets them all equal to the
//     product's current `price`, so nothing changes for existing customers
//     until Ahmad deliberately sets a different price for a tier.
//   - Customer gained priceTier (1-4, default 1/Retail). Every existing
//     customer is set to tier 1 (Retail) - the tier nothing previously
//     depended on, so this is the safe "no behavior change" default.
//
// Mongoose applies schema defaults on read, but raw aggregations (used by
// several summary/report queries in this app) read straight from MongoDB,
// so - same as every other backfill in this project - the real values need
// to exist in the database, not just at the application layer.
//
// Safe to run more than once: only touches documents missing the fields.
//
// Usage:
//   DATABASE_CONNECTION="<your connection string>" node scripts/backfill-price-tiers.mjs
// or, if DATABASE_CONNECTION is already set in a local .env file:
//   node scripts/backfill-price-tiers.mjs

import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    price: { type: Number },
    priceWholesale: { type: Number, default: null },
    priceDistributor: { type: Number, default: null },
    priceVip: { type: Number, default: null },
  },
  { timestamps: true }
);

const customerSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    priceTier: { type: Number, enum: [1, 2, 3, 4], default: 1 },
  },
  { timestamps: true }
);

async function main() {
  const uri = process.env.DATABASE_CONNECTION;
  if (!uri) {
    console.error("DATABASE_CONNECTION is not set (env var or .env file).");
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log("Connected.");

  const Product = mongoose.models.Product || mongoose.model("Product", productSchema);
  const Customer = mongoose.models.Customer || mongoose.model("Customer", customerSchema);

  for (const field of ["priceWholesale", "priceDistributor", "priceVip"]) {
    const result = await Product.updateMany(
      { [field]: { $exists: false } },
      [{ $set: { [field]: "$price" } }]
    );
    console.log(`Backfilled ${result.modifiedCount} product(s) missing ${field} (set to current price).`);
  }

  const tierResult = await Customer.updateMany(
    { priceTier: { $exists: false } },
    { $set: { priceTier: 1 } }
  );
  console.log(`Backfilled ${tierResult.modifiedCount} customer(s) missing priceTier to 1 (Retail).`);

  const productTotal = await Product.countDocuments({});
  const customerTotal = await Customer.countDocuments({});
  console.log(
    `Done. ${productTotal} product(s) and ${customerTotal} customer(s) in the database now have their price-tier fields set.`
  );

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
