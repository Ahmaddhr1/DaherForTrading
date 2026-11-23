import Product from "@/core/products/models/Products";

// Generates in-store barcodes: EAN-13 numbers starting with "2" (prefixes
// 200-299 are reserved worldwide for in-store use, so they never clash with
// a manufacturer's barcode on real packaging), with a valid check digit,
// and not used by any product yet.

export function ean13CheckDigit(first12) {
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += Number(first12[i]) * (i % 2 === 0 ? 1 : 3);
  return String((10 - (sum % 10)) % 10);
}

function randomCandidate() {
  // "2" + 11 random digits + check digit
  let body = "2";
  for (let i = 0; i < 11; i++) body += Math.floor(Math.random() * 10);
  return body + ean13CheckDigit(body);
}

// `count` unique barcodes not used by any product (or each other).
export async function generateUniqueBarcodes(count = 1) {
  const out = new Set();
  for (let attempt = 0; out.size < count && attempt < 20; attempt++) {
    const batch = new Set();
    while (batch.size < (count - out.size) * 2) {
      const c = randomCandidate();
      if (!out.has(c)) batch.add(c);
    }
    const taken = new Set((await Product.find({ barcode: { $in: [...batch] } }).select("barcode").lean()).map((p) => p.barcode));
    for (const c of batch) {
      if (out.size >= count) break;
      if (!taken.has(c)) out.add(c);
    }
  }
  if (out.size < count) throw new Error("Could not generate unique barcodes");
  return [...out];
}
