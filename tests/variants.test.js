// Styles: one style makes every size/color combination as its own product,
// sold like any other product; option lists are managed in two places.
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { call, loginAs } from "./helpers";
import { makeCustomer } from "./fixtures";
import mongoose from "mongoose";
import Product from "@/core/products/models/Products";
import { POST as createStyle } from "@/app/api/modules/styles/route";
import { GET as getStyle, PUT as updateStyle, DELETE as deleteStyle } from "@/app/api/modules/styles/[id]/route";
import { POST as addStyleValues } from "@/app/api/modules/styles/[id]/values/route";
import { GET as getLists } from "@/app/api/modules/lists/route";
import { PUT as updateList } from "@/app/api/modules/lists/[key]/route";
import { POST as addListValue } from "@/app/api/modules/lists/[key]/values/route";
import { POST as createOrder } from "@/app/api/orders/[id]/route";

beforeAll(() => {
  process.env.INVENTO_EDITION = "clothing";
});
afterAll(() => {
  delete process.env.INVENTO_EDITION;
});

const tee = (over = {}) => ({
  name: "Basic T-shirt",
  price: 20,
  initialPrice: 8,
  options: [
    { list: "size", values: ["S", "M", "L"] },
    { list: "color", values: ["Black", "White"] },
  ],
  extra: { catalog: { brand: "Daher" }, apparel: { fit: "Regular", care: ["Machine wash cold"] } },
  variants: { "M|Black": { quantity: 5, barcode: "2000000000017" }, "L|White": { skip: true } },
  ...over,
});

describe("option lists", () => {
  it("are seeded from the edition, and values can be added inline or managed in Settings", async () => {
    loginAs("employee");
    const { body } = await call(getLists);
    const size = body.lists.find((l) => l.key === "size");
    expect(size.values.map((v) => v.value)).toEqual(["XS", "S", "M", "L", "XL", "XXL", "3XL"]);
    expect(body.lists.find((l) => l.key === "departments")).toBeTruthy();
    expect(body.lists.find((l) => l.key === "conditions")).toBeFalsy(); // electronics only

    // product form "+ Add new size" needs product rights
    expect((await call(addListValue, { params: { key: "size" }, body: { value: "4XL" } })).status).toBe(403);
    loginAs("employee", { canCreateProducts: true });
    const added = await call(addListValue, { params: { key: "size" }, body: { value: "4XL" } });
    expect(added.status).toBe(201);
    expect(added.body.list.values.at(-1)).toMatchObject({ value: "4XL" });
    // duplicates are ignored, case-insensitively
    await call(addListValue, { params: { key: "size" }, body: { value: "4xl" } });
    const again = (await call(getLists)).body.lists.find((l) => l.key === "size");
    expect(again.values.filter((v) => v.value.toLowerCase() === "4xl")).toHaveLength(1);

    // swatch colors are validated
    const badHex = await call(addListValue, { params: { key: "color" }, body: { value: "Olive", hex: "olive" } });
    expect(badHex.status).toBe(400);
  });
});

