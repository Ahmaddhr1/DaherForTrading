// Supplier purchases: stock comes in, what we owe the supplier goes up, and
// paying it creates a supplier payment.
import { describe, it, expect } from "vitest";
import { call, loginAs } from "./helpers";
import { makeProduct, makeCompany } from "./fixtures";
import Product from "@/core/products/models/Products";
import Company from "@/core/suppliers/models/Company";
import Purchase from "@/core/suppliers/models/Purchase";
import SupplierPayment from "@/core/payments/models/SupplierPayment";
import { POST as recordPurchase } from "@/app/api/companies/[id]/purchases/route";
import { PUT as markPurchasePaid } from "@/app/api/purchases/[id]/markpaid/route";

describe("recording a purchase", () => {
  it("on credit: adds stock and adds to what we owe the supplier; paying it clears the debt", async () => {
    const product = await makeProduct({ quantity: 5 });
    const company = await makeCompany();
    loginAs("owner");
    const res = await call(recordPurchase, {
      params: { id: company._id },
      body: { productId: product._id, unitPrice: 5, quantity: 20, paid: false },
    });
    expect(res.status).toBe(201);
    expect((await Product.findById(product._id)).quantity).toBe(25);
    expect((await Company.findById(company._id)).debt).toBe(100);

    const purchaseId = res.body.purchase._id;
    const paid = await call(markPurchasePaid, { params: { id: purchaseId }, method: "PUT" });
    expect(paid.status).toBe(200);
    expect((await Purchase.findById(purchaseId)).paid).toBe(true);
    expect((await Company.findById(company._id)).debt).toBe(0);
    const sp = await SupplierPayment.find({ purchase: purchaseId });
    expect(sp).toHaveLength(1);
    expect(sp[0]).toMatchObject({ amount: 100, previousDebt: 100, newDebt: 0 });
  });

  it("rejects a purchase without a quantity, with the same message as before", async () => {
    const product = await makeProduct();
    const company = await makeCompany();
    loginAs("owner");
    const res = await call(recordPurchase, { params: { id: company._id }, body: { productId: product._id, unitPrice: 5 } });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ message: "Product, unit price and quantity are required" });
  });

  it("paid upfront: adds stock but never adds to the supplier's debt", async () => {
    const product = await makeProduct({ quantity: 0 });
    const company = await makeCompany();
    loginAs("owner");
    const res = await call(recordPurchase, {
      params: { id: company._id },
      body: { productId: product._id, unitPrice: 4, quantity: 10, paid: true },
    });
    expect(res.status).toBe(201);
    expect((await Product.findById(product._id)).quantity).toBe(10);
    expect((await Company.findById(company._id)).debt).toBe(0);
  });
});
