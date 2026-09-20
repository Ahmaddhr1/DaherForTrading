import { connectToDB } from "@/lib/connectDb";
import Product from "@/models/Products";
import Category from "@/models/Category"; // import your Category model
import { NextResponse } from "next/server";
import { getUserFromCookie } from "@/lib/auth";
import { logActivity } from "@/lib/activityLog";

// GET a product by ID
export async function GET(_, { params }) {
  await connectToDB();
  try {
    const id = params.id;
    const product = await Product.findById(id);
    if (!product) {
      return NextResponse.json(
        { error: "Product not found!" },
        { status: 404 }
      );
    }
    return NextResponse.json(product, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: "Error fetching product" },
      { status: 500 }
    );
  }
}

// UPDATE a product by ID
export async function PUT(req, { params }) {
  await connectToDB();
  try {
    const id = params.id;
    const body = await req.json();
    if (body.price < body.initialPrice) {
      return NextResponse.json(
        { error: "Cost Price can't be bigger than the selling price" },
        { status: 400 }
      );
    }

    const beforeUpdate = await Product.findById(id);
    if (!beforeUpdate) {
      return NextResponse.json(
        { message: "Product not found" },
        { status: 404 }
      );
    }

    // Normalize an empty-string defaultSupplier (the "no supplier" choice in
    // the select) to null so clearing it actually clears it.
    if (body.defaultSupplier === "") {
      body.defaultSupplier = null;
    }
    if (body.lowStockThreshold !== undefined && body.lowStockThreshold !== null && body.lowStockThreshold !== "") {
      const parsedThreshold = parseInt(body.lowStockThreshold, 10);
      if (isNaN(parsedThreshold) || parsedThreshold < 0) {
        return NextResponse.json(
          { error: "Low stock threshold must be a number ≥ 0." },
          { status: 400 }
        );
      }
      body.lowStockThreshold = parsedThreshold;
    }
    if (typeof body.unit === "string" && !body.unit.trim()) {
      body.unit = "pcs";
    }

    const updatedProduct = await Product.findByIdAndUpdate(id, body, {
      new: true,
    });

    const priceChanged =
      body.price !== undefined && Number(body.price) !== beforeUpdate.price;
    await logActivity({
      admin: await getUserFromCookie(),
      action: priceChanged ? "product.priceChange" : "product.edit",
      entityType: "Product",
      entityId: updatedProduct._id,
      summary: priceChanged
        ? `Changed the price of "${updatedProduct.name}" from $${beforeUpdate.price} to $${updatedProduct.price}`
        : `Edited product "${updatedProduct.name}"`,
      metadata: priceChanged
        ? { before: beforeUpdate.price, after: updatedProduct.price }
        : undefined,
    });

    return NextResponse.json(updatedProduct, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: "Error updating product", error: error.message },
      { status: 500 }
    );
  }
}

// DELETE a product by ID
export async function DELETE(req, { params }) {
  await connectToDB();
  try {
    const id = params.id;

    // Find the product before deleting to get its category
    const productToDelete = await Product.findById(id);
    if (!productToDelete) {
      return NextResponse.json(
        { message: "Product not found" },
        { status: 404 }
      );
    }

    // Delete the product
    await Product.findByIdAndDelete(id);

    // Remove product ID from category's products array if category exists
    if (productToDelete.category) {
      await Category.findByIdAndUpdate(productToDelete.category, {
        $pull: { products: id },
      });
    }

    await logActivity({
      admin: await getUserFromCookie(),
      action: "product.delete",
      entityType: "Product",
      entityId: id,
      summary: `Deleted product "${productToDelete.name}"`,
    });

    return NextResponse.json(
      { message: "Product deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: "Error deleting product", error: error.message },
      { status: 500 }
    );
  }
}
