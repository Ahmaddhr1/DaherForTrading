// Pure business rules that don't need the database.
import { describe, it, expect } from "vitest";
import { getTierPrice } from "@/core/products/priceTiers";
import { batchesInStock } from "@/core/products/batches";
import { ean13CheckDigit } from "@/core/products/barcodeGen";
import { whatsappNumber } from "@/core/shared/whatsapp";

describe("price tiers", () => {
  const product = { price: 10, priceWholesale: 9, priceDistributor: 8, priceVip: 7 };
  it("picks the price for the customer's tier", () => {
    expect(getTierPrice(product, 1)).toBe(10);
    expect(getTierPrice(product, 2)).toBe(9);
  });
  it("falls back to the retail price when a tier price is missing", () => {
    expect(getTierPrice({ price: 10 }, 3)).toBe(10);
  });
});

describe("batches in stock (earliest expiry is sold first)", () => {
  const batches = [
    { _id: "a", quantity: 30, expiryDate: "2026-01-10", createdAt: "2025-10-01" },
    { _id: "b", quantity: 40, expiryDate: "2026-03-10", createdAt: "2025-11-01" },
  ];
  it("keeps the later batch full and the earlier one partly", () => {
    const r = batchesInStock(50, batches);
    expect(r.map((b) => [b._id, b.remaining])).toEqual([["a", 10], ["b", 40]]);
  });
  it("shows nothing when the product is out of stock", () => {
    expect(batchesInStock(0, batches)).toEqual([]);
  });
});

describe("barcodes and phone numbers", () => {
  it("computes a valid EAN-13 check digit", () => {
    expect(String(ean13CheckDigit("400638133393"))).toBe("1"); // 4006381333931
  });
  it("adds the country code to local numbers for WhatsApp", () => {
    expect(whatsappNumber("70 123 456")).toBe("96170123456");
    expect(whatsappNumber("0096170123456")).toBe("96170123456");
  });
});
