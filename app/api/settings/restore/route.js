import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDB } from "@/core/platform/connectDb";
import { getUserFromCookie } from "@/core/platform/auth";
import { logActivity } from "@/core/audit/activityLog";
import { extraChange } from "@/core/audit/audit";
import Customer from "@/core/customers/models/Customers";
import Order from "@/core/orders/models/Orders";
import Product from "@/core/products/models/Products";
import Category from "@/core/products/models/Category";
import Company from "@/core/suppliers/models/Company";
import Purchase from "@/core/suppliers/models/Purchase";
import Payment from "@/core/payments/models/Payment";
import SupplierPayment from "@/core/payments/models/SupplierPayment";
import Disbursement from "@/core/expenses/models/Disbursement";
import StockAdjustment from "@/core/products/models/StockAdjustment";
import AppSettings from "@/core/settings/models/AppSettings";

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
  supplierPayments: SupplierPayment,
  disbursements: Disbursement,
  stockAdjustments: StockAdjustment,
  appSettings: AppSettings,
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

    // Written after the restore so it survives a backup that replaces the
    // activity log itself.
    await logActivity({
      admin: await getUserFromCookie(),
      action: "settings.restore",
      entityType: "Settings",
      entityLabel: "Backup restore",
      summary: `Restored a backup (${Object.entries(summary)
        .map(([key, count]) => `${count} ${key}`)
        .join(", ")})`,
      changes: Object.entries(summary).map(([key, count]) =>
        extraChange(`restore.${key}`, `Restored ${key}`, null, count, "number")
      ),
    });

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
