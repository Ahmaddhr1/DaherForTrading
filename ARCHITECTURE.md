# Invento architecture

One codebase serves every edition (Invento, Invento Clothing, Invento
Electronics, Invento Furniture...). The base product lives in `core/`; each
edition's extra features will live in self-contained add-on **modules** that
are switched on per deployment. Every customer has their own deployment and
database.

```
core/                    the base product - never knows add-ons exist
  platform/              db connection, login/session/OTP, permissions, mail, backups, uploads, app providers
    models/              Admin, LoginAttempt
  shared/                small helpers used everywhere: dates, currency, i18n/, WhatsApp, business name, cn(), ServiceError
  audit/                 activity log + change diffs            models/ActivityLog
  printing/              thermal / USB / Bluetooth printing, PDFs, statement documents
  orders/                pricing, order numbers, cart, delivery, orderService, returnService
    models/              Order, Return
  payments/              recordPayment (the one place money paid is recorded)
    models/              Payment, SupplierPayment
  products/              price tiers, barcodes, expiry batches   models/Product, Category, StockAdjustment
  customers/             overdue customers                       models/Customer
  suppliers/             purchaseService                         models/Company, Purchase
  expenses/              recurring expenses (+ scheduler)        models/Disbursement, RecurringDisbursement
  reports/               dailyClosing, profit margins, supplier price trends, employee performance
  settings/              models/AppSettings
modules/                 add-ons, switched on per deployment (see "Editions and add-on modules")
  registry.js            every module + every edition; resolveModules(edition, overrides)
  config.js / server.js  what this deployment runs (env vars), product-data validation, requireModule() 404 guard
  ModulesProvider.jsx    useModules() / useModule(id) in client components
  fields.js              field types modules can add to products
  ui/                    shared add-on UI: product fields, photo gallery, option lists, Settings pages
  lists/                 option lists (sizes, colors, brands...)      models/OptionList
  variants/              styles: every size x color as its own product   models/ProductGroup
  serials/               serial / IMEI per unit + warranty             models/SerialUnit
  catalog/ apparel/ electronics/ furniture/ expiry/   manifests (fields, lists, nav)
app/                     Next.js routes and pages only - thin
  api/...                check login + permission, read the request, call a core service, return the response
  dashboard/...          pages
components/              shared UI (components/ui = the design system)
tests/                   integration tests against a real throwaway MongoDB (see tests/README.md)
```

## Rules

1. **Business rules live in `core/<domain>/` services, not in routes.**
   A route does four things: connect, check permission, call the service,
   respond. Services never import `next/server`; for an expected failure they
   `throw new ServiceError(status, { message })` and the route answers with
   `respondError(error, fallback)`. Already done for: creating orders
   (`orders/orderService`), returns (`orders/returnService`), supplier purchases
   (`suppliers/purchaseService`), daily closing (`reports/dailyClosing`) and
   payments (`payments/recordPayment`). Other routes move over as they're touched.
2. **One place per rule.** Order money math is only in `orders/orderPricing`;
   every payment goes through `payments/recordPayment`; debts are only changed by
   services.
3. **`core/` never imports `modules/` or `app/`.** Modules build on core;
   core only offers one generic slot (`Product.extra`, validated by
   `modules/config.js`), so a disabled or broken module can't break the base
   product. Modules never import `app/` either.
4. **Imports use the domain path** (`@/core/orders/orderService`). The old
   `@/lib/*` and `@/models/*` paths are gone.
5. **Every change comes with tests.** Core money/stock flows are covered in
   `tests/`; new services and modules add their own.

Rules 3 and 4 and "services don't import next/server" are enforced by ESLint
(`eslint.config.mjs`). CI (`.github/workflows/ci.yml`) runs lint, the tests and
a production build on every pull request; don't merge a red PR.

## Where things go

| You're adding... | Put it in |
|---|---|
| a rule about orders, stock, debts, payments | the matching `core/<domain>/` service (+ a test) |
| a new database model for the base product | `core/<domain>/models/` |
| a helper used by several domains | `core/shared/` |
| something only one edition needs (sizes/colors, IMEI, installments...) | a module in `modules/<name>/` (manifest + optional service/models/ui), registered in `modules/registry.js` |
| an API endpoint | `app/api/...` - thin, calling a service |
| a page | `app/dashboard/...`, using `components/` |

## Editions and add-on modules

One codebase, one Vercel project (and database) per customer. Each project
picks its edition with environment variables:

| Variable | Values | Effect |
|---|---|---|
| `INVENTO_EDITION` | `base` (default), `clothing`, `electronics`, `furniture` | turns on that edition's modules |
| `INVENTO_MODULES` | e.g. `+serials,-expiry` | adds/removes single modules on top |

| Edition | Modules |
|---|---|
| base | expiry |
| clothing | catalog, variants, apparel |
| electronics | catalog, variants, electronics, serials |
| furniture | catalog, variants, furniture |

Change a variable in Vercel -> Redeploy. A switched-off module disappears from
menus, forms and pages, and its API answers 404; its data stays in the
database, so switching it back on brings everything back.

A module is a folder in `modules/<id>/` with a `manifest.js`:

- `fields` - extra product fields (stored in `Product.extra.<id>`, validated by `cleanFieldValue`)
- `lists` - option lists it needs, seeded once with defaults (`kind: "variant" | "field" | "template"`)
- `nav` - pages it adds under a core tab (e.g. Products)
- `requires` - other modules it needs

Option lists are managed in two places that write to the same list:
Settings -> Product options, and "+ Add new" right inside the product/style
form. Values used by products can be hidden but not deleted.

Variants are ordinary products (`extra.variant = { group, options }`), so
orders, returns, purchases, barcodes, labels and reports need no changes.
