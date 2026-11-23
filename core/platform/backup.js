import { connectToDB } from "@/core/platform/connectDb";
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
    supplierPayments,
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
    SupplierPayment.find({}).lean(),
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
      supplierPayments,
      disbursements,
      stockAdjustments,
      appSettings,
    },
  };

  return {
    generatedAt,
    filename: `invento-backup-${generatedAt.slice(0, 10)}.json`,
    json: JSON.stringify(backup, null, 2),
  };
}
