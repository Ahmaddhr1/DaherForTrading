"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

const fetchProduct = async (id) => {
  const res = await axios.get(`/api/products/${id}`);
  return res.data;
};

const fetchCategories = async () => {
  const res = await axios.get("/api/categories");
  return res.data;
};

const EditProductPage = () => {
  const router = useRouter();
  const { id } = useParams();

  const { data: product, isLoading: productLoading } = useQuery({
    queryKey: ["product", id],
    queryFn: () => fetchProduct(id),
    enabled: !!id,
    onError: () => toast.error("Failed to fetch product."),
  });

  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
  });

  const [form, setForm] = useState({
    name: "",
    quantity: "",
    price: "",
    initialPrice: "",
    category: "",
  });

  // Sync product data into form once, no useEffect
  if (product && form.name === "") {
    setForm({
      name: product.name || "",
      quantity: product.quantity?.toString() || "",
      price: product.price?.toString() || "",
      initialPrice: product.initialPrice?.toString() || "",
      category: product.category || "",
    });
  }

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
        price: parseFloat(form.price),
        initialPrice: parseFloat(form.initialPrice),
        profit: parseFloat(form.price) - parseFloat(form.initialPrice),
        quantity: parseInt(form.quantity, 10),
      };
      const res = await axios.put(`/api/products/${id}`, payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Product updated successfully");
      router.replace("/dashboard/products");
    },
    onError: (err) => {
      toast.error(err?.response?.data?.error || "Failed to update product.");
    },
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    let cleanValue = value;

    if (name === "quantity") cleanValue = value.replace(/\D/g, "");
    if (name === "price" || name === "initialPrice")
      cleanValue = value.replace(/[^0-9.]/g, "").replace(/(\..*?)\..*/g, "$1");

    setForm((prev) => ({ ...prev, [name]: cleanValue }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    mutation.mutate();
  };

  const isFormValid =
    form.name.trim() &&
    form.quantity &&
    form.price &&
    form.initialPrice &&
    form.category 

  return (
    <section className="section">
      <h1 className="header mb-4">Edit Product</h1>

      {productLoading ? (
        <p>Loading...</p>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 max-w-md">
          <label htmlFor="name" className="font-semibold">Name</label>
          <Input
            id="name"
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="Name"
          />

          <label htmlFor="quantity" className="font-semibold">Quantity</label>
          <Input
            id="quantity"
            name="quantity"
            value={form.quantity}
            onChange={handleChange}
            placeholder="Quantity"
            inputMode="numeric"
          />

          <label htmlFor="price" className="font-semibold">Selling Price</label>
          <Input
            id="price"
            name="price"
            value={form.price}
            onChange={handleChange}
            placeholder="Selling Price"
            inputMode="decimal"
          />

          <label htmlFor="initialPrice" className="font-semibold">Cost Price</label>
          <Input
            id="initialPrice"
            name="initialPrice"
            value={form.initialPrice}
            onChange={handleChange}
            placeholder="Cost Price"
            inputMode="decimal"
          />

          <label htmlFor="category" className="font-semibold">Category</label>
          <select
            id="category"
            name="category"
            value={form.category}
            onChange={handleChange}
            className="p-2 border rounded"
            disabled={categoriesLoading}
          >
            <option value="">Select Category</option>
            {categories.map((cat) => (
              <option key={cat._id} value={cat._id}>
                {cat.name}
              </option>
            ))}
          </select>

          {form.price && form.initialPrice && (
            <p className="text-sm text-green-600">
              Estimated Profit:{" "}
              {(parseFloat(form.price) - parseFloat(form.initialPrice)).toFixed(2)}$
            </p>
          )}

          <Button type="submit" disabled={mutation.isPending || !isFormValid}>
            {mutation.isPending ? (
              <span className="flex items-center gap-2">
                <Loader2 className="animate-spin h-4 w-4" />
                Saving...
              </span>
            ) : (
              "Update Product"
            )}
          </Button>
        </form>
      )}
    </section>
  );
};

export default EditProductPage;
