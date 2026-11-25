# Editions & add-ons: plan (not built yet)

Status: notes only. Build starts when the owner says "go".
Build order: module system → catalog + variants → clothing → electronics → furniture → store.

## How editions switch on
- One codebase. Each customer has their own Vercel project + database.
- `INVENTO_EDITION` = `base` | `clothing` | `electronics` | `furniture` turns on that edition's add-ons.
- `INVENTO_MODULES` = e.g. `+serials,-expiry` adds/removes single add-ons on top.
- Disabled add-on: menu, fields and pages hidden; its API answers 404; its data is kept.
- `core/` never imports `modules/` (ESLint); tests guard the base on every PR.

## Rule for every add-on: managed in TWO places
1. **Settings → a page per add-on** to create, rename, reorder, hide and delete its values
   (sizes, colors + swatch, fabrics, finishes, materials, spec templates, conditions, rooms, seasons...).
2. **Inline while creating/editing a product**: "+ Add new size" (or color, fabric...) right in the
   form; it is saved to the same Settings list, so it's there next time.
3. **On orders the employee just selects** (choose the product, then pick size/color/finish from
   buttons/swatches; or scan the variant barcode). No typing.
4. Values in use can't be deleted (only hidden), so old orders stay correct.

## Add-ons
**All new editions**
- Catalog: up to 8 photos (first = cover), brand, short + full description, tags.
- Variants: a style generates every combination (size × color...), each with its own stock,
  barcode and price; stock grid (sizes × colors); add a size/color later.
- Expiry becomes an add-on: on in base, off in clothing/electronics/furniture.

**Clothing**: size sets (XS–XXL, shoes 36–46, kids ages), colors with swatches, photos per color,
size guide per style, department, season/collection, fit, material, care, size sales report,
"complete the look".

**Electronics**: spec sheet templates per type (phone, laptop, TV, accessory), model number,
condition (new / open box / refurbished A-B-C / used), serial/IMEI per unit (recorded on purchase,
assigned on sale), warranty months + warranty lookup by IMEI, returned/defective units,
supplier per unit (recalls), storage/color variants.

**Furniture**: dimensions W×D×H (cm/in) + weight, materials and finishes/fabrics as swatch variants,
assembly (none / required / service), boxes per item, lead time + made-to-order, room, style, care,
warranty, delivery scheduling (existing delivery feature), assembly/care PDFs.

Delivery, barcodes, direct printing, recurring expenses stay in every edition.

## Invento Store (after the editions)
- Public website per shop, fed by the catalog/variants data; customers pick size/color/finish and
  order; the order arrives in Invento as a draft.
- Very structured and flexible: sections/blocks configurable from Invento Settings
  (hero, collections, featured, lookbook...), theme per edition.
- Grand, elite animations: page transitions, scroll reveals, image zoom/parallax, smooth variant
  switching. Furniture gets the most premium treatment (large imagery, room scenes, swatch
  morphs, dimension overlays). Respects reduced-motion; stays fast on phones.
- **Settings → Website**: a full control panel for the shop's site (no code, no developer):
  - Homepage: pick the hero/main photo or video, background image/color, headline + button text
    and link; add, remove, reorder and show/hide sections.
  - Featured: choose featured products and collections, set a product as the "main" product.
  - Sales: put a product, variant, collection or category on sale (% or fixed price), with start
    and end dates and a "Sale" badge; countdown optional. Store sale prices never change the
    in-shop prices unless the owner chooses to.
  - "New" badge: shown automatically on products added in the last N days (owner sets N,
    e.g. 14), or set/removed by hand per product; optional "New arrivals" section on the homepage.
    Badges (New, Sale, Low stock, Made to order) can each be turned on/off and recolored.
  - Products on the site: show/hide any product, choose which photo is the cover, hide out-of-stock
    or show "made to order".
  - Branding: logo, colors, fonts (from a curated set), theme per edition, animation intensity.
  - Pages: about, contact, delivery & returns, size guide... with an editor.
  - Announcement bar, contact details, WhatsApp order button, SEO title/description, share image.
  - Live preview (desktop / phone) before publishing; publish / unpublish the site.
- Footer driven by Invento Settings: the owner adds/removes links (social, WhatsApp, phone,
  email, address, map, custom pages); the footer layout adapts to how many links exist
  (1 column → multi-column, centered when few) and is fully responsive.
