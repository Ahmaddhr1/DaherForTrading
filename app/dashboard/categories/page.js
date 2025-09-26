"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { ArrowRight, Loader2, Folder } from "lucide-react";
import React from "react";

const fetchCategories = async () => {
  const { data } = await axios.get("/api/categories");
  return data;
};

const Page = () => {
  const { data: categories = [], isLoading, isError } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
  });

  return (
    <section className="section">
      <header className="flex items-center justify-between mb-6">
        <h1 className="header">Categories</h1>
        <Link href="/dashboard/categories/add">
          <Button>+ Add Category</Button>
        </Link>
      </header>

      {isLoading ? (
        <div className="flex justify-center items-center h-40">
          <Loader2 className="h-8 w-8 animate-spin text-gray-600" />
        </div>
      ) : isError ? (
        <p className="text-red-600">Failed to load categories.</p>
      ) : categories.length === 0 ? (
        <p className="text-gray-500">No categories found.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((cat) => (
            <Link
              key={cat._id}
              href={`/dashboard/categories/${cat._id}`}
              className="group block"
            >
              <div className="rounded-xl border shadow-sm p-4 flex items-center justify-between hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3">
                  <Folder className="h-6 w-6 text-gray-500 group-hover:text-black" />
                  <span className="font-medium">{cat.name}</span>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-500 group-hover:text-black" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
};

export default Page;
