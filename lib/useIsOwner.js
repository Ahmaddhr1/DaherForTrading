"use client";

import { useQuery } from "@tanstack/react-query";
import axios from "axios";

// Whether the logged-in admin is an "owner" (vs "employee") - drives which
// owner-only UI (stat grids, totals cards, the Dashboard page, etc.) is
// shown client-side. The real enforcement is always server-side, in
// middleware.js - this only avoids flashing a number an employee can't
// actually rely on seeing again.
export function useIsOwner() {
  const { data: me, isLoading } = useQuery({
    queryKey: ["admin", "me"],
    queryFn: async () => (await axios.get("/api/admin/me")).data,
  });
  return { isOwner: me?.role === "owner", isLoading };
}
