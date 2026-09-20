import { connectToDB } from "@/lib/connectDb";
import Product from "@/models/Products";
import Category from "@/models/Category"; // import category model
import { NextResponse } from "next/server";
import { getUserFromCookie } from "@/lib/auth";
import { logActivity } from "@/lib/activityLog";

export async function POST(req) {
  await connectToDB();

  try {
    const {
      name,
      quantity,
      price,
      initialPrice,
      profit,
      category,
      unit,
      lowStockThreshold,
      defaultSupplier,
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

    // Create the product
    const product = new Product({
      name: name.trim(),
      quantity: parsedQuantity,
      price: parsedPrice,
      initialPrice: parsedInitialPrice,
      profit: parsedProfit,
      category,
      unit: parsedUnit,
      lowStockThreshold: parsedLowStockThreshold,
      defaultSupplier: parsedDefaultSupplier,
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
      summary: `Created product "${product.name}"`,
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { message: "Error creating product", error: error.message },
      { status: 500 }
    );
  }
}
