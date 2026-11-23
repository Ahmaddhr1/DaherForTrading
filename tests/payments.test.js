// Customer payments: every payment lowers the debt exactly once and leaves
// exactly one Payment record behind.
import { describe, it, expect } from "vitest";
import { call, loginAs } from "./helpers";
import { makeProduct, makeCustomer } from "./fixtures";
import Customer from "@/models/Customers";
import Order from "@/models/Orders";
import Payment from "@/models/Payment";
import { POST as createOrder } from "@/app/api/orders/[id]/route";
import { PUT as payPart } from "@/app/api/orders/[id]/paritallypaid/route";
import { PUT as markPaid } from "@/app/api/orders/[id]/markpaid/route";
import { POST as manualPayment } from "@/app/api/payments/route";

async function orderOf(total) {
  const product = await makeProduct({ price: total, initialPrice: 0, quantity: 100 });
  const customer = await makeCustomer();
  loginAs("owner");
  const res = await call(createOrder, { params: { id: customer._id }, body: { products: [{ productId: product._id, price: total, quantity: 1 }] } });
  return { order: res.body.order, customer };
}
const debtOf = async (id) => (await Customer.findById(id)).debt;

describe("paying an order", () => {
  it("a partial payment marks it partially paid and lowers the debt by that amount", async () => {
    const { order, customer } = await orderOf(100);
    const res = await call(payPart, { params: { id: order._id }, method: "PUT", body: { amountpaid: 40 } });
    expect(res.status).toBe(200);
    const o = await Order.findById(order._id);
    expect(o.status).toBe("partiallyPaid");
    expect(o.amountpaid).toBe(40);
    expect(o.remainingBalance).toBe(60);
    expect(await debtOf(customer._id)).toBe(60);
    const payments = await Payment.find({ order: order._id });
    expect(payments).toHaveLength(1);
    expect(payments[0]).toMatchObject({ amount: 40, previousDebt: 100, newDebt: 60, source: "order" });
  });

  it("marking it paid settles the rest, and doing it twice changes nothing", async () => {
    const { order, customer } = await orderOf(80);
    await call(payPart, { params: { id: order._id }, method: "PUT", body: { amountpaid: 30 } });
    const res = await call(markPaid, { params: { id: order._id }, method: "PUT", body: {} });
    expect(res.status).toBe(200);
    const o = await Order.findById(order._id);
    expect(o.status).toBe("paid");
    expect(o.remainingBalance).toBe(0);
    expect(await debtOf(customer._id)).toBe(0);
    expect(await Payment.countDocuments({ order: order._id })).toBe(2); // 30 + the remaining 50

    await call(markPaid, { params: { id: order._id }, method: "PUT", body: {} });
    expect(await debtOf(customer._id)).toBe(0);
    expect(await Payment.countDocuments({ order: order._id })).toBe(2);
  });
});

describe("manual customer payments", () => {
  it("lower the debt, and a payment bigger than the debt is refused", async () => {
    const { customer } = await orderOf(50);
    loginAs("owner");
    const res = await call(manualPayment, { body: { customerId: customer._id, amount: 20 } });
    expect(res.status).toBeLessThan(300);
    expect(await debtOf(customer._id)).toBe(30);

    const over = await call(manualPayment, { body: { customerId: customer._id, amount: 500 } });
    expect(over.status).toBe(400);
    expect(await debtOf(customer._id)).toBe(30);

    await call(manualPayment, { body: { customerId: customer._id, amount: 30 } });
    expect(await debtOf(customer._id)).toBe(0);
    expect(await Payment.countDocuments({ customer: customer._id, source: "manual" })).toBe(2);
  });
});
