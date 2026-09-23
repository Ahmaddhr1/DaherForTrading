// // One-off: wipes every collection EXCEPT Admin, then reseeds Product with
// // the exact list Ahmad supplied (2026-09-23). Everything else - Customers,
// // Orders, Categories, Companies, Purchases, Payments, Disbursements,
// // ActivityLog, LoginAttempt, StockAdjustment, AppSettings (business
// // settings reset to defaults), and the unused Account/SupplierPayment
// // collections - is emptied and NOT reseeded.
// //
// // The reseeded products reference category "6a9b44cb8014d2801ba57ecb" -
// // since Categories are being wiped too, that category document will no
// // longer exist. This was asked for as-is (Ahmad only gave product data,
// // not a category to go with it) - the app treats a missing referenced
// // category as simply uncategorized, it won't error, but if you want that
// // category to actually exist again, say so and it's a one-line addition.
// //
// // THIS DELETES REAL DATA AND CANNOT BE UNDONE - no backup is taken (opted
// // out when this was written). Run with --confirm to actually execute; run
// // with no arguments first to see a dry-run of what would happen.
// //
// // Usage:
// //   node scripts/reset-database.mjs            (dry run - shows counts, deletes nothing)
// //   node scripts/reset-database.mjs --confirm   (actually deletes + reseeds)

// import mongoose from "mongoose";
// import dotenv from "dotenv";

// dotenv.config();

// const CONFIRM = process.argv.includes("--confirm");

// // --- Schemas (kept inline and self-contained, same convention as the
// // other scripts/*.mjs files in this project - these don't import from
// // @/models since standalone scripts run outside Next's module resolution).

// const adminSchema = new mongoose.Schema(
//   {
//     adminname: { type: String, required: true, unique: true },
//     password: { type: String, required: true },
//     role: { type: String, enum: ["owner", "employee"], default: "employee" },
//     active: { type: Boolean, default: true },
//   },
//   { timestamps: true }
// );

// const productSchema = new mongoose.Schema(
//   {
//     name: { type: String, required: true },
//     quantity: { type: Number, default: 0 },
//     price: { type: Number },
//     initialPrice: { type: Number },
//     profit: { type: Number },
//     category: { type: mongoose.Types.ObjectId, ref: "Category" },
//     nbOfOrders: { type: Number, default: 0 },
//     unit: { type: String, default: "pcs", trim: true },
//     lowStockThreshold: { type: Number, default: 5, min: 0 },
//     defaultSupplier: { type: mongoose.Types.ObjectId, ref: "Company", default: null },
//   },
//   { timestamps: true }
// );

// const categorySchema = new mongoose.Schema(
//   { name: { type: String, required: true }, products: { type: [mongoose.Types.ObjectId], ref: "Product", default: [] } },
//   { timestamps: true }
// );

// const companySchema = new mongoose.Schema(
//   {
//     name: { type: String, required: true, unique: true },
//     phoneNumber: { type: String },
//     address: { type: String },
//     debt: { type: Number, default: 0 },
//     purchases: { type: [mongoose.Types.ObjectId], ref: "Purchase", default: [] },
//   },
//   { timestamps: true }
// );

// const customerSchema = new mongoose.Schema(
//   {
//     fullName: { type: String, required: true },
//     phoneNumber: { type: Number, unique: true, required: true },
//     debt: { type: Number, default: 0 },
//     orders: { type: [mongoose.Types.ObjectId], ref: "Order", default: [] },
//   },
//   { timestamps: true }
// );

// const orderSchema = new mongoose.Schema(
//   {
//     customer: { type: mongoose.Types.ObjectId, ref: "Customer", required: true },
//     products: [
//       {
//         productId: { type: mongoose.Types.ObjectId, ref: "Product", required: true },
//         name: { type: String, required: true },
//         quantity: { type: Number, required: true },
//         price: { type: Number, required: true },
//         discount: { type: Number, default: 0 },
//       },
//     ],
//     total: { type: Number, required: true },
//     discountTotal: { type: Number, default: 0 },
//     taxRate: { type: Number, default: 0 },
//     taxAmount: { type: Number, default: 0 },
//     status: { type: String, enum: ["draft", "pending", "paid", "partiallyPaid"], default: "pending" },
//     amountpaid: { type: Number },
//     remainingBalance: { type: Number },
//     profit: { type: Number },
//   },
//   { timestamps: true }
// );

