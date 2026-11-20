import { connectToDB } from "@/lib/connectDb";
import Product from "@/models/Products";
import Category from "@/models/Category";
import Order from "@/models/Orders";
import { NextResponse } from "next/server";
import { getUserFromCookie } from "@/lib/auth";
import { logActivity } from "@/lib/activityLog";

const PRICE_FIELDS = ["price", "priceWholesale", "priceDistributor", "priceVip", "initialPrice"];
const PRICE_MODES = ["set", "increasePercent", "decreasePercent", "increaseAmount", "decreaseAmount"];

function applyPriceMode(currentValue, mode, value) {
  const base = typeof currentValue === "number" ? currentValue : 0;
  switch (mode) {
    case "set":
      return value;
    case "increasePercent":
      return base * (1 + value / 100);
    case "decreasePercent":
      return base * (1 - value / 100);
    case "increaseAmount":
      return base + value;
    case "decreaseAmount":
      return base - value;
    default:
      return base;
  }
}

async function handlePriceUpdate(productIds, { field, mode, value }) {
  if (!PRICE_FIELDS.includes(field)) {
    return NextResponse.json({ message: "Invalid price field" }, { status: 400 });
  }
  if (!PRICE_MODES.includes(mode)) {
    return NextResponse.json({ message: "Invalid adjustment mode" }, { status: 400 });
  }
  const parsedValue = parseFloat(value);
  if (isNaN(parsedValue)) {
    return NextResponse.json({ message: "Value must be a number" }, { status: 400 });
  }

  const products = await Product.find({ _id: { $in: productIds } }).select(
    "name price initialPrice priceWholesale priceDistributor priceVip"
  );

  const skipped = [];
  const updates = [];

  for (const product of products) {
    let newValue = applyPriceMode(product[field], mode, parsedValue);
    newValue = Math.round(newValue * 100) / 100;

    if (newValue < 0) {
      skipped.push({ id: product._id, name: product.name, reason: "Result would be negative" });
      continue;
    }

    const resultingPrice = field === "price" ? newValue : product.price;
    const resultingCost = field === "initialPrice" ? newValue : product.initialPrice;
    if (resultingCost > resultingPrice) {
      skipped.push({ id: product._id, name: product.name, reason: "Cost would exceed selling price" });
      continue;
    }

    updates.push({ updateOne: { filter: { _id: product._id }, update: { $set: { [field]: newValue } } } });
  }

  if (updates.length > 0) {
    await Product.bulkWrite(updates);
  }

  await logActivity({
    admin: await getUserFromCookie(),
    action: "product.bulkPriceUpdate",
    entityType: "Product",
    summary: `Bulk-updated ${field} on ${updates.length} product${updates.length === 1 ? "" : "s"} (${mode})`,
    metadata: { field, mode, value: parsedValue, productIds, skipped },
  });

  return NextResponse.json({ updated: updates.length, skipped }, { status: 200 });
}

async function handleCategoryReassign(productIds, { categoryId }) {
  const normalizedCategoryId = categoryId || null;

  if (normalizedCategoryId) {
    const category = await Category.findById(normalizedCategoryId);
    if (!category) {
      return NextResponse.json({ message: "Category not found" }, { status: 404 });
    }
  }

  const products = await Product.find({ _id: { $in: productIds } }).select("category");
  const oldCategoryIds = [
    ...new Set(products.map((p) => p.category?.toString()).filter(Boolean)),
  ];

  await Product.updateMany({ _id: { $in: productIds } }, { $set: { category: normalizedCategoryId } });

  if (oldCategoryIds.length > 0) {
    await Category.updateMany(
      { _id: { $in: oldCategoryIds } },
      { $pull: { products: { $in: productIds } } }
    );
  }
  if (normalizedCategoryId) {
    await Category.findByIdAndUpdate(normalizedCategoryId, {
      $addToSet: { products: { $each: productIds } },
    });
  }

  await logActivity({
    admin: await getUserFromCookie(),
    action: "product.bulkCategoryReassign",
    entityType: "Product",
    summary: `Reassigned ${productIds.length} product${productIds.length === 1 ? "" : "s"} to ${
      normalizedCategoryId ? "a new category" : "no category"
    }`,
    metadata: { categoryId: normalizedCategoryId, productIds },
  });

  return NextResponse.json({ updated: productIds.length }, { status: 200 });
}

async function handleBulkDelete(productIds) {
  const products = await Product.find({ _id: { $in: productIds } }).select("name category");

  const orderedIds = new Set(
    (await Order.find({ "products.productId": { $in: productIds } }).select("products.productId"))
      .flatMap((o) => o.products.map((p) => p.productId?.toString()))
      .filter(Boolean)
  );

  const deletable = products.filter((p) => !orderedIds.has(p._id.toString()));
  const skipped = products
    .filter((p) => orderedIds.has(p._id.toString()))
    .map((p) => ({ id: p._id, name: p.name, reason: "Already ordered by a customer" }));

  const deletableIds = deletable.map((p) => p._id);
  if (deletableIds.length > 0) {
    await Product.deleteMany({ _id: { $in: deletableIds } });

    const categoryIds = [...new Set(deletable.map((p) => p.category?.toString()).filter(Boolean))];
    if (categoryIds.length > 0) {
      await Category.updateMany(
        { _id: { $in: categoryIds } },
        { $pull: { products: { $in: deletableIds } } }
      );
    }
  }

  await logActivity({
    admin: await getUserFromCookie(),
    action: "product.bulkDelete",
    entityType: "Product",
    summary: `Bulk-deleted ${deletableIds.length} product${deletableIds.length === 1 ? "" : "s"}`,
    metadata: { productIds: deletableIds, skipped },
  });

  return NextResponse.json({ deleted: deletableIds.length, skipped }, { status: 200 });
}

export async function POST(req) {
  await connectToDB();

  try {
    const body = await req.json();
    const { action, productIds } = body;

    if (!Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json({ message: "No products selected" }, { status: 400 });
    }

    if (action === "priceUpdate") {
      return await handlePriceUpdate(productIds, body);
    }
    if (action === "categoryReassign") {
      return await handleCategoryReassign(productIds, body);
    }
    if (action === "delete") {
      return await handleBulkDelete(productIds);
    }

    return NextResponse.json({ message: "Invalid bulk action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { message: "Bulk action failed", error: error.message },
      { status: 500 }
    );
  }
}
