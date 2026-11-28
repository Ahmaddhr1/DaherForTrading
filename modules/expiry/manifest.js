// Expiry dates and expiry alerts (pharmacies, groceries, food). The data and
// FIFO batch logic stay in core/products; this module only decides whether
// the expiry fields, alerts and the expiring-products API are shown.
const expiry = {
  id: "expiry",
  name: "Expiry dates & alerts",
  description: "Expiry date per product and per purchase batch, with alerts before stock expires.",
};
export default expiry;