// const purchaseSchema = new mongoose.Schema(
//   {
//     company: { type: mongoose.Types.ObjectId, ref: "Company", required: true },
//     product: { type: mongoose.Types.ObjectId, ref: "Product", required: true },
//     productName: { type: String, required: true },
//     unitPrice: { type: Number, required: true },
//     quantity: { type: Number, required: true },
//     discount: { type: Number, default: 0 },
//     taxRate: { type: Number, default: 0 },
//     taxAmount: { type: Number, default: 0 },
//     total: { type: Number, required: true },
//     paid: { type: Boolean, default: false },
//   },
//   { timestamps: true }
// );

// const paymentSchema = new mongoose.Schema(
//   {
//     customer: { type: mongoose.Types.ObjectId, ref: "Customer", required: true },
//     amount: { type: Number, required: true },
//     previousDebt: { type: Number, required: true },
//     newDebt: { type: Number, required: true },
//   },
//   { timestamps: true }
// );

// const disbursementSchema = new mongoose.Schema(
//   {
//     description: { type: String, required: true },
//     amount: { type: Number, required: true },
//     category: {
//       type: String,
//       enum: ["Salaries", "Rent", "Utilities", "Maintenance", "Transport", "Other"],
//       default: "Other",
//     },
//   },
//   { timestamps: true }
// );

// const activityLogSchema = new mongoose.Schema(
//   {
//     admin: { type: mongoose.Types.ObjectId, ref: "Admin", required: true },
//     adminName: { type: String, required: true },
//     action: { type: String, required: true },
//     entityType: {
//       type: String,
//       enum: ["Order", "Payment", "Product", "Purchase", "Disbursement", "Customer", "Company", "Settings"],
//       required: true,
//     },
//     entityId: { type: mongoose.Types.ObjectId },
//     summary: { type: String, required: true },
//     metadata: { type: mongoose.Schema.Types.Mixed },
//   },
//   { timestamps: true }
// );

// const loginAttemptSchema = new mongoose.Schema({
//   key: { type: String, required: true, index: true },
//   createdAt: { type: Date, default: Date.now },
// });

// const stockAdjustmentSchema = new mongoose.Schema(
//   {
//     product: { type: mongoose.Types.ObjectId, ref: "Product", required: true },
//     type: { type: String, enum: ["damaged", "lost", "expired", "correction", "other"], required: true },
//     quantityChange: { type: Number, required: true },
//     quantityBefore: { type: Number, required: true },
//     quantityAfter: { type: Number, required: true },
//     reason: { type: String, trim: true },
//     admin: { type: mongoose.Types.ObjectId, ref: "Admin" },
//     adminName: { type: String },
//   },
//   { timestamps: true }
// );

// const appSettingsSchema = new mongoose.Schema(
//   {
//     key: { type: String, default: "app", unique: true },
//     dollarRate: { type: Number, default: 90000, min: 0 },
//     taxRate: { type: Number, default: 0, min: 0, max: 100 },
//     lastScheduledBackupAt: { type: Date, default: null },
//     lastScheduledBackupStatus: { type: String, enum: ["success", "failed", null], default: null },
//     lastScheduledBackupError: { type: String, default: null },
//   },
//   { timestamps: true }
// );

// const accountSchema = new mongoose.Schema(
//   {
//     name: { type: String, required: true, unique: true, trim: true },
//     type: { type: String, enum: ["cash", "bank"], default: "cash" },
//     openingBalance: { type: Number, default: 0 },
//     active: { type: Boolean, default: true },
//     notes: { type: String, trim: true },
//   },
//   { timestamps: true }
// );

// const supplierPaymentSchema = new mongoose.Schema(
//   {
//     company: { type: mongoose.Types.ObjectId, ref: "Company", required: true },
//     amount: { type: Number, required: true },
//     previousDebt: { type: Number, required: true },
//     newDebt: { type: Number, required: true },
//     account: { type: mongoose.Types.ObjectId, ref: "Account", required: true },
//   },
//   { timestamps: true }
// );

