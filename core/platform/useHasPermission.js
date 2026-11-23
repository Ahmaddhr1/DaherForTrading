"use client";

import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { hasPermission } from "@/core/platform/permissions";

// Client-side mirror of core/platform/permissions.js's hasPermission() - shares the
// ["admin", "me"] query with useIsOwner() (same key, same cache entry, no
// extra request). Drives which permission-gated UI shows up; the real
// enforcement is always server-side, in middleware.js and the API routes
// themselves.
export function useHasPermission(key) {
  const { data: me, isLoading } = useQuery({
    queryKey: ["admin", "me"],
    queryFn: async () => (await axios.get("/api/admin/me")).data,
  });
  return { hasPermission: hasPermission(me, key), isLoading };
}
