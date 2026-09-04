import { connectToDB } from "@/lib/connectDb";
import Category from "@/models/Category";
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    await connectToDB();

    const body = await req.json();
    const { name } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Name and image are required." },
        { status: 400 }
      );
    }

    const existing = await Category.findOne({ name });
    if (existing) {
      return NextResponse.json(
        { error: "Category already exists." },
        { status: 409 }
      );
    }

    const category = await Category.create({ name});

    return NextResponse.json(category, { status: 201 });
  } catch (err) {
    console.error("Category creation error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function GET(req) {
  try {
    await connectToDB();

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 20;
    const search = searchParams.get("search")?.toLowerCase() || "";
    const all = searchParams.get("all") === "true";

    const query = search ? { name: { $regex: new RegExp(search, "i") } } : {};

    // Some callers (e.g. dropdowns) need the full unpaginated list.
    if (all) {
      const categories = await Category.find(query).sort({ createdAt: -1 });
      return NextResponse.json(categories, {
        status: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET",
        },
      });
    }

    const skip = (page - 1) * limit;
    const total = await Category.countDocuments(query);
    const categories = await Category.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return NextResponse.json(
      {
        categories,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      },
      {
        status: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET",
        },
      }
    );
  } catch (err) {
    console.error("Error fetching categories:", err);
    return NextResponse.json(
      { error: "Failed to fetch categories" },
      {
        status: 500,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET",
        },
      }
    );
  }
}