// // --- The exact products Ahmad supplied, unchanged (any field the current
// // schema has that this list doesn't mention - unit, lowStockThreshold,
// // defaultSupplier - gets that field's normal schema default).
// const PRODUCTS = [
//   { "_id": "6a9f1505a4a82ff14b4f1715", "name": "Tannourine 2L", "quantity": 0, "price": 1.86, "initialPrice": 1.61, "profit": 0.25, "category": "6a9b44cb8014d2801ba57ecb", "nbOfOrders": 1, "createdAt": "2026-09-07T19:48:21.391Z", "updatedAt": "2026-09-07T19:53:47.979Z" },
//   { "_id": "6a9f1505a4a82ff14b4f1716", "name": "Tannourine 0.5L", "quantity": 0, "price": 1.86, "initialPrice": 1.61, "profit": 0.25, "category": "6a9b44cb8014d2801ba57ecb", "nbOfOrders": 1, "createdAt": "2026-09-07T19:48:21.392Z", "updatedAt": "2026-09-07T19:53:47.979Z" },
//   { "_id": "6a9f1505a4a82ff14b4f1717", "name": "Tannourine 1.5L", "quantity": 0, "price": 1.66, "initialPrice": 1.39, "profit": 0.27, "category": "6a9b44cb8014d2801ba57ecb", "nbOfOrders": 0, "createdAt": "2026-09-07T19:48:21.392Z", "updatedAt": "2026-09-07T19:48:21.392Z" },
//   { "_id": "6a9f1505a4a82ff14b4f1718", "name": "Tannourine 0.33L", "quantity": 0, "price": 1.56, "initialPrice": 1.332, "profit": 0.22799999999999998, "category": "6a9b44cb8014d2801ba57ecb", "nbOfOrders": 0, "createdAt": "2026-09-07T19:48:21.392Z", "updatedAt": "2026-09-07T19:48:21.392Z" },
//   { "_id": "6a9f1505a4a82ff14b4f1719", "name": "Tannourine VIA Spark 330ml *6", "quantity": 0, "price": 3.25, "initialPrice": 2.6, "profit": 0.6499999999999999, "category": "6a9b44cb8014d2801ba57ecb", "nbOfOrders": 0, "createdAt": "2026-09-07T19:48:21.392Z", "updatedAt": "2026-09-07T19:48:21.392Z" },
//   { "_id": "6a9f1505a4a82ff14b4f171a", "name": "Nestle 2L", "quantity": 0, "price": 2.075, "initialPrice": 1.95, "profit": 0.12500000000000022, "category": "6a9b44cb8014d2801ba57ecb", "nbOfOrders": 0, "createdAt": "2026-09-07T19:48:21.392Z", "updatedAt": "2026-09-07T19:48:21.392Z" },
//   { "_id": "6a9f1505a4a82ff14b4f171b", "name": "Nestle 0.6L", "quantity": 0, "price": 2.075, "initialPrice": 1.95, "profit": 0.12500000000000022, "category": "6a9b44cb8014d2801ba57ecb", "nbOfOrders": 0, "createdAt": "2026-09-07T19:48:21.392Z", "updatedAt": "2026-09-07T19:48:21.392Z" },
//   { "_id": "6a9f1505a4a82ff14b4f171c", "name": "Nestle 330ml", "quantity": 0, "price": 1.77, "initialPrice": 1.65, "profit": 0.1200000000000001, "category": "6a9b44cb8014d2801ba57ecb", "nbOfOrders": 0, "createdAt": "2026-09-07T19:48:21.392Z", "updatedAt": "2026-09-07T19:48:21.392Z" },
//   { "_id": "6a9f1505a4a82ff14b4f171d", "name": "Nestle 1.5L", "quantity": 0, "price": 1.665, "initialPrice": 1.565, "profit": 0.10000000000000009, "category": "6a9b44cb8014d2801ba57ecb", "nbOfOrders": 0, "createdAt": "2026-09-07T19:48:21.392Z", "updatedAt": "2026-09-07T19:48:21.392Z" },
//   { "_id": "6a9f1505a4a82ff14b4f171e", "name": "Sohat 0.5L", "quantity": 0, "price": 2.475, "initialPrice": 2.326, "profit": 0.14900000000000002, "category": "6a9b44cb8014d2801ba57ecb", "nbOfOrders": 0, "createdAt": "2026-09-07T19:48:21.392Z", "updatedAt": "2026-09-07T19:48:21.392Z" },
//   { "_id": "6a9f1505a4a82ff14b4f171f", "name": "Sohat 1.5L", "quantity": 0, "price": 2.425, "initialPrice": 2.28, "profit": 0.14500000000000002, "category": "6a9b44cb8014d2801ba57ecb", "nbOfOrders": 0, "createdAt": "2026-09-07T19:48:21.392Z", "updatedAt": "2026-09-07T19:48:21.392Z" },
//   { "_id": "6a9f1505a4a82ff14b4f1720", "name": "Sohat 0.15L", "quantity": 0, "price": 3.1, "initialPrice": 2.914, "profit": 0.18599999999999994, "category": "6a9b44cb8014d2801ba57ecb", "nbOfOrders": 0, "createdAt": "2026-09-07T19:48:21.392Z", "updatedAt": "2026-09-07T19:48:21.392Z" },
//   { "_id": "6a9f1505a4a82ff14b4f1721", "name": "Aliyah 2L", "quantity": 0, "price": 1.475, "initialPrice": 1.36, "profit": 0.11499999999999999, "category": "6a9b44cb8014d2801ba57ecb", "nbOfOrders": 0, "createdAt": "2026-09-07T19:48:21.392Z", "updatedAt": "2026-09-07T19:48:21.392Z" },
//   { "_id": "6a9f1505a4a82ff14b4f1722", "name": "Aliyah 0.5L", "quantity": 0, "price": 1.45, "initialPrice": 1.325, "profit": 0.125, "category": "6a9b44cb8014d2801ba57ecb", "nbOfOrders": 0, "createdAt": "2026-09-07T19:48:21.392Z", "updatedAt": "2026-09-07T19:48:21.392Z" },
//   { "_id": "6a9f1505a4a82ff14b4f1723", "name": "Aliyah 1.5L", "quantity": 0, "price": 1.375, "initialPrice": 1.27, "profit": 0.10499999999999998, "category": "6a9b44cb8014d2801ba57ecb", "nbOfOrders": 0, "createdAt": "2026-09-07T19:48:21.392Z", "updatedAt": "2026-09-07T19:48:21.392Z" },
//   { "_id": "6a9f1505a4a82ff14b4f1724", "name": "Aliyah 0.33L", "quantity": 0, "price": 1.35, "initialPrice": 1.24, "profit": 0.1100000000000001, "category": "6a9b44cb8014d2801ba57ecb", "nbOfOrders": 0, "createdAt": "2026-09-07T19:48:21.392Z", "updatedAt": "2026-09-07T19:48:21.392Z" },
//   { "_id": "6a9f1505a4a82ff14b4f1725", "name": "Rim 2L", "quantity": 0, "price": 1.9, "initialPrice": 1.76, "profit": 0.1399999999999999, "category": "6a9b44cb8014d2801ba57ecb", "nbOfOrders": 0, "createdAt": "2026-09-07T19:48:21.392Z", "updatedAt": "2026-09-07T19:48:21.392Z" },
//   { "_id": "6a9f1505a4a82ff14b4f1726", "name": "Rim 0.5L", "quantity": 0, "price": 1.9, "initialPrice": 1.76, "profit": 0.1399999999999999, "category": "6a9b44cb8014d2801ba57ecb", "nbOfOrders": 0, "createdAt": "2026-09-07T19:48:21.392Z", "updatedAt": "2026-09-07T19:48:21.392Z" },
//   { "_id": "6a9f1505a4a82ff14b4f1727", "name": "Rim 0.33L", "quantity": 0, "price": 1.575, "initialPrice": 1.475, "profit": 0.09999999999999987, "category": "6a9b44cb8014d2801ba57ecb", "nbOfOrders": 0, "createdAt": "2026-09-07T19:48:21.392Z", "updatedAt": "2026-09-07T19:48:21.392Z" },
//   { "_id": "6a9f1505a4a82ff14b4f1728", "name": "Berdawni 2L", "quantity": 0, "price": 1.5, "initialPrice": 1.36, "profit": 0.1399999999999999, "category": "6a9b44cb8014d2801ba57ecb", "nbOfOrders": 0, "createdAt": "2026-09-07T19:48:21.392Z", "updatedAt": "2026-09-07T19:48:21.392Z" },
//   { "_id": "6a9f1505a4a82ff14b4f1729", "name": "Berdawni 0.5L", "quantity": 0, "price": 1.45, "initialPrice": 1.325, "profit": 0.125, "category": "6a9b44cb8014d2801ba57ecb", "nbOfOrders": 0, "createdAt": "2026-09-07T19:48:21.392Z", "updatedAt": "2026-09-07T19:48:21.392Z" },
//   { "_id": "6a9f1505a4a82ff14b4f172a", "name": "Berdawni 0.33L", "quantity": 0, "price": 1.35, "initialPrice": 1.25, "profit": 0.10000000000000009, "category": "6a9b44cb8014d2801ba57ecb", "nbOfOrders": 0, "createdAt": "2026-09-07T19:48:21.392Z", "updatedAt": "2026-09-07T19:48:21.392Z" },
//   { "_id": "6a9f1505a4a82ff14b4f172b", "name": "Rim Fruit 330ml", "quantity": 0, "price": 4.25, "initialPrice": 4.13, "profit": 0.1200000000000001, "category": "6a9b44cb8014d2801ba57ecb", "nbOfOrders": 0, "createdAt": "2026-09-07T19:48:21.392Z", "updatedAt": "2026-09-07T19:48:21.392Z" },
//   { "_id": "6a9f1505a4a82ff14b4f172c", "name": "test", "quantity": 0, "price": 3, "initialPrice": 2, "profit": 1, "category": "6a9b44cb8014d2801ba57ecb", "nbOfOrders": 0, "createdAt": "2026-09-07T19:48:21.392Z", "updatedAt": "2026-09-07T19:48:21.392Z" },
// ];

