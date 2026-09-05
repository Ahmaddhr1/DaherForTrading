"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SlidersHorizontal, ChevronDown, ChevronUp } from "lucide-react";

// Wraps a block of filter controls. On mobile the controls are collapsed
// behind a "Filters" toggle button (closed by default) so a page isn't
// dominated by search/sort/date inputs on first load; from the `sm`
// breakpoint up, the controls are always shown inline as before.
export function FiltersPanel({ children, activeCount = 0 }) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <Button
        type="button"
        variant="outline"
        onClick={() => setOpen((prev) => !prev)}
        className="w-full flex items-center justify-between sm:hidden mb-3"
      >
        <span className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4" />
          Filters
          {activeCount > 0 && (
            <Badge variant="secondary" className="ml-1">
              {activeCount}
            </Badge>
          )}
        </span>
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </Button>

      <div className={`${open ? "block" : "hidden"} sm:block`}>{children}</div>
    </div>
  );
}
