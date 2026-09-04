// components/ui/skeleton-patterns.jsx
// Reusable skeleton layouts so every page's loading state mirrors its real layout
// instead of a bare spinner.
"use client";

import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

// A grid of profile-card shaped skeletons (Customers, Companies list pages)
export function CardGridSkeleton({ count = 8 }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="h-full">
          <CardContent className="p-4 space-y-3">
            <Skeleton className="h-16 w-16 rounded-full mx-auto" />
            <Skeleton className="h-4 w-3/4 mx-auto" />
            <Skeleton className="h-3 w-1/2 mx-auto" />
            <Skeleton className="h-8 w-full rounded-md" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// A table-shaped skeleton: header row + N body rows of M columns
export function TableSkeleton({ rows = 6, cols = 5 }) {
  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div className="flex gap-4">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className="h-4 flex-1" />
          ))}
        </div>
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex gap-4">
            {Array.from({ length: cols }).map((_, c) => (
              <Skeleton key={c} className="h-6 flex-1" />
            ))}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// A vertical stack of card-shaped skeletons (order cards, payment rows, lists)
export function ListSkeleton({ rows = 5, rowHeight = "h-20" }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className={`${rowHeight} w-full rounded-lg`} />
      ))}
    </div>
  );
}

// A form-shaped skeleton: N label+input pairs
export function FormSkeleton({ fields = 4 }) {
  return (
    <div className="space-y-6">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
    </div>
  );
}

// A page header skeleton: icon block + title + subtitle
export function PageHeaderSkeleton() {
  return (
    <div className="flex items-center gap-3 mb-8">
      <Skeleton className="h-10 w-10 rounded-lg" />
      <div className="space-y-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>
    </div>
  );
}

// A small stat-tile row skeleton (used above tables/lists for summary counts)
export function StatRowSkeleton({ count = 3 }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-16 rounded-lg" />
      ))}
    </div>
  );
}
