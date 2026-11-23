// Returns: items go back to stock, the customer is refunded against their
// debt, and you can't return more than was sold.
import { describe, it, expect } from "vitest";
import { call, loginAs } from "./helpers";
import { makeProduct, makeCustomer } from "./fixtures";
import Product from "@/core/products/models/Products";
import Customer from "@/core/customers/models/Customers";
import { POST as createOrder } from "@/app/api/orders/[id]/route";
import { POST as createReturn } from "@/app/api/orders/[id]/returns/route";

describe("returning items", () => {
  it("restocks them, refunds the customer's debt, and caps at what was sold", async () => {
    const product = await makeProduct({ quantity: 20, price: 10, initialPrice: 6 });
    const customer = await makeCustomer();
    loginAs("owner");
    const order = (await call(createOrder, { params: { id: customer._id }, body: { products: [{ productId: product._id, price: 10, quantity: 5 }] } })).body.order;
    expect((await Product.findById(product._id)).quantity).toBe(15);
    expect((await Customer.findById(customer._id)).debt).toBe(50);

    const res = await call(createReturn, { params: { id: order._id }, body: { items: [{ productId: product._id, quantity: 2 }], reason: "damaged", restocked: true } });
    expect(res.status).toBeLessThan(300);
    expect((await Product.findById(product._id)).quantity).toBe(17);
    expect((await Customer.findById(customer._id)).debt).toBe(30);

    const tooMany = await call(createReturn, { params: { id: order._id }, body: { items: [{ productId: product._id, quantity: 4 }] } });
    expect(tooMany.status).toBe(400); // only 3 left to return
    expect(tooMany.body.error).toBe(`Only 3 of "${product.name}" can still be returned`);
    expect((await Product.findById(product._id)).quantity).toBe(17);
  });

  it("can refund without putting the items back in stock", async () => {
    const product = await makeProduct({ quantity: 10, price: 10 });
    const customer = await makeCustomer();
    loginAs("owner");
    const order = (await call(createOrder, { params: { id: customer._id }, body: { products: [{ productId: product._id, price: 10, quantity: 3 }] } })).body.order;
    await call(createReturn, { params: { id: order._id }, body: { items: [{ productId: product._id, quantity: 1 }], restocked: false } });
    expect((await Product.findById(product._id)).quantity).toBe(7);
    expect((await Customer.findById(customer._id)).debt).toBe(20);
  });
});
