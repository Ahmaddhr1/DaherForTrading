// Serial / IMEI tracking: units are recorded once, sold through an order
// line (never more than its quantity), and carry warranty from the sale.
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { call, loginAs } from "./helpers";
import { makeProduct, makeCustomer } from "./fixtures";
import { addMonths } from "@/modules/serials/service";
import { GET as listUnits, POST as addUnits } from "@/app/api/modules/serials/route";
import { GET as lookup } from "@/app/api/modules/serials/lookup/route";
import { PUT as setStatus } from "@/app/api/modules/serials/[id]/route";
import { GET as orderUnits, POST as assign } from "@/app/api/modules/serials/order/[orderId]/route";
import { POST as createOrder } from "@/app/api/orders/[id]/route";

beforeAll(() => {
  process.env.INVENTO_EDITION = "electronics";
});
afterAll(() => {
  delete process.env.INVENTO_EDITION;
});

describe("serial numbers", () => {
  it("records units once, sells them to an order and tracks warranty", async () => {
    const phone = await makeProduct({ name: "Phone X", quantity: 3, price: 500, initialPrice: 400, extra: { electronics: { warrantyMonths: 12 }, serials: { track: true } } });
    loginAs("owner");
    const added = await call(addUnits, { body: { productId: phone._id, serials: "356938035643809\n356938035643810, 356938035643811\n356938035643809" } });
    expect(added.status).toBe(201);
    expect(added.body.count).toBe(3); // the repeated one counted once
    const dupe = await call(addUnits, { body: { productId: phone._id, serials: "356938035643810" } });
    expect(dupe.status).toBe(400);
    expect(dupe.body.error).toBe("Already recorded: 356938035643810");

    const { body: stock } = await call(listUnits, { query: { productId: phone._id } });
    expect(stock.counts).toEqual({ in_stock: 3 });

    const customer = await makeCustomer();
    const order = (await call(createOrder, { params: { id: customer._id }, body: { products: [{ productId: phone._id, price: 500, quantity: 2 }] } })).body.order;
    const [a, b, c] = stock.units;

    // can't assign more serials than the line's quantity
    const tooMany = await call(assign, { params: { orderId: order._id }, body: { productId: phone._id, unitIds: [a._id, b._id, c._id] } });
    expect(tooMany.status).toBe(400);
    expect(tooMany.body.error).toBe("Only 2 more serial(s) fit this order line");

    const ok = await call(assign, { params: { orderId: order._id }, body: { productId: phone._id, unitIds: [a._id, b._id] } });
    expect(ok.status).toBe(201);
    const again = await call(assign, { params: { orderId: order._id }, body: { productId: phone._id, unitIds: [c._id] } });
    expect(again.body.error).toBe("Only 0 more serial(s) fit this order line");
    expect((await call(orderUnits, { params: { orderId: order._id } })).body.units).toHaveLength(2);

    const found = await call(lookup, { query: { serial: ` ${a.serial.toLowerCase()} ` } });
    expect(found.status).toBe(200);
    const unit = found.body.unit;
    expect(unit).toMatchObject({ status: "sold", warrantyMonths: 12, product: { name: "Phone X" }, customer: { fullName: customer.fullName } });
    expect(unit.warranty.active).toBe(true);
    expect(new Date(unit.warrantyEndsAt).toISOString()).toBe(addMonths(new Date(order.createdAt), 12).toISOString());

    expect((await call(lookup, { query: { serial: "NOPE" } })).status).toBe(404);
  });

  it("a returned unit goes back to stock; illegal status changes are refused", async () => {
    const tv = await makeProduct({ name: "TV 55", quantity: 1, price: 300, initialPrice: 200 });
    loginAs("owner");
    await call(addUnits, { body: { productId: tv._id, serials: ["TV55-0001"] } });
    const unit = (await call(listUnits, { query: { productId: tv._id } })).body.units[0];
    const customer = await makeCustomer();
    const order = (await call(createOrder, { params: { id: customer._id }, body: { products: [{ productId: tv._id, price: 300, quantity: 1 }] } })).body.order;
    await call(assign, { params: { orderId: order._id }, body: { productId: tv._id, unitIds: [unit._id] } });

    const skip = await call(setStatus, { method: "PUT", params: { id: unit._id }, body: { status: "in_stock" } });
    expect(skip.status).toBe(400); // sold -> returned first
    expect((await call(setStatus, { method: "PUT", params: { id: unit._id }, body: { status: "returned", note: "screen issue" } })).status).toBe(200);
    const back = await call(setStatus, { method: "PUT", params: { id: unit._id }, body: { status: "in_stock" } });
    expect(back.body.unit).toMatchObject({ status: "in_stock", order: null, customer: null });
    expect(back.body.unit.history.map((h) => h.status)).toEqual(["in_stock", "sold", "returned", "in_stock"]);
  });

  it("needs the right permissions and is off in other editions", async () => {
    const p = await makeProduct();
    loginAs("employee");
    expect((await call(addUnits, { body: { productId: p._id, serials: "A1" } })).status).toBe(403);
    loginAs("employee", { canRecordPurchases: true });
    expect((await call(addUnits, { body: { productId: p._id, serials: "A1" } })).status).toBe(201);
    process.env.INVENTO_EDITION = "clothing";
    expect((await call(listUnits)).status).toBe(404);
    process.env.INVENTO_EDITION = "electronics";
  });
});
