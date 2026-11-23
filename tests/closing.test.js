// Daily closing: cash in minus cash out = what should be in the drawer.
import { describe, it, expect } from "vitest";
import { call, loginAs } from "./helpers";
import { makeProduct, makeCustomer, makeCompany } from "./fixtures";
import { POST as createOrder } from "@/app/api/orders/[id]/route";
import { POST as manualPayment } from "@/app/api/payments/route";
import { POST as recordPurchase } from "@/app/api/companies/[id]/purchases/route";
import { PUT as markPurchasePaid } from "@/app/api/purchases/[id]/markpaid/route";
import { POST as createDisbursement } from "@/app/api/disbursements/route";
import { GET as closing } from "@/app/api/reports/closing/route";

describe("daily closing", () => {
  it("adds up today's money in and out", async () => {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const end = new Date(); end.setHours(23, 59, 59, 999);
    const before = (await call(closing, { query: { start: start.toISOString(), end: end.toISOString() } })).body;

    const product = await makeProduct({ quantity: 100, price: 20, initialPrice: 10 });
    const customer = await makeCustomer();
    const company = await makeCompany();
    loginAs("owner");
    await call(createOrder, { params: { id: customer._id }, body: { products: [{ productId: product._id, price: 20, quantity: 10 }] } }); // $200 sale
    await call(manualPayment, { body: { customerId: customer._id, amount: 150 } }); // $150 collected
    const p = await call(recordPurchase, { params: { id: company._id }, body: { productId: product._id, unitPrice: 10, quantity: 6 } }); // $60 on credit
    await call(markPurchasePaid, { params: { id: p.body.purchase._id }, method: "PUT" }); // $60 paid out
    await call(createDisbursement, { body: { description: "Fuel", amount: 25, category: "Transport" } }); // $25 expense

    const res = await call(closing, { query: { start: start.toISOString(), end: end.toISOString() } });
    expect(res.status).toBe(200);
    const d = res.body;
    expect(d.collected - before.collected).toBe(150);
    expect(d.paidToSuppliers - before.paidToSuppliers).toBe(60);
    expect(d.expensesTotal - before.expensesTotal).toBe(25);
    expect(d.netCash - before.netCash).toBe(65); // 150 - 60 - 25
    expect(d.sales.total - before.sales.total).toBe(200);
  });
});
