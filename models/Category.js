import mongoose, { Mongoose } from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    products: {
      type: [mongoose.Types.ObjectId],
      ref: "Product",
      default: [],
    },
  },
  { timestamps: true }
);

const Category =
  mongoose.models.Category || mongoose.model("Category", categorySchema);
export default Category;
