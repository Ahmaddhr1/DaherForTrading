import { connectToDB } from "@/lib/connectDb";
import Company from "@/models/Company";
import Product from "@/models/Products";
import Purchase from "@/models/Purchase";
import { NextResponse } from "next/server";

// GET paginated purchase history for a company
export async function GET(req, { params }) {
  await connectToDB();
  try {
    const { id } = params;
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 10;
    const skip = (page - 1) * limit;

    const company = await Company.findById(id).select("name");
    if (!company) {
      return NextResponse.json({ message: "Company not found" }, { status: 404 });
    }

    const query = { company: id };
    const total = await Purchase.countDocuments(query);
    const purchases = await Purchase.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return NextResponse.json(
      {
        companyName: company.name,
        purchases,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: "Error fetching purchases", error: error.message },
      { status: 500 }
    );
  }
}

// Create a purchase from this company (restocking a product)
export async function POST(req, { params }) {
  await connectToDB();
  try {
    const { id } = params;
    const { productId, unitPrice, quantity, paid } = await req.json();

    if (!productId || !unitPrice || !quantity) {
      return NextResponse.json(
        { message: "Product, unit price and quantity are required" },
        { status: 400 }
      );
    }

    const numericUnitPrice = parseFloat(unitPrice);
    const numericQuantity = parseInt(quantity, 10);

    if (numericUnitPrice <= 0 || numericQuantity <= 0) {
      return NextResponse.json(
        { message: "Unit price and quantity must be greater than 0" },
        { status: 400 }
      );
    }

    const company = await Company.findById(id);
    if (!company) {
      return NextResponse.json({ message: "Company not found" }, { status: 404 });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return NextResponse.json({ message: "Product not found" }, { status: 404 });
    }

    const total = numericUnitPrice * numericQuantity;
    const isPaid = !!paid;

    const purchase = await Purchase.create({
      company: id,
      product: productId,
      productName: product.name,
      unitPrice: numericUnitPrice,
      quantity: numericQuantity,
      total,
      paid: isPaid,
    });

    // Restock the product and refresh its cost basis to the new unit price.
    await Product.findByIdAndUpdate(productId, {
      $inc: { quantity: numericQuantity },
      $set: { initialPrice: numericUnitPrice },
    });

    // Track what we owe the company if the purchase wasn't paid upfront.
    await Company.findByIdAndUpdate(id, {
      $push: { purchases: purchase._id },
      $inc: { debt: isPaid ? 0 : total },
    });

    return NextResponse.json(
      { message: "Purchase recorded successfully", purchase },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: "Error recording purchase", error: error.message },
      { status: 500 }
    );
  }
}
