// Permissions are enforced on the server, not just hidden in the UI.
import { describe, it, expect } from "vitest";
import { call, loginAs } from "./helpers";
import { makeProduct, makeCustomer, makeCompany } from "./fixtures";
import Product from "@/core/products/models/Products";
import { POST as createOrder } from "@/app/api/orders/[id]/route";
import { POST as manualPayment } from "@/app/api/payments/route";
import { POST as recordPurchase } from "@/app/api/companies/[id]/purchases/route";
import { POST as createProduct } from "@/app/api/products/create/route";
import { POST as createDisbursement } from "@/app/api/disbursements/route";

describe("permissions", () => {
  it("block actions an employee wasn't given, and anyone logged out", async () => {
    const product = await makeProduct({ quantity: 10 });
    const customer = await makeCustomer();
    const company = await makeCompany();
    const order = { params: { id: customer._id }, body: { products: [{ productId: product._id, price: 10, quantity: 1 }] } };

    for (const who of [["employee", {}], [null]]) {
      loginAs(...who);
      expect((await call(createOrder, order)).status).toBe(403);
      expect((await call(manualPayment, { body: { customerId: customer._id, amount: 5 } })).status).toBe(403);
      expect((await call(recordPurchase, { params: { id: company._id }, body: { productId: product._id, unitPrice: 1, quantity: 1 } })).status).toBe(403);
      expect((await call(createProduct, { body: { name: "x", price: 1, initialPrice: 0, profit: 1 } })).status).toBe(403);
      expect((await call(createDisbursement, { body: { description: "x", amount: 1, category: "Other" } })).status).toBe(403);
    }
    expect((await Product.findById(product._id)).quantity).toBe(10);
  });

  it("allow exactly the actions that were granted", async () => {
    const product = await makeProduct({ quantity: 10 });
    const customer = await makeCustomer();
    loginAs("employee", { canCreateOrders: true });
    const ok = await call(createOrder, { params: { id: customer._id }, body: { products: [{ productId: product._id, price: 10, quantity: 1 }] } });
    expect(ok.status).toBe(201);
    expect((await call(manualPayment, { body: { customerId: customer._id, amount: 5 } })).status).toBe(403);
  });
});
