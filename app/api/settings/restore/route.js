import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDB } from "@/lib/connectDb";
import Customer from "@/models/Customers";
import Order from "@/models/Orders";
import Product from "@/models/Products";
import Category from "@/models/Category";
import Company from "@/models/Company";
import Purchase from "@/models/Purchase";
import Payment from "@/models/Payment";
import Disbursement from "@/models/Disbursement";

// Deliberately excludes Admin and LoginAttempt - restoring business data
// must never touch login credentials or rate-limit state.
const COLLECTION_MODELS = {
  customers: Customer,
  orders: Order,
  products: Product,
  categories: Category,
  companies: Company,
  purchases: Purchase,
  payments: Payment,
  disbursements: Disbursement,
};

export async function POST(req) {
  await connectToDB();

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON file" }, { status: 400 });
  }

  const collections = body?.collections;
  if (!collections || typeof collections !== "object") {
    return NextResponse.json(
      { error: "This doesn't look like a valid backup file" },
      { status: 400 }
    );
  }

  const recognizedKeys = Object.keys(COLLECTION_MODELS).filter((key) =>
    Array.isArray(collections[key])
  );

  if (recognizedKeys.length === 0) {
    return NextResponse.json(
      { error: "Backup file has no recognizable data to restore" },
      { status: 400 }
    );
  }

  const summary = {};
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      for (const key of recognizedKeys) {
        const Model = COLLECTION_MODELS[key];
        const docs = collections[key];

        await Model.deleteMany({}, { session });
        if (docs.length > 0) {
          await Model.insertMany(docs, { session, ordered: true, timestamps: false });
        }
        summary[key] = docs.length;
      }
    });
  } catch (error) {
    console.error("Restore failed:", error);
    return NextResponse.json(
      { message: "Restore failed - no data was changed", error: error.message },
      { status: 500 }
    );
  } finally {
    await session.endSession();
  }

  return NextResponse.json({ message: "Backup restored successfully", summary });
}