// async function main() {
//   const uri = process.env.DATABASE_CONNECTION;
//   if (!uri) {
//     console.error("DATABASE_CONNECTION is not set (env var or .env file).");
//     process.exit(1);
//   }

//   await mongoose.connect(uri);
//   console.log("Connected.\n");

//   const Admin = mongoose.models.Admin || mongoose.model("Admin", adminSchema);
//   const Product = mongoose.models.Product || mongoose.model("Product", productSchema);
//   const Category = mongoose.models.Category || mongoose.model("Category", categorySchema);
//   const Company = mongoose.models.Company || mongoose.model("Company", companySchema);
//   const Customer = mongoose.models.Customer || mongoose.model("Customer", customerSchema);
//   const Order = mongoose.models.Order || mongoose.model("Order", orderSchema);
//   const Purchase = mongoose.models.Purchase || mongoose.model("Purchase", purchaseSchema);
//   const Payment = mongoose.models.Payment || mongoose.model("Payment", paymentSchema);
//   const Disbursement = mongoose.models.Disbursement || mongoose.model("Disbursement", disbursementSchema);
//   const ActivityLog = mongoose.models.ActivityLog || mongoose.model("ActivityLog", activityLogSchema);
//   const LoginAttempt = mongoose.models.LoginAttempt || mongoose.model("LoginAttempt", loginAttemptSchema);
//   const StockAdjustment = mongoose.models.StockAdjustment || mongoose.model("StockAdjustment", stockAdjustmentSchema);
//   const AppSettings = mongoose.models.AppSettings || mongoose.model("AppSettings", appSettingsSchema);
//   const Account = mongoose.models.Account || mongoose.model("Account", accountSchema);
//   const SupplierPayment = mongoose.models.SupplierPayment || mongoose.model("SupplierPayment", supplierPaymentSchema);

