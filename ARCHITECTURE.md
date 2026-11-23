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
modules/                 add-ons (coming next): variants, serials-warranty, installments, ...
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
3. **`core/` never imports `modules/` or `app/`.** Modules plug into core
   through fixed extension points (next step), so a disabled or broken module
   can't break the base product.
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
| something only one edition needs (sizes/colors, IMEI, installments...) | a module in `modules/<name>/` (next step) |
| an API endpoint | `app/api/...` - thin, calling a service |
| a page | `app/dashboard/...`, using `components/` |
