// Editions and add-on modules: which modules a deployment runs, the 404
// guard, and how module data on products is validated.
import { describe, it, expect, afterEach } from "vitest";
import { resolveModules, listsFor } from "@/modules/registry";
import { sanitizeProductExtra, enabledModules } from "@/modules/server";
import { call, loginAs } from "./helpers";
import { makeProduct } from "./fixtures";
import { GET as expiring } from "@/app/api/products/expiring/route";
import { PUT as updateProduct } from "@/app/api/products/[id]/route";
import { GET as listStyles } from "@/app/api/modules/styles/route";

afterEach(() => {
  delete process.env.INVENTO_EDITION;
  delete process.env.INVENTO_MODULES;
});

describe("editions", () => {
  it("base Invento runs only expiry; each edition gets its bundle", () => {
    expect(resolveModules(undefined)).toEqual(["expiry"]);
    expect(resolveModules("nonsense")).toEqual(["expiry"]);
    expect(resolveModules("clothing")).toEqual(["catalog", "variants", "apparel"]);
    expect(resolveModules("electronics")).toEqual(["catalog", "variants", "electronics", "serials"]);
    expect(resolveModules(" Furniture ")).toEqual(["catalog", "variants", "furniture"]);
  });

  it("INVENTO_MODULES adds and removes single modules, pulling in requirements", () => {
    expect(resolveModules("furniture", "+serials,-nope")).toEqual(["catalog", "variants", "serials", "furniture"]);
    expect(resolveModules("base", "+apparel")).toEqual(["expiry", "catalog", "variants", "apparel"]);
    expect(resolveModules("base", "-expiry")).toEqual([]);
    // removing a requirement on purpose switches off what needs it
    expect(resolveModules("clothing", "-variants")).toEqual(["catalog"]);
  });

  it("reads the environment on every call", () => {
    process.env.INVENTO_EDITION = "electronics";
    expect(enabledModules()).toContain("serials");
    process.env.INVENTO_EDITION = "clothing";
    expect(enabledModules()).not.toContain("serials");
  });

  it("merges lists shared by modules (colors) once, with default swatches", () => {
    const lists = listsFor(resolveModules("electronics"));
    const colors = lists.filter((l) => l.key === "color");
    expect(colors).toHaveLength(1);
    expect(colors[0].values.find((v) => v.value === "Black").hex).toBe("#111111");
  });
});

describe("module routes", () => {
  it("a switched-off module's API answers 404", async () => {
    loginAs("owner");
    expect((await call(listStyles)).status).toBe(404); // base edition: no variants
    process.env.INVENTO_EDITION = "clothing";
    expect((await call(listStyles)).status).toBe(200);
    expect((await call(expiring)).status).toBe(404); // clothing: no expiry
  });
});

describe("module data on products", () => {
  it("keeps only known fields of enabled modules, cleaned", () => {
    process.env.INVENTO_EDITION = "furniture";
    const out = sanitizeProductExtra({
      furniture: { dimensions: { w: "200", d: 90, h: "x", unit: "mm" }, madeToOrder: "true", boxes: "-3", hacker: 1, materials: ["Oak", "oak", " Metal "] },
      apparel: { fit: "Slim" }, // not part of this edition
      variant: { group: "64b000000000000000000009" }, // never settable from a form
    });
    expect(out).toEqual({
      furniture: { dimensions: { w: 200, d: 90, unit: "cm" }, madeToOrder: true, boxes: 0, materials: ["Oak", "Metal"] },
    });
  });

  it("never drops data of a module that is switched off, nor the variant link", async () => {
    process.env.INVENTO_EDITION = "electronics";
    const p = await makeProduct({ extra: { electronics: { condition: "New", warrantyMonths: 12 }, catalog: { brand: "Acme" } } });
    expect(p.extra.electronics).toEqual({ condition: "New", warrantyMonths: 12 });

    process.env.INVENTO_EDITION = "clothing"; // electronics switched off
    loginAs("owner");
    const res = await call(updateProduct, { method: "PUT", params: { id: p._id }, body: { price: 10, extra: { catalog: { brand: "Acme 2" }, apparel: { fit: "Slim" } } } });
    expect(res.status).toBe(200);
    expect(res.body.extra).toEqual({ electronics: { condition: "New", warrantyMonths: 12 }, catalog: { brand: "Acme 2" }, apparel: { fit: "Slim" } });
  });
});
