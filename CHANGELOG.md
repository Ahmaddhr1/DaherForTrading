# Changelog

## 2026-11-28

### Editions & add-ons
- **Module system**: one codebase, an edition per deployment via `INVENTO_EDITION` (`base`, `clothing`, `electronics`, `furniture`) and optional `INVENTO_MODULES` (`+serials,-expiry`). Settings shows the edition and its add-ons. Rules in `ARCHITECTURE.md`.
- **Rich catalog**: up to 8 photos per product (reorder, first is the cover), brand, short and full description, tags.
- **Styles (variants)**: one style generates every size/color/finish combination as its own product with its own stock, barcode and price; stock grid (sizes x colors); add a size or color later; edit shared details once for all variants; photos per color.
- **Product options**: sizes, colors with swatches, fabrics, finishes, storage, brands, departments, spec templates... managed in Settings -> Product options and addable inline from the product/style form. Used values can only be hidden.
- **Orders**: on a variant line, tap the size/color buttons (out-of-stock ones are struck through) - also on order edit and supplier purchases.
- **Clothing**: size sets (letters, shoes, kids), department, season, fit, material, care instructions, size guide table.
- **Electronics**: model number, condition grades, warranty months, spec sheets with templates (phone, laptop, TV, accessory); **serial / IMEI tracking** per unit (record on the product, assign on the order, never more than the line quantity), warranty lookup by serial, returned/defective units.
- **Furniture**: dimensions (W x D x H, cm/in), weight, materials, room, style, assembly, boxes per item, made-to-order and lead time, warranty, care; fabric and finish swatches.
- **Expiry is now an add-on**: on in base Invento, off in the clothing, electronics and furniture editions.

### Printing
- Barcode labels for **thermal label printers**: 40x30, 50x30, 50x25, 58x40 mm or a custom size, one label per page (A4 sheets still available). The choice is remembered.

## 2026-11-23

### Structure & quality
- **Tests and CI**: integration tests for the core money and stock flows (orders, payments, purchases, returns, permissions, daily closing) against a real throwaway MongoDB; GitHub Actions runs lint, tests and a production build on every pull request.
- **Restructure**: `lib/` and `models/` moved into `core/<domain>/`; creating orders, returns, supplier purchases and daily closing now live in core services with thin API routes. Rules documented in `ARCHITECTURE.md` and enforced by ESLint.

### Arabic & formatting
- Confirmation pop-ups show Arabic buttons in Arabic mode; "Expenses" translated on Daily Closing.
- Daily Closing amounts use thousands separators ($12,480.50).

### Orders & delivery
- Optional delivery on orders: delivery status (preparing, out for delivery, delivered, returned/failed) and delivery person, separate from payment status; delivery filter and badges on the orders list; delivery person on the thermal receipt; new `canManageDeliveries` permission.

### Business identity
- Business name and phone in Settings, shown on receipts, statements, closing reports and shared pages; fixed "Powered by Invento" footer.

## 2026-11-22

### Printing & documents
- Customer and company statements print on **A4** from a print page (Back / Print, choose any printer), with the same layout as the PDF; a **PDF view** to share or download. Buttons that printed the raw web page were removed.
- Thermal receipt columns tidied (product, qty, price, discount, total).
- **Direct printing** to USB (WebUSB) and Bluetooth/COM (Web Serial) receipt printers, with a printer list.

### Customers, companies & orders
- Notes on customers and orders.
- Company statement groups purchases into orders with their products underneath; **Orders / Products** views.
- **Read-only view pages** for customers, companies and products; editing moved to `.../edit`, gated by the matching edit permission. Product cost/profit only shown to owners or users with stats access.
- WhatsApp links add the **961** country code to local numbers.

### Products & stock
- **Expiry date** per product with its own alert window (default from Settings), and **expiry by batch** per purchase (earliest expiry sold first); Expiry Alerts card on the dashboard.
- **Barcodes**: barcode field, scan-to-add on orders, printable labels, a unique EAN-13 generator, and a phone-friendly Barcode Labels page.

### Reports
- **Daily closing**: money in and out for the day and what should be in the drawer, printable and shareable on WhatsApp.

### Deployment
- `vercel.json` skips deployments of the `claude/*` working branches, so only `main` uses the daily deploy quota.
