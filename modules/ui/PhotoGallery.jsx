"use client";
// Up to N photos: upload several at once, reorder (the first one is the
// cover), remove. Uses the existing product image upload endpoint.
import { useRef, useState } from "react";
import axios from "axios";
import { ImagePlus, Loader2, X, ChevronLeft, ChevronRight, Star } from "lucide-react";
import { useT } from "@/core/shared/i18n/LangProvider";
import { toast } from "@/core/shared/i18n/toast";

export function PhotoGallery({ value = [], onChange, max = 8, compact = false }) {
  const t = useT();
  const input = useRef(null);
  const [busy, setBusy] = useState(0);
  const urls = value.slice(0, max);

  const upload = async (files) => {
    const room = max - urls.length;
    const list = [...files].slice(0, room);
    if (files.length > room) toast.info(t("Only {0} more photo(s) fit", { 0: room }));
    if (!list.length) return;
    setBusy(list.length);
    const added = [];
    for (const file of list) {
      try {
        const fd = new FormData();
        fd.append("file", file);
        const { data } = await axios.post("/api/products/upload-image", fd);
        added.push(data.url);
      } catch (e) {
        toast.error(e.response?.data?.error || "Image upload failed.");
      }
      setBusy((n) => n - 1);
    }
    if (added.length) onChange([...urls, ...added]);
  };

  const move = (i, dir) => {
    const j = i + dir;
    if (j < 0 || j >= urls.length) return;
    const next = [...urls];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  const size = compact ? "h-16 w-16" : "h-24 w-24";
  return (
    <div className="flex flex-wrap gap-2">
      {urls.map((url, i) => (
        <div key={url} className={`group relative ${size} overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="" className="h-full w-full object-cover" />
          {i === 0 && (
            <span className="absolute start-1 top-1 inline-flex items-center gap-0.5 rounded bg-black/70 px-1 text-[10px] text-white">
              <Star className="h-2.5 w-2.5" /> {t("Cover")}
            </span>
          )}
          <div className="absolute inset-x-0 bottom-0 flex justify-between bg-black/55 opacity-100 sm:opacity-0 transition-opacity group-hover:opacity-100">
            <button type="button" onClick={() => move(i, -1)} className="p-1 text-white disabled:opacity-30" disabled={i === 0} aria-label={t("Move left")}>
              <ChevronLeft className="rtl-flip h-3.5 w-3.5" />
            </button>
            <button type="button" onClick={() => onChange(urls.filter((u) => u !== url))} className="p-1 text-white" aria-label={t("Remove")}>
              <X className="h-3.5 w-3.5" />
            </button>
            <button type="button" onClick={() => move(i, 1)} className="p-1 text-white disabled:opacity-30" disabled={i === urls.length - 1} aria-label={t("Move right")}>
              <ChevronRight className="rtl-flip h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ))}
      {Array.from({ length: busy }).map((_, i) => (
        <div key={`b${i}`} className={`${size} flex items-center justify-center rounded-lg border border-dashed border-gray-300 dark:border-gray-700`}>
          <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
        </div>
      ))}
      {urls.length + busy < max && (
        <button
          type="button"
          onClick={() => input.current?.click()}
          className={`${size} flex flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-gray-300 dark:border-gray-700 text-xs text-gray-500 hover:border-blue-400 hover:text-blue-600`}
        >
          <ImagePlus className="h-5 w-5" />
          {urls.length}/{max}
        </button>
      )}
      <input
        ref={input}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          upload(e.target.files || []);
          e.target.value = "";
        }}
      />
    </div>
  );
}
