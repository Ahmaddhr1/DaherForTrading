// Mobile & electronics.
const electronics = {
  id: "electronics",
  name: "Mobile & electronics",
  description: "Spec sheets with templates, model number, condition grades and warranty.",
  requires: ["catalog", "variants"],
  section: "Electronics details",
  fields: [
    { key: "model", label: "Model number", type: "text", max: 80, placeholder: "e.g. SM-S921B" },
    { key: "condition", label: "Condition", type: "select", list: "conditions" },
    { key: "warrantyMonths", label: "Warranty (months)", type: "number", min: 0, max: 120 },
    { key: "specs", label: "Specifications", type: "specs", templates: ["phone-specs", "laptop-specs", "tv-specs", "accessory-specs"] },
  ],
  lists: [
    { key: "storage", name: "Storage", optionName: "Storage", kind: "variant", values: ["64GB", "128GB", "256GB", "512GB", "1TB"] },
    { key: "ram", name: "RAM", optionName: "RAM", kind: "variant", values: ["4GB", "6GB", "8GB", "12GB", "16GB", "32GB"] },
    { key: "color", name: "Colors", optionName: "Color", kind: "variant", swatch: true },
    { key: "conditions", name: "Conditions", values: ["New", "Open box", "Refurbished - A", "Refurbished - B", "Refurbished - C", "Used"] },
    { key: "phone-specs", name: "Phone specs (template)", kind: "template", values: ["Storage", "RAM", "Screen", "Processor", "Main camera", "Battery", "SIM", "Operating system"] },
    { key: "laptop-specs", name: "Laptop specs (template)", kind: "template", values: ["Processor", "RAM", "Storage", "Screen", "Graphics", "Battery", "Operating system", "Weight"] },
    { key: "tv-specs", name: "TV specs (template)", kind: "template", values: ["Screen size", "Resolution", "Panel", "Refresh rate", "HDR", "Smart system", "Ports"] },
    { key: "accessory-specs", name: "Accessory specs (template)", kind: "template", values: ["Compatible with", "Connection", "Battery", "Cable length"] },
  ],
};
export default electronics;
