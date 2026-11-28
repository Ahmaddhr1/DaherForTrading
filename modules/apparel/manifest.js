// Clothing & shoes.
const apparel = {
  id: "apparel",
  name: "Clothing & shoes",
  description: "Size sets, colors with swatches, size guide, department, season, fit, material and care.",
  requires: ["catalog", "variants"],
  section: "Clothing details",
  fields: [
    { key: "department", label: "Department", type: "select", list: "departments" },
    { key: "season", label: "Season / collection", type: "select", list: "seasons" },
    { key: "fit", label: "Fit", type: "select", list: "fits" },
    { key: "material", label: "Material / composition", type: "text", max: 200, placeholder: "e.g. 95% cotton, 5% elastane" },
    { key: "care", label: "Care instructions", type: "multiselect", list: "care" },
    { key: "sizeGuide", label: "Size guide", type: "table", hint: "Measurements per size, e.g. chest and length in cm" },
  ],
  lists: [
    { key: "size", name: "Sizes", optionName: "Size", kind: "variant", values: ["XS", "S", "M", "L", "XL", "XXL", "3XL"] },
    { key: "shoe-size", name: "Shoe sizes", optionName: "Shoe size", kind: "variant", values: ["35", "36", "37", "38", "39", "40", "41", "42", "43", "44", "45", "46"] },
    { key: "kids-age", name: "Kids ages", optionName: "Age", kind: "variant", values: ["0-3m", "3-6m", "6-12m", "1-2y", "2-3y", "3-4y", "4-5y", "6-7y", "8-9y", "10-11y", "12-13y"] },
    { key: "color", name: "Colors", optionName: "Color", kind: "variant", swatch: true },
    { key: "departments", name: "Departments", values: ["Women", "Men", "Kids", "Baby", "Unisex"] },
    { key: "seasons", name: "Seasons / collections", values: ["All season", "Spring / Summer", "Fall / Winter"] },
    { key: "fits", name: "Fits", values: ["Slim", "Regular", "Relaxed", "Oversized"] },
    { key: "care", name: "Care instructions", values: ["Machine wash cold", "Hand wash", "Do not bleach", "Tumble dry low", "Do not tumble dry", "Iron low", "Dry clean only"] },
  ],
};
export default apparel;
