import mongoose from "mongoose";

// A list of choices the owner manages in Settings -> Product options, and can
// extend right from the product form: sizes, colors (with swatch), fabrics,
// brands, departments, spec templates...
//   kind "variant"  - options a style's variants are made of (Size, Color...)
//   kind "field"    - choices for a product field (Brand, Department...)
//   kind "template" - spec labels inserted together (Phone specs...)
const valueSchema = new mongoose.Schema(
  {
    value: { type: String, required: true, trim: true, maxlength: 60 },
    hex: { type: String, trim: true, default: undefined }, // swatch color, "#RRGGBB"
    hidden: { type: Boolean, default: false }, // hidden values stay on old products/orders
  },
  { _id: false }
);

const optionListSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true, maxlength: 60 },
    // Singular name used as the option on a style ("Size" for the list "Sizes").
    optionName: { type: String, trim: true, maxlength: 40 },
    kind: { type: String, enum: ["variant", "field", "template"], default: "field" },
    swatch: { type: Boolean, default: false },
    custom: { type: Boolean, default: false }, // created by the owner (deletable)
    values: { type: [valueSchema], default: [] },
  },
  { timestamps: true }
);

export default mongoose.models.OptionList || mongoose.model("OptionList", optionListSchema);
