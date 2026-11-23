"use client";

import { useQuery } from "@tanstack/react-query";
import axios from "axios";

// The business's own name and phone (Settings -> Business Settings), shown
// on receipts, statements and shared documents. Read from the public
// endpoint so shared pages (no login) can show them too. Empty name falls
// back to "Invento".
export const DEFAULT_BUSINESS_NAME = "Invento";

export function useBusiness() {
  const { data } = useQuery({
    queryKey: ["business-info"],
    queryFn: async () => (await axios.get("/api/public/business")).data,
    staleTime: 5 * 60_000,
  });
  return {
    name: data?.name?.trim() || DEFAULT_BUSINESS_NAME,
    phone: data?.phone?.trim() || "",
  };
}
