// Rich catalog: brand, short and full description, tags, and up to 8 photos.
// Shared by every new edition and later by the online store.
const catalog = {
  id: "catalog",
  name: "Rich catalog",
  description: "Brand, short and full description, tags and up to 8 photos per product.",
  maxPhotos: 8,
  section: "Catalog",
  fields: [
    { key: "brand", label: "Brand", type: "select", list: "brands" },
    { key: "summary", label: "Short description", type: "text", max: 160, hint: "One line shown under the name (max 160 characters)" },
    { key: "description", label: "Full description", type: "textarea", max: 4000 },
    { key: "tags", label: "Tags", type: "tags", hint: "Words customers search for, e.g. summer, gift, best seller" },
  ],
  lists: [{ key: "brands", name: "Brands", values: [] }],
};
export default catalog;
