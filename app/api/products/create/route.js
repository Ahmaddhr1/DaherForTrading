import { connectToDB } from "@/core/platform/connectDb";
import Product from "@/core/products/models/Products";
import Category from "@/core/products/models/Category"; // import category model
import { NextResponse } from "next/server";
import { getUserFromCookie } from "@/core/platform/auth";
import { logActivity } from "@/core/audit/activityLog";
import { auditView, snapshotChanges } from "@/core/audit/audit";
import { requirePermission } from "@/core/platform/permissions";

export async function POST(req) {
  await connectToDB();
  const forbidden = await requirePermission(await getUserFromCookie(), "canCreateProducts");
  if (forbidden) return forbidden;

  try {
    const {
      name,
      barcode,
      quantity,
      price,
      initialPrice,
      profit,
      category,
      unit,
      lowStockThreshold,
      expiryDate,
      expiryAlertDays,
      defaultSupplier,
      priceWholesale,
      priceDistributor,
      priceVip,
      img,
      discount,
    } = await req.json();

    if (!name?.trim() || price == null) {
      return NextResponse.json(
        { error: "Name and price are required." },
        { status: 400 }
      );
    }

    // New products start with no stock - stock is added later via purchases.
    const parsedQuantity = quantity == null || quantity === "" ? 0 : parseInt(quantity, 10);
    const parsedPrice = parseFloat(price);
    const parsedInitialPrice = parseFloat(initialPrice);
    const parsedProfit = parseFloat(profit);

    if (
      isNaN(parsedPrice) ||
      isNaN(parsedQuantity) ||
      isNaN(parsedInitialPrice) ||
      isNaN(parsedProfit)
    ) {
      return NextResponse.json(
        { error: "Numeric values are not valid." },
        { status: 400 }
      );
    }

    if (parsedPrice < 0 || parsedQuantity < 0 || parsedInitialPrice < 0) {
      return NextResponse.json(
        { error: "Price, quantity, and initial price must be ≥ 0." },
        { status: 400 }
      );
    }

    if(parsedInitialPrice>parsedPrice) {
       return NextResponse.json(
        { error: "Cost Price can't be bigger than the selling price" },
        { status: 400 }
      );
    }

    // Unit of measure - freeform, defaults to "pcs" if left blank.
    const parsedUnit = typeof unit === "string" && unit.trim() ? unit.trim() : "pcs";

    // Low stock threshold - defaults to 5, must not be negative.
    let parsedLowStockThreshold = 5;
    if (lowStockThreshold !== undefined && lowStockThreshold !== null && lowStockThreshold !== "") {
      parsedLowStockThreshold = parseInt(lowStockThreshold, 10);
      if (isNaN(parsedLowStockThreshold) || parsedLowStockThreshold < 0) {
        return NextResponse.json(
          { error: "Low stock threshold must be a number ≥ 0." },
          { status: 400 }
        );
      }
    }

    // Default supplier - optional ObjectId, normalize blank to null.
    const parsedDefaultSupplier = defaultSupplier && defaultSupplier !== "" ? defaultSupplier : null;

    // Default discount % - optional, defaults to 0, clamped to 0-100.
    let parsedDiscount = 0;
    if (discount !== undefined && discount !== null && discount !== "") {
      parsedDiscount = parseFloat(discount);
      if (isNaN(parsedDiscount) || parsedDiscount < 0 || parsedDiscount > 100) {
        return NextResponse.json(
          { error: "Discount must be a number between 0 and 100." },
          { status: 400 }
        );
      }
    }

    // Wholesale/Distributor/VIP tier prices - each optional; a blank/omitted
    // one defaults to the Retail price so every tier is priced from the
    // start (core/products/priceTiers.js also falls back to `price` at read time, so
    // this is a convenience default, not something other code depends on).
    const parseTierPrice = (value, label) => {
      if (value === undefined || value === null || value === "") return parsedPrice;
      const parsed = parseFloat(value);
      if (isNaN(parsed) || parsed < 0) {
        throw new Error(`${label} price must be a number ≥ 0.`);
      }
      return parsed;
    };
    let parsedPriceWholesale, parsedPriceDistributor, parsedPriceVip;
    try {
      parsedPriceWholesale = parseTierPrice(priceWholesale, "Wholesale");
      parsedPriceDistributor = parseTierPrice(priceDistributor, "Distributor");
      parsedPriceVip = parseTierPrice(priceVip, "VIP");
    } catch (err) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }

    const cleanBarcode = typeof barcode === "string" && barcode.trim() ? barcode.trim() : undefined;
    if (cleanBarcode) {
      const taken = await Product.findOne({ barcode: cleanBarcode }).select("name");
      if (taken) {
        return NextResponse.json({ error: `This barcode is already used by "${taken.name}".` }, { status: 400 });
      }
    }

    // Create the product
    const product = new Product({
      name: name.trim(),
      barcode: cleanBarcode,
      quantity: parsedQuantity,
      price: parsedPrice,
      priceWholesale: parsedPriceWholesale,
      priceDistributor: parsedPriceDistributor,
      priceVip: parsedPriceVip,
      initialPrice: parsedInitialPrice,
      profit: parsedProfit,
      category,
      unit: parsedUnit,
      lowStockThreshold: parsedLowStockThreshold,
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      expiryAlertDays:
        expiryAlertDays === "" || expiryAlertDays == null || isNaN(parseInt(expiryAlertDays, 10))
          ? null
          : Math.min(3650, Math.max(1, parseInt(expiryAlertDays, 10))),
      defaultSupplier: parsedDefaultSupplier,
      img: Array.isArray(img) ? img.filter((url) => typeof url === "string" && url) : [],
      discount: parsedDiscount,
    });

    await product.save();

    // If category is provided, push product._id to Category.products
    if (category) {
      await Category.findByIdAndUpdate(category, {
        $push: { products: product._id },
      });
    }

    await logActivity({
      admin: await getUserFromCookie(),
      action: "product.create",
      entityType: "Product",
      entityId: product._id,
      entityLabel: product.name,
      summary: `Created product "${product.name}"`,
      changes: snapshotChanges("Product", await auditView("Product", product), "create"),
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { message: "Error creating product", error: error.message },
      { status: 500 }
    );
  }
}
