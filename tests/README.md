# Tests

Integration tests for Invento's core business rules. They call the real API
route handlers against a real, throwaway MongoDB, so they check what actually
happens to stock, debts and payments, not mocks.

| File | What it protects |
|---|---|
| `orders.test.js` | stock goes down, customer debt goes up, discount/tax/profit math, drafts don't touch stock until finalized, employees can't set their own prices |
| `payments.test.js` | partial / full payments, a payment lowers debt exactly once and leaves one record, no overpaying |
| `purchases.test.js` | purchases add stock and supplier debt, paying a purchase clears it, paid-upfront purchases never add debt |
| `returns.test.js` | returns restock and refund, can't return more than was sold |
| `permissions.test.js` | the server refuses actions an employee wasn't given (and anyone logged out) |
| `closing.test.js` | daily closing: collected − paid to suppliers − expenses = cash in the drawer |
| `helpers-logic.test.js` | price tiers, expiry batches, barcodes, WhatsApp numbers |

## Running

```bash
# needs a MongoDB you can throw away; the URL must contain "test"
TEST_MONGO_URL="mongodb://127.0.0.1:27017/invento_test" npm test
```

The database is wiped at the start of every test file. CI (`.github/workflows/ci.yml`)
runs lint, these tests and a production build on every pull request.

## Writing a test

```js
import { call, loginAs } from "./helpers";
import { makeProduct, makeCustomer } from "./fixtures";
import { POST as createOrder } from "@/app/api/orders/[id]/route";

loginAs("employee", { canCreateOrders: true });   // or "owner", or null
const res = await call(createOrder, { params: { id: customer._id }, body: { products: [...] } });
```

Every new feature or module should come with tests here.
