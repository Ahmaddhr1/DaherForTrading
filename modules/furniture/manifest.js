// Furniture & appliances.
const furniture = {
  id: "furniture",
  name: "Furniture & appliances",
  description: "Dimensions and weight, materials, fabrics and finishes, assembly, boxes, lead time and made-to-order.",
  requires: ["catalog", "variants"],
  section: "Furniture details",
  fields: [
    { key: "dimensions", label: "Dimensions", type: "dimensions" },
    { key: "weight", label: "Weight (kg)", type: "number", min: 0, max: 5000, step: "0.1" },
    { key: "materials", label: "Materials", type: "multiselect", list: "materials" },
    { key: "room", label: "Room", type: "multiselect", list: "rooms" },
    { key: "style", label: "Style", type: "select", list: "styles" },
    { key: "assembly", label: "Assembly", type: "select", list: "assembly" },
    { key: "boxes", label: "Boxes per item", type: "number", min: 0, max: 50 },
    { key: "madeToOrder", label: "Made to order", type: "boolean" },
    { key: "leadTimeDays", label: "Lead time (days)", type: "number", min: 0, max: 365, hint: "How long until it can be delivered" },
    { key: "warrantyMonths", label: "Warranty (months)", type: "number", min: 0, max: 240 },
    { key: "care", label: "Care instructions", type: "textarea", max: 1000 },
  ],
  lists: [
    { key: "fabric", name: "Fabrics", optionName: "Fabric", kind: "variant", swatch: true, values: [{ value: "Linen beige", hex: "#D8CBB3" }, { value: "Velvet green", hex: "#2F5D50" }, { value: "Boucle white", hex: "#F1EEE7" }, { value: "Leather brown", hex: "#6B4226" }, { value: "Grey fabric", hex: "#8A8D91" }] },
    { key: "finish", name: "Finishes", optionName: "Finish", kind: "variant", swatch: true, values: [{ value: "Natural oak", hex: "#C8A27A" }, { value: "Walnut", hex: "#5C3D2E" }, { value: "White", hex: "#F5F5F2" }, { value: "Matte black", hex: "#1F1F1F" }] },
    { key: "furniture-size", name: "Furniture sizes", optionName: "Size", kind: "variant", values: ["2-seater", "3-seater", "Corner", "90x200", "140x200", "160x200", "180x200"] },
    { key: "color", name: "Colors", optionName: "Color", kind: "variant", swatch: true },
    { key: "materials", name: "Materials", values: ["Solid wood", "Oak", "Walnut", "MDF", "Metal", "Glass", "Marble", "Leather", "Fabric", "Velvet", "Rattan"] },
    { key: "rooms", name: "Rooms", values: ["Living room", "Bedroom", "Dining room", "Office", "Kids room", "Kitchen", "Bathroom", "Outdoor"] },
    { key: "styles", name: "Styles", values: ["Modern", "Classic", "Scandinavian", "Industrial", "Minimalist", "Boho", "Luxury"] },
    { key: "assembly", name: "Assembly options", values: ["No assembly needed", "Assembly required", "Assembly service available"] },
  ],
};
export default furniture;
