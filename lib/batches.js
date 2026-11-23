// Expiry by batch. Each purchase (delivery) can carry its own expiry date.
// Stock is assumed to be sold earliest-expiry first, so the units still in
// stock belong to the batches that expire last. Walking the batches from the
// latest expiry down and filling them with the product's current quantity
// tells which batches - and how many units of each - are still on the shelf.
//
// batches: [{ _id, quantity, expiryDate, createdAt }] for ONE product.
// Returns the batches still in stock with `remaining`, earliest expiry first.
export function batchesInStock(stockQuantity, batches) {
  let left = Math.max(0, Number(stockQuantity) || 0);
  const sorted = [...batches]
    .filter((b) => b.expiryDate)
    .sort((a, b) => new Date(b.expiryDate) - new Date(a.expiryDate) || new Date(b.createdAt) - new Date(a.createdAt));
  const inStock = [];
  for (const b of sorted) {
    if (left <= 0) break;
    const remaining = Math.min(Number(b.quantity) || 0, left);
    left -= remaining;
    if (remaining > 0) inStock.push({ ...b, remaining });
  }
  return inStock.sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate));
}
