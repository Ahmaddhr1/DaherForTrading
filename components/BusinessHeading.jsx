"use client";

import { useBusiness } from "@/core/shared/business";

// Business name (and phone) at the top of receipts and documents.
// variant "receipt": thermal receipts; "banner": shared document pages.
export default function BusinessHeading({ variant = "receipt" }) {
  const { name, phone } = useBusiness();
  if (variant === "banner") {
    return (
      <div className="mb-4 text-center">
        <p className="text-xl font-bold text-gray-900">{name}</p>
        {phone && <p className="text-sm text-gray-600 ltr-text">{phone}</p>}
      </div>
    );
  }
  return (
    <>
      <p className="text-lg font-bold">{name}</p>
      {phone && <p className="text-[12px] ltr-text">{phone}</p>}
    </>
  );
}
