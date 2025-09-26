"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import React, { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function Page() {
  const router = useRouter();
  const [name, setName] = useState("");

  const mutation = useMutation({
    mutationFn: async () => {
      if (!name.trim()) {
        toast.error("Name is required");
        // Returning a rejected Promise to prevent mutation from continuing
        return Promise.reject(new Error("Name is required"));
      }
      const payload = { name};
      const { data } = await axios.post("/api/categories", payload);
      return data;
    },
    mutationKey: ["createcategory"],
    onSuccess: () => {
      toast.success("Category created successfully");
      setName("");
      router.replace("/dashboard/categories");
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || error.message || "Error creating category");
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    mutation.mutate();
  };

  return (
    <section className="section max-w-md mx-auto">
      <header className="flex items-center justify-between mb-4">
        <h1 className="header">Add Category</h1>
      </header>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          placeholder="Category Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Submitting..." : "Submit"}
        </Button>
      </form>
    </section>
  );
}
