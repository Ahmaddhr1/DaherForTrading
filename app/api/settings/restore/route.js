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

  const runRestore = async (session) => {
    const summary = {};
    for (const key of recognizedKeys) {
      const Model = COLLECTION_MODELS[key];
      const docs = collections[key];

      await Model.deleteMany({}, session ? { session } : undefined);
      if (docs.length > 0) {
        await Model.insertMany(docs, {
          ...(session ? { session } : {}),
          ordered: true,
          timestamps: false,
        });
      }
      summary[key] = docs.length;
    }
    return summary;
  };

  const session = await mongoose.startSession();
  try {
    let summary;
    try {
      await session.withTransaction(async () => {
        summary = await runRestore(session);
      });
    } catch (txError) {
      // Self-hosted, non-replica-set MongoDB deployments don't support
      // transactions at all (every write throws immediately), so a backup
      // taken from an Atlas/replica-set deployment can never be restored
      // there via withTransaction. Fall back to a best-effort sequential
      // restore instead of failing the import outright.
      const transactionsUnsupported =
        txError?.code === 20 ||
        /Transaction numbers are only allowed on a replica set member or mongos/i.test(
          txError?.message || ""
        );
      if (!transactionsUnsupported) throw txError;
      summary = await runRestore(null);
    }

    return NextResponse.json({ message: "Backup restored successfully", summary });
  } catch (error) {
    console.error("Restore failed:", error);
    return NextResponse.json(
      { message: "Restore failed - data may be incomplete", error: error.message },
      { status: 500 }
    );
  } finally {
    await session.endSession();
  }
}
