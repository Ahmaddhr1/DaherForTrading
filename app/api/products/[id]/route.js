import { connectToDB } from "@/core/platform/connectDb";
import Product from "@/core/products/models/Products";
import Category from "@/core/products/models/Category"; // import your Category model
import Order from "@/core/orders/models/Orders";
import { NextResponse } from "next/server";
import { getUserFromCookie } from "@/core/platform/auth";
import { logActivity } from "@/core/audit/activityLog";
import { auditView, diffViews, snapshotChanges, describeChanges } from "@/core/audit/audit";
import { requirePermission } from "@/core/platform/permissions";

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
  } catch {
    return NextResponse.json(
      { error: "Error fetching product" },
      { status: 500 }
    );
  }
}

// UPDATE a product by ID
export async function PUT(req, { params }) {
  await connectToDB();
  const forbiddenPermission = await requirePermission(await getUserFromCookie(), "canEditProducts");
  if (forbiddenPermission) return forbiddenPermission;

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
    // Expiry date: "" clears it, otherwise a yyyy-mm-dd / ISO date.
    if (body.expiryDate !== undefined) {
      if (body.expiryDate === "" || body.expiryDate === null) {
        body.expiryDate = null;
      } else {
        const d = new Date(body.expiryDate);
        if (isNaN(d.getTime())) {
          return NextResponse.json({ error: "Invalid expiry date." }, { status: 400 });
        }
        body.expiryDate = d;
      }
    }
    if (body.expiryAlertDays !== undefined) {
      if (body.expiryAlertDays === "" || body.expiryAlertDays === null) {
        body.expiryAlertDays = null;
      } else {
        const n = parseInt(body.expiryAlertDays, 10);
        if (isNaN(n) || n < 1 || n > 3650) {
          return NextResponse.json({ error: "Alert days must be between 1 and 3650." }, { status: 400 });
        }
        body.expiryAlertDays = n;
      }
    }
    if (typeof body.unit === "string" && !body.unit.trim()) {
      body.unit = "pcs";
    }
    if (body.discount !== undefined && body.discount !== null && body.discount !== "") {
      const parsedDiscount = parseFloat(body.discount);
      if (isNaN(parsedDiscount) || parsedDiscount < 0 || parsedDiscount > 100) {
        return NextResponse.json(
          { error: "Discount must be a number between 0 and 100." },
          { status: 400 }
        );
      }
      body.discount = parsedDiscount;
    } else if (body.discount === "") {
      body.discount = 0;
    }
    if (body.img !== undefined) {
      body.img = Array.isArray(body.img) ? body.img.filter((url) => typeof url === "string" && url) : [];
    }

    // Wholesale/Distributor/VIP tier prices - a blank string means "use the
    // Retail price", same convenience default as on creation.
    for (const field of ["priceWholesale", "priceDistributor", "priceVip"]) {
      if (body[field] === "" || body[field] === undefined || body[field] === null) {
        body[field] = body.price !== undefined ? body.price : beforeUpdate.price;
      } else {
        const parsed = parseFloat(body[field]);
        if (isNaN(parsed) || parsed < 0) {
          return NextResponse.json(
            { error: `${field.replace("price", "")} price must be a number ≥ 0.` },
            { status: 400 }
          );
        }
        body[field] = parsed;
      }
    }

    // Barcode: blank removes it; otherwise it must not belong to another product.
    if (body.barcode !== undefined) {
      const code = typeof body.barcode === "string" ? body.barcode.trim() : "";
      if (!code) {
        delete body.barcode;
        body.$unset = { ...(body.$unset || {}), barcode: 1 };
      } else {
        const taken = await Product.findOne({ barcode: code, _id: { $ne: id } }).select("name");
        if (taken) {
          return NextResponse.json({ error: `This barcode is already used by "${taken.name}".` }, { status: 400 });
        }
        body.barcode = code;
      }
    }

    const updatedProduct = await Product.findByIdAndUpdate(id, body, {
      new: true,
    });

    const changes = diffViews(
      "Product",
      await auditView("Product", beforeUpdate),
      await auditView("Product", updatedProduct)
    );
    if (changes.length > 0) {
      const priceChanged = changes.some((c) => c.field === "price");
      await logActivity({
        admin: await getUserFromCookie(),
        action: priceChanged ? "product.priceChange" : "product.edit",
        entityType: "Product",
        entityId: updatedProduct._id,
        entityLabel: updatedProduct.name,
        summary: `Edited product "${updatedProduct.name}": ${describeChanges(changes)}`,
        changes,
      });
    }

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
  const admin = await getUserFromCookie();
  const forbidden = await requirePermission(admin, "canDelete");
  if (forbidden) return forbidden;

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

    // Refuse to delete a product that's referenced in any customer's order
    // (including drafts) - deleting it would orphan that order's line item
    // and break its stock-ledger/history trail.
    const hasBeenOrdered = await Order.exists({ "products.productId": id });
    if (hasBeenOrdered) {
      return NextResponse.json(
        { message: "This product can't be deleted because a customer has already ordered it." },
        { status: 400 }
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
      admin,
      action: "product.delete",
      entityType: "Product",
      entityId: id,
      entityLabel: productToDelete.name,
      summary: `Deleted product "${productToDelete.name}"`,
      changes: snapshotChanges("Product", await auditView("Product", productToDelete), "delete"),
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
