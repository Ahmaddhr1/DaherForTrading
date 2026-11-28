// Serial number / IMEI tracking per physical unit, with warranty lookup.
const serials = {
  id: "serials",
  name: "Serial / IMEI tracking",
  description: "Record each unit's serial or IMEI, assign it to the customer on sale, and look up warranty.",
  section: "Serial numbers",
  fields: [
    { key: "track", label: "Track serial / IMEI for each unit", type: "boolean" },
  ],
  nav: [{ label: "Serials & Warranty", path: "/dashboard/serials", icon: "ScanLine", parent: "Products" }],
};
export default serials;