//   const COLLECTIONS_TO_WIPE = [
//     ["Product", Product],
//     ["Category", Category],
//     ["Company", Company],
//     ["Customer", Customer],
//     ["Order", Order],
//     ["Purchase", Purchase],
//     ["Payment", Payment],
//     ["Disbursement", Disbursement],
//     ["ActivityLog", ActivityLog],
//     ["LoginAttempt", LoginAttempt],
//     ["StockAdjustment", StockAdjustment],
//     ["AppSettings", AppSettings],
//     ["Account", Account],
//     ["SupplierPayment", SupplierPayment],
//   ];

//   const adminCount = await Admin.countDocuments();

//   console.log(`${CONFIRM ? "DELETING" : "[DRY RUN] Would delete"} from every collection except Admin:`);
//   for (const [label, Model] of COLLECTIONS_TO_WIPE) {
//     const count = await Model.countDocuments();
//     console.log(`  - ${label}: ${count} document(s)`);
//   }
//   console.log(`\nAdmin: ${adminCount} document(s) - NOT touched.`);
//   console.log(`\n${CONFIRM ? "Then inserting" : "Would then insert"} ${PRODUCTS.length} product(s) into Product.`);

//   if (!CONFIRM) {
//     console.log("\nNothing was deleted. Re-run with --confirm to actually do this - it cannot be undone.");
//     await mongoose.disconnect();
//     return;
//   }

//   console.log("\nDeleting...");
//   for (const [label, Model] of COLLECTIONS_TO_WIPE) {
//     const { deletedCount } = await Model.deleteMany({});
//     console.log(`  - ${label}: deleted ${deletedCount}`);
//   }

//   console.log("\nReseeding products...");
//   const inserted = await Product.insertMany(PRODUCTS, { timestamps: false });
//   console.log(`  - Product: inserted ${inserted.length}`);

//   console.log("\nDone. Admin accounts were left untouched.");
//   await mongoose.disconnect();
// }

// main().catch((err) => {
//   console.error("Script failed:", err.message);
//   process.exit(1);
// });
