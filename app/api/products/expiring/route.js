import { connectToDB } from "@/lib/connectDb";
import Product from "@/models/Products";
import Purchase from "@/models/Purchase";
import AppSettings from "@/models/AppSettings";
import { NextResponse } from "next/server";
import { batchesInStock } from "@/lib/batches";

// Powers the dashboard's expiry alert. Two sources:
// - batches: purchases with an expiry date that are still in stock (see
//   lib/batches.js - earliest expiry is assumed to sell first);
// - products whose stock has no dated batches but have the product-level
//   expiry date set.
// An entry shows once today is inside the product's alert window
// (expiry minus the product's expiryAlertDays, or the default from
// Settings) or it has expired. Closest expiry first, paginated.
// GET /api/products/expiring?page=1&limit=5
const DAY_MS = 86400000;

export async function GET(req) {
  await connectToDB();
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page"), 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit"), 10) || 5));

    const settings = await AppSettings.findOne({ key: "app" }).select("expiryAlertDays").lean();
    const defaultDays = settings?.expiryAlertDays || 30;
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const datedBatches = await Purchase.find({ expiryDate: { $ne: null } })
      .select("product quantity expiryDate createdAt")
      .lean();
    const byProduct = new Map();
    for (const b of datedBatches) {
      const k = String(b.product);
      if (!byProduct.has(k)) byProduct.set(k, []);
      byProduct.get(k).push(b);
    }

    const products = await Product.find({
      $or: [{ _id: { $in: [...byProduct.keys()] } }, { expiryDate: { $ne: null } }],
    })
      .select("name quantity unit expiryDate expiryAlertDays category")
      .populate({ path: "category", select: "name" })
      .lean();

    const entries = [];
    for (const p of products) {
      const alertDays = p.expiryAlertDays || defaultDays;
      const due = (expiry) => new Date(expiry).getTime() - alertDays * DAY_MS <= endOfToday.getTime();
      const batches = byProduct.get(String(p._id));
      if (batches?.length) {
        for (const b of batchesInStock(p.quantity, batches)) {
          if (!due(b.expiryDate)) continue;
          entries.push({
            _id: b._id,
            productId: p._id,
            name: p.name,
            unit: p.unit,
            category: p.category,
            expiryDate: b.expiryDate,
            quantity: b.remaining,
            batchDate: b.createdAt,
            alertDays,
          });
        }
      } else if (p.expiryDate && p.quantity > 0 && due(p.expiryDate)) {
        entries.push({
          _id: p._id,
          productId: p._id,
          name: p.name,
          unit: p.unit,
          category: p.category,
          expiryDate: p.expiryDate,
          quantity: p.quantity,
          batchDate: null,
          alertDays,
        });
      }
    }

    entries.sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate));
    const total = entries.length;
    return NextResponse.json(
      {
        products: entries.slice((page - 1) * limit, page * limit),
        total,
        page,
        totalPages: Math.max(1, Math.ceil(total / limit)),
        days: defaultDays,
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: "Error fetching expiring products", error: error.message },
      { status: 500 }
    );
  }
}