describe("styles", () => {
  it("creates one product per combination, with shared details and per-variant stock/barcode", async () => {
    loginAs("owner");
    const res = await call(createStyle, { body: tee() });
    expect(res.status).toBe(201);
    expect(res.body.count).toBe(5); // 3 sizes x 2 colors - 1 switched off

    const { body } = await call(getStyle, { params: { id: res.body.group._id } });
    expect(body.variants.map((v) => v.name)).toEqual([
      "Basic T-shirt · S / Black",
      "Basic T-shirt · S / White",
      "Basic T-shirt · M / Black",
      "Basic T-shirt · M / White",
      "Basic T-shirt · L / Black",
    ]);
    const mBlack = body.variants[2];
    expect(mBlack).toMatchObject({ quantity: 5, barcode: "2000000000017", price: 20, priceWholesale: 20, profit: 12 });
    expect(mBlack.extra.catalog).toEqual({ brand: "Daher" });
    expect(mBlack.extra.variant.options).toEqual([
      { list: "size", name: "Size", value: "M" },
      { list: "color", name: "Color", value: "Black" },
    ]);
  });

  it("variants sell like normal products", async () => {
    loginAs("owner");
    const created = await call(createStyle, { body: tee({ name: "Hoodie", variants: { "S|Black": { quantity: 4 } } }) });
    expect(created.body.error).toBeUndefined();
    const style = created.body.group;
    const variant = await Product.findOne({ "extra.variant.group": new mongoose.Types.ObjectId(style._id), name: "Hoodie · S / Black" });
    const customer = await makeCustomer();
    const order = await call(createOrder, { params: { id: customer._id }, body: { products: [{ productId: variant._id, price: 20, quantity: 3 }] } });
    expect(order.status).toBeLessThan(300);
    expect((await Product.findById(variant._id)).quantity).toBe(1);
  });

  it("rejects values that aren't in the list, duplicate barcodes and taken barcodes", async () => {
    loginAs("owner");
    const unknown = await call(createStyle, { body: tee({ name: "X", options: [{ list: "size", values: ["Huge"] }], variants: {} }) });
    expect(unknown.status).toBe(400);
    expect(unknown.body.error).toBe('"Huge" isn\'t in Sizes - add it first');
    const taken = await call(createStyle, { body: tee({ name: "Y" }) }); // 2000000000017 used above
    expect(taken.status).toBe(400);
    expect(taken.body.error).toMatch(/already used/);
  });

  it("adding a size later creates only the new combinations; editing pushes shared details", async () => {
    loginAs("owner");
    const style = (await call(createStyle, { body: tee({ name: "Polo", variants: {} }) })).body.group;
    const added = await call(addStyleValues, { params: { id: style._id }, body: { list: "size", values: ["XL", "M"] } });
    expect(added.status).toBe(201);
    expect(added.body.count).toBe(2); // XL x (Black, White); M already existed
    const edited = await call(updateStyle, { method: "PUT", params: { id: style._id }, body: { name: "Polo Shirt", extra: { catalog: { brand: "New" } } } });
    expect(edited.status).toBe(200);
    expect(edited.body.variants).toHaveLength(8);
    expect(edited.body.variants.every((v) => v.name.startsWith("Polo Shirt · ") && v.extra.catalog.brand === "New")).toBe(true);
    expect(edited.body.variants.every((v) => v.extra.variant.group === String(style._id))).toBe(true);
  });

  it("a value used by products can't be deleted from the list, only hidden", async () => {
    loginAs("owner");
    const list = (await call(getLists)).body.lists.find((l) => l.key === "size");
    const withoutM = list.values.filter((v) => v.value !== "M");
    const res = await call(updateList, { method: "PUT", params: { key: "size" }, body: { values: withoutM } });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/"M" is used by \d+ product\(s\) - hide it/);
    const hidden = await call(updateList, { method: "PUT", params: { key: "size" }, body: { values: list.values.map((v) => (v.value === "M" ? { ...v, hidden: true } : v)) } });
    expect(hidden.status).toBe(200);
    // an unused value can be removed
    const removed = await call(updateList, { method: "PUT", params: { key: "size" }, body: { values: list.values.filter((v) => v.value !== "3XL") } });
    expect(removed.status).toBe(200);
  });

  it("a style that was ordered can't be deleted; a fresh one can", async () => {
    loginAs("owner");
    const fresh = (await call(createStyle, { body: tee({ name: "Socks", options: [{ list: "size", values: ["S"] }], variants: {} }) })).body.group;
    expect((await call(deleteStyle, { method: "DELETE", params: { id: fresh._id } })).status).toBe(200);
    expect(await Product.countDocuments({ "extra.variant.group": new mongoose.Types.ObjectId(fresh._id) })).toBe(0);
  });
});
