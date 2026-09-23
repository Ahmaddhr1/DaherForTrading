import { connectToDB } from "@/lib/connectDb";
import Customer from "@/models/Customers";
import Order from "@/models/Orders";
import Product from "@/models/Products";
import Category from "@/models/Category";
import Company from "@/models/Company";
import Purchase from "@/models/Purchase";
import Payment from "@/models/Payment";
import Disbursement from "@/models/Disbursement";
import StockAdjustment from "@/models/StockAdjustment";
import AppSettings from "@/models/AppSettings";

// Shared by the manual "Download Backup" button (/api/settings/backup) and
// the automated/scheduled backup (/api/cron/backup) so both always produce
// the exact same shape of file. Deliberately excludes the Admin collection
// - password hashes should never leave the server in a backup file.
export async function generateBackupPayload() {
  await connectToDB();

  const [
    customers,
    orders,
    products,
    categories,
    companies,
    purchases,
    payments,
    disbursements,
    stockAdjustments,
    appSettings,
  ] = await Promise.all([
    Customer.find({}).lean(),
    Order.find({}).lean(),
    Product.find({}).lean(),
    Category.find({}).lean(),
    Company.find({}).lean(),
    Purchase.find({}).lean(),
    Payment.find({}).lean(),
    Disbursement.find({}).lean(),
    StockAdjustment.find({}).lean(),
    AppSettings.find({}).lean(),
  ]);

  const generatedAt = new Date().toISOString();
  const backup = {
    generatedAt,
    collections: {
      customers,
      orders,
      products,
      categories,
      companies,
      purchases,
      payments,
      disbursements,
      stockAdjustments,
      appSettings,
    },
  };

  return {
    generatedAt,
    filename: `daherfortrading-backup-${generatedAt.slice(0, 10)}.json`,
    json: JSON.stringify(backup, null, 2),
  };
}
