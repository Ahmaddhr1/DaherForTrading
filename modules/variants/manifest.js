// Styles with variants: one style (e.g. "Basic T-shirt") generates every
// combination of its options (Size x Color...). Each combination is a normal
// product with its own stock, barcode and price, so orders, returns,
// purchases, labels and reports work on variants unchanged.
const variants = {
  id: "variants",
  name: "Variants (sizes, colors...)",
  description: "Styles that generate every size/color combination, each with its own stock, barcode and price.",
  maxOptions: 3,
  maxCombinations: 300,
  nav: [{ label: "Styles", path: "/dashboard/styles", icon: "Shirt", parent: "Products" }],
};
export default variants;
