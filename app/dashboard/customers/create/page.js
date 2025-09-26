"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

const AddCustomerPage = () => {
  const router = useRouter();
  const [form, setForm] = useState({
    fullName: "",
    phoneNumber: "",
    debt: "",
    smallBottlesDebt: 0,
    bigBottlesDebt: 0
  });

  const handleChange = (e) => {
    const { name, value } = e.target;

    const numericFields = ["phoneNumber", "debt", "smallBottlesDebt", "bigBottlesDebt"];

    const cleanValue = numericFields.includes(name) ? value.replace(/\D/g, "") : value;

    setForm((prev) => ({
      ...prev,
      [name]: cleanValue,
    }));
  };

  const mutation = useMutation({
    mutationFn: async (data) => {
      const res = await axios.post("/api/customers/create", data);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || "Customer created successfully!");
      setForm({
        fullName: "",
        phoneNumber: "",
        debt: "",
        smallBottlesDebt: 0,
        bigBottlesDebt: 0
      });
      router.replace("/dashboard/customers")
    },
    onError: (error) => {
      const message = error.response?.data?.error || "Failed to create customer.";
      toast.error(message);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    mutation.mutate(form);
  };

  return (
    <section className="section">
      <header className="mb-3">
        <h1 className="header">Add Customer</h1>
      </header>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 max-w-md">
        <Label>Full Name </Label>
        <Input
          type="text"
          placeholder="Full Name"
          name="fullName"
          value={form.fullName}
          onChange={handleChange}
        />
        <Label>Phone Number</Label>
        <Input
          type="text"
          inputMode="numeric"
          placeholder="Phone Number"
          name="phoneNumber"
          value={form.phoneNumber}
          onChange={handleChange}
        />
        <Label>Debt</Label>
        <Input
          type="text"
          inputMode="numeric"
          placeholder="Debt"
          name="debt"
          value={form.debt}
          onChange={handleChange}
        />
        <Label>Small bottles</Label>
        <Input
          type="number"
          inputMode="numeric"
          placeholder="Small bottles"
          name="smallBottlesDebt"
          value={form.smallBottlesDebt}
          onChange={handleChange}
        />
        <Label>Big bottles</Label>
        <Input
          type="number"
          inputMode="numeric"
          placeholder="Big bottles"
          name="bigBottlesDebt"
          value={form.bigBottlesDebt}
          onChange={handleChange}
        />
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? (
            <span className="flex items-center gap-2">
              <Loader2 className="animate-spin h-4 w-4" />
              Submitting...
            </span>
          ) : (
            "Submit"
          )}
        </Button>
      </form>
    </section>
  );
};

export default AddCustomerPage;
