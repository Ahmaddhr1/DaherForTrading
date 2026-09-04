import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/connectDb";
import Order from "@/models/Orders";
import Purchase from "@/models/Purchase";

const DATE_FORMATS = {
  day: "%Y-%m-%d",
  month: "%Y-%m",
  year: "%Y",
};

export async function GET(req) {
  try {
    await connectToDB();

    const { searchParams } = new URL(req.url);
    const granularity = ["day", "month", "year"].includes(searchParams.get("granularity"))
      ? searchParams.get("granularity")
      : "month";
    const limit = Math.min(parseInt(searchParams.get("limit")) || 12, 60);

    const dateFormat = DATE_FORMATS[granularity];

    const [salesAgg, purchasesAgg] = await Promise.all([
      Order.aggregate([
        {
          $group: {
            _id: { $dateToString: { format: dateFormat, date: "$createdAt" } },
            salesTotal: { $sum: "$total" },
            ordersCount: { $sum: 1 },
          },
        },
      ]),
      Purchase.aggregate([
        {
          $group: {
            _id: { $dateToString: { format: dateFormat, date: "$createdAt" } },
            purchasesTotal: { $sum: "$total" },
          },
        },
      ]),
    ]);

    const map = new Map();
    salesAgg.forEach((s) => {
      map.set(s._id, {
        period: s._id,
        salesTotal: s.salesTotal,
        ordersCount: s.ordersCount,
        purchasesTotal: 0,
      });
    });
    purchasesAgg.forEach((p) => {
      const existing = map.get(p._id) || {
        period: p._id,
        salesTotal: 0,
        ordersCount: 0,
        purchasesTotal: 0,
      };
      existing.purchasesTotal = p.purchasesTotal;
      map.set(p._id, existing);
    });

    const merged = Array.from(map.values())
      .sort((a, b) => (a.period > b.period ? 1 : -1))
      .map((item) => ({
        ...item,
        profit: item.salesTotal - item.purchasesTotal,
      }));

    const trends = merged.slice(-limit);

    return NextResponse.json({ success: true, granularity, trends });
  } catch (error) {
    console.error("Error fetching dashboard trends:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch trends" },
      { status: 500 }
    );
  }
}
