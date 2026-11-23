// Orders: stock, customer debt, totals, drafts and server-side pricing.
import { describe, it, expect } from "vitest";
import { call, loginAs, money } from "./helpers";
import { makeProduct, makeCustomer } from "./fixtures";
import Product from "@/models/Products";
import Customer from "@/models/Customers";
import Order from "@/models/Orders";
import { POST as createOrder } from "@/app/api/orders/[id]/route";
import { PUT as finalizeOrder } from "@/app/api/orders/[id]/finalize/route";

const stockOf = async (id) => (await Product.findById(id)).quantity;
const debtOf = async (id) => (await Customer.findById(id)).debt;

describe("creating an order", () => {
  it("takes the items out of stock and adds the total to the customer's debt", async () => {
    const product = await makeProduct({ quantity: 50, price: 10, initialPrice: 6 });
    const customer = await makeCustomer();
    loginAs("owner");
    const res = await call(createOrder, {
      params: { id: customer._id },
      body: { products: [{ productId: product._id, price: 10, quantity: 3 }], taxRate: 0 },
    });
    expect(res.status).toBe(201);
    const order = res.body.order;
    expect(order.status).toBe("pending");
    expect(order.total).toBe(30);
    expect(order.remainingBalance).toBe(30);
    expect(order.profit).toBe(12); // (10 - 6) x 3
    expect(await stockOf(product._id)).toBe(47);
    expect(await debtOf(customer._id)).toBe(30);
  });

  it("applies the discount before tax, and never counts tax as profit", async () => {
    const product = await makeProduct({ price: 10, initialPrice: 6 });
    const customer = await makeCustomer();
    loginAs("owner");
    const res = await call(createOrder, {
      params: { id: customer._id },
      body: { products: [{ productId: product._id, price: 10, quantity: 2, discount: 5 }], taxRate: 11 },
    });
    expect(res.status).toBe(201);
    const o = res.body.order;
    expect(o.discountTotal).toBe(5);
    expect(money(o.taxAmount)).toBe(1.65); // 11% of (20 - 5)
    expect(money(o.total)).toBe(16.65);
    expect(o.profit).toBe(3); // (10 - 6) x 2 - 5 discount
  });

  it("refuses an order bigger than the stock, and changes nothing", async () => {
    const product = await makeProduct({ quantity: 2 });
    const customer = await makeCustomer();
    loginAs("owner");
    const res = await call(createOrder, {
      params: { id: customer._id },
      body: { products: [{ productId: product._id, price: 10, quantity: 5 }] },
    });
    expect(res.status).toBe(400);
    expect(await stockOf(product._id)).toBe(2);
    expect(await debtOf(customer._id)).toBe(0);
    expect(await Order.countDocuments({ customer: customer._id })).toBe(0);
  });

  it("reprices an employee's order from the catalog instead of trusting their price", async () => {
    const product = await makeProduct({ price: 10, priceWholesale: 9 });
    const customer = await makeCustomer({ priceTier: 2 });
    loginAs("employee", { canCreateOrders: true });
    const res = await call(createOrder, {
      params: { id: customer._id },
      body: { products: [{ productId: product._id, price: 1, quantity: 1 }] },
    });
    expect(res.status).toBe(201);
    expect(res.body.order.products[0].price).toBe(9); // the customer's tier price, not the submitted $1
  });
});

describe("drafts", () => {
  it("don't touch stock or debt until they are finalized", async () => {
    const product = await makeProduct({ quantity: 10, price: 10 });
    const customer = await makeCustomer();
    loginAs("owner");
    const res = await call(createOrder, {
      params: { id: customer._id },
      body: { products: [{ productId: product._id, price: 10, quantity: 4 }], asDraft: true },
    });
    expect(res.status).toBe(201);
    expect(res.body.order.status).toBe("draft");
    expect(await stockOf(product._id)).toBe(10);
    expect(await debtOf(customer._id)).toBe(0);

    const fin = await call(finalizeOrder, { params: { id: res.body.order._id }, method: "PUT", body: {} });
    expect(fin.status).toBe(200);
    expect((await Order.findById(res.body.order._id)).status).toBe("pending");
    expect(await stockOf(product._id)).toBe(6);
    expect(await debtOf(customer._id)).toBe(40);
  });
});
