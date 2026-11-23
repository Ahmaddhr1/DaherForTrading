"use client";

import { useRef, useState } from "react";
import { ScanBarcode } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useT } from "@/lib/i18n/LangProvider";

// Input for a USB / Bluetooth barcode scanner. Scanners type the code and
// press Enter, so focus this box and scan: `onScan(code)` runs on Enter and
// the box clears for the next item.
export default function BarcodeScanInput({ onScan, autoFocus = false }) {
  const t = useT();
  const [value, setValue] = useState("");
  const ref = useRef(null);

  return (
    <div className="relative">
      <ScanBarcode className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
      <Input
        ref={ref}
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key !== "Enter") return;
          e.preventDefault();
          const code = value.trim();
          if (code) onScan(code);
          setValue("");
        }}
        placeholder={t("Scan a barcode to add the product")}
        className="ps-9"
        inputMode="numeric"
        aria-label={t("Scan barcode")}
      />
    </div>
  );
}
