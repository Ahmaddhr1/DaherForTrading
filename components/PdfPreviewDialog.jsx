"use client";

import { useEffect, useMemo, useRef } from "react";
import { Printer, Share2, Download, X, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/core/shared/i18n/LangProvider";
import { toast } from "@/core/shared/i18n/toast";
import { isTouchDevice } from "@/core/shared/isTouchDevice";

// Shows a generated PDF (the black-and-white statement) with Print, Share
// and Download. On computers the PDF is shown in the window and Print opens
// the system print dialog for it (choose any printer). Phones can't show a
// PDF inside a page reliably, so there "Open PDF" opens it in the phone's
// PDF viewer, which has its own print/share.
export default function PdfPreviewDialog({ open, onClose, blob, filename, title }) {
  const t = useT();
  const frameRef = useRef(null);
  const url = useMemo(() => (blob ? URL.createObjectURL(blob) : null), [blob]);
  const touch = typeof window !== "undefined" && isTouchDevice();

  useEffect(() => () => url && URL.revokeObjectURL(url), [url]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !blob) return null;

  const file = () => new File([blob], filename, { type: "application/pdf" });
  const canShare = typeof navigator !== "undefined" && navigator.canShare?.({ files: [file()] });

  const print = () => {
    if (touch) {
      window.open(url, "_blank");
      return;
    }
    try {
      const w = frameRef.current?.contentWindow;
      w.focus();
      w.print();
    } catch {
      window.open(url, "_blank"); // browser blocked printing the embedded PDF
    }
  };
  const share = async () => {
    try {
      await navigator.share({ files: [file()], title: filename });
    } catch (err) {
      if (err?.name !== "AbortError") toast.error("Couldn't share the PDF");
    }
  };
  const download = () => {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div
        className={`relative flex w-full flex-col overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-gray-900 ${
          touch ? "max-w-md" : "h-[90vh] max-w-4xl"
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-4 py-3 dark:border-gray-800">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={print} className="flex items-center gap-2" data-keep-label>
              {touch ? <ExternalLink className="h-4 w-4" /> : <Printer className="h-4 w-4" />}
              {touch ? t("Open PDF") : t("Print")}
            </Button>
            {canShare && (
              <Button variant="outline" onClick={share} className="flex items-center gap-2" data-keep-label>
                <Share2 className="h-4 w-4" />
                {t("Share")}
              </Button>
            )}
            <Button variant="outline" onClick={download} className="flex items-center gap-2" data-keep-label>
              <Download className="h-4 w-4" />
              {t("Download")}
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose} aria-label={t("Close")}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>
        {touch ? (
          <p className="px-4 py-6 text-sm text-gray-600 dark:text-gray-400">
            {t("Open the PDF to view it, then print or share it from your phone's PDF viewer.")}
          </p>
        ) : (
          <iframe ref={frameRef} src={url} title={title} className="w-full flex-1 bg-gray-100" />
        )}
      </div>
    </div>
  );
}
