// Creates records through the real API routes (as the owner), so the tests
// start from the same state the app itself would produce.
import { call, loginAs } from "./helpers";
import { POST as createProduct } from "@/app/api/products/create/route";
import { POST as createCustomer } from "@/app/api/customers/create/route";
import { POST as createCompany } from "@/app/api/companies/route";

let n = 0;
const uniq = () => `${Date.now().toString(36)}${n++}`;

export async function makeProduct(over = {}) {
  loginAs("owner");
  const body = { name: `Product ${uniq()}`, quantity: 50, price: 10, initialPrice: 6, unit: "pcs", lowStockThreshold: 5, ...over };
  body.profit = body.price - body.initialPrice; // the product form sends this too
  const res = await call(createProduct, { body });
  if (res.status !== 201) throw new Error(`makeProduct failed: ${res.status} ${JSON.stringify(res.body)}`);
  return res.body;
}

export async function makeCustomer(over = {}) {
  loginAs("owner");
  const res = await call(createCustomer, { body: { fullName: `Customer ${uniq()}`, phoneNumber: `70${String(n).padStart(6, "0")}`, priceTier: 1, ...over } });
  if (res.status !== 201) throw new Error(`makeCustomer failed: ${res.status} ${JSON.stringify(res.body)}`);
  return res.body.customer;
}

export async function makeCompany(over = {}) {
  loginAs("owner");
  const res = await call(createCompany, { body: { name: `Supplier ${uniq()}`, phoneNumber: "01000000", address: "Main St", ...over } });
  if (res.status !== 201) throw new Error(`makeCompany failed: ${res.status} ${JSON.stringify(res.body)}`);
  return res.body.company;
}
