// One-off seed script: wipes the Product collection and reseeds it (plus
// the "Water" category it belongs to) from the last known-good backup,
// through the current Product schema rather than a raw restore. Doesn't
// touch any other collection.
//
// Usage:
//   DATABASE_CONNECTION="<your connection string>" node scripts/seed-products.mjs
// or, if DATABASE_CONNECTION is already set in a local .env file:
//   node scripts/seed-products.mjs

import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    quantity: { type: Number, default: 0 },
    price: { type: Number },
    initialPrice: { type: Number },
    profit: { type: Number },
    category: { type: mongoose.Types.ObjectId, ref: "Category" },
    nbOfOrders: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    products: { type: [mongoose.Types.ObjectId], ref: "Product", default: [] },
  },
  { timestamps: true }
);

const CATEGORY_NAME = "Water";

const PRODUCTS = [
  { name: "Tannourine 2L", price: 1.86, initialPrice: 1.61, quantity: 0 },
  { name: "Tannourine 0.5L", price: 1.86, initialPrice: 1.61, quantity: 0 },
  { name: "Tannourine 1.5L", price: 1.66, initialPrice: 1.39, quantity: 0 },
  { name: "Tannourine 0.33L", price: 1.56, initialPrice: 1.332, quantity: 0 },
  { name: "Tannourine VIA Spark 330ml *6", price: 3.25, initialPrice: 2.6, quantity: 0 },
  { name: "Nestle 2L", price: 2.075, initialPrice: 1.95, quantity: 0 },
  { name: "Nestle 0.6L", price: 2.075, initialPrice: 1.95, quantity: 0 },
  { name: "Nestle 330ml", price: 1.77, initialPrice: 1.65, quantity: 0 },
  { name: "Nestle 1.5L", price: 1.665, initialPrice: 1.565, quantity: 0 },
  { name: "Sohat 0.5L", price: 2.475, initialPrice: 2.326, quantity: 0 },
  { name: "Sohat 1.5L", price: 2.425, initialPrice: 2.28, quantity: 0 },
  { name: "Sohat 0.15L", price: 3.1, initialPrice: 2.914, quantity: 0 },
  { name: "Aliyah 2L", price: 1.475, initialPrice: 1.36, quantity: 0 },
  { name: "Aliyah 0.5L", price: 1.45, initialPrice: 1.325, quantity: 0 },
  { name: "Aliyah 1.5L", price: 1.375, initialPrice: 1.27, quantity: 0 },
  { name: "Aliyah 0.33L", price: 1.35, initialPrice: 1.24, quantity: 0 },
  { name: "Rim 2L", price: 1.9, initialPrice: 1.76, quantity: 0 },
  { name: "Rim 0.5L", price: 1.9, initialPrice: 1.76, quantity: 0 },
  { name: "Rim 0.33L", price: 1.575, initialPrice: 1.475, quantity: 0 },
  { name: "Berdawni 2L", price: 1.5, initialPrice: 1.36, quantity: 0 },
  { name: "Berdawni 0.5L", price: 1.45, initialPrice: 1.325, quantity: 0 },
  { name: "Berdawni 0.33L", price: 1.35, initialPrice: 1.25, quantity: 0 },
  { name: "Rim Fruit 330ml", price: 4.25, initialPrice: 4.13, quantity: 0 },
  { name: "test", price: 3, initialPrice: 2, quantity: 0 },
];

async function main() {
  const uri = process.env.DATABASE_CONNECTION;
  if (!uri) {
    console.error("DATABASE_CONNECTION is not set (env var or .env file).");
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log("Connected.");

  const Product = mongoose.models.Product || mongoose.model("Product", productSchema);
  const Category = mongoose.models.Category || mongoose.model("Category", categorySchema);

  await Product.deleteMany({});
  console.log("Cleared existing products.");

  let category = await Category.findOne({ name: CATEGORY_NAME });
  if (!category) {
    category = await Category.create({ name: CATEGORY_NAME, products: [] });
    console.log("Created category:", category.name);
  } else {
    console.log("Using existing category:", category.name);
  }

  const products = await Product.insertMany(
    PRODUCTS.map((p) => ({
      ...p,
      profit: p.price - p.initialPrice,
      category: category._id,
      nbOfOrders: 0,
    }))
  );
  console.log(`Inserted ${products.length} products.`);

  category.products = products.map((p) => p._id);
  await category.save();

  console.log("Done.");
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
