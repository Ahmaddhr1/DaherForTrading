"use client";

import { useEffect, useRef, useState } from "react";
import { Printer, Loader2, ChevronDown, Usb, Bluetooth, Plus, Check, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/i18n/toast";
import { useT } from "@/lib/i18n/LangProvider";
import {
  isDirectPrintSupported,
  supportsUsb,
  supportsSerial,
  getSavedPrinter,
  listPrinters,
  selectPrinter,
  addUsbPrinter,
  addSerialPrinter,
  printReceiptDirect,
  onPrinterChange,
  UsbBlockedError,
} from "@/lib/escposPrinter";

// One-click thermal printing on computers (Chrome/Edge). The printer list
// shows every printer this site may use - USB printers (WebUSB) and
// Bluetooth / COM printers (Web Serial) - and the selected one is used on
// every order, purchase and disbursement page.
export function useDirectPrint() {
  const [supported, setSupported] = useState(false);
  useEffect(() => setSupported(isDirectPrintSupported()), []);
  return supported;
}

const TypeIcon = ({ type, className = "h-4 w-4" }) =>
  type === "usb" ? <Usb className={className} /> : <Bluetooth className={className} />;

export default function DirectPrintButton({ label = "Print Receipt" }) {
  const t = useT();
  const [printer, setPrinter] = useState(null);
  const [printers, setPrinters] = useState([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const panelRef = useRef(null);

  const refresh = async () => setPrinters(await listPrinters());

  useEffect(() => {
    let alive = true;
    getSavedPrinter().then((p) => alive && setPrinter(p));
    refresh();
    const off = onPrinterChange((p) => {
      if (!alive) return;
      setPrinter(p);
      refresh();
    });
    const onConnect = () => refresh();
    navigator.usb?.addEventListener?.("connect", onConnect);
    navigator.usb?.addEventListener?.("disconnect", onConnect);
    navigator.serial?.addEventListener?.("connect", onConnect);
    navigator.serial?.addEventListener?.("disconnect", onConnect);
    return () => {
      alive = false;
      off();
      navigator.usb?.removeEventListener?.("connect", onConnect);
      navigator.usb?.removeEventListener?.("disconnect", onConnect);
      navigator.serial?.removeEventListener?.("connect", onConnect);
      navigator.serial?.removeEventListener?.("disconnect", onConnect);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const close = (e) => panelRef.current && !panelRef.current.contains(e.target) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const add = async (kind) => {
    try {
      const p = kind === "usb" ? await addUsbPrinter() : await addSerialPrinter();
      toast.success("Printer connected");
      setOpen(false);
      return p;
    } catch {
      return null; // closed the browser's picker
    }
  };

  const print = async () => {
    if (busy) return;
    const p = printer || (await getSavedPrinter());
    if (!p) {
      setOpen(true);
      toast.info("Choose a printer first");
      return;
    }
    setBusy(true);
    try {
      await printReceiptDirect(p);
      toast.success("Sent to printer");
    } catch (err) {
      console.error(err);
      if (err instanceof UsbBlockedError) {
        toast.error("Windows is using this USB printer's driver, so the browser can't open it. Use Thermal Receipt for this printer, or pick a Bluetooth / COM printer.");
      } else {
        toast.error("Couldn't reach the printer. Check it's on and connected, or pick it again.");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative flex items-center gap-2" ref={panelRef}>
      <Button onClick={print} disabled={busy} className="flex items-center gap-2" data-keep-label>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
        {busy ? t("Printing...") : t(label)}
      </Button>
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          refresh();
        }}
        className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1.5 text-xs font-medium ${
          printer
            ? "border-green-200 text-green-700 dark:border-green-900/50 dark:text-green-400"
            : "border-gray-200 text-gray-500 dark:border-gray-700 dark:text-gray-400"
        }`}
        aria-expanded={open}
        aria-haspopup="listbox"
        data-keep-label
      >
        <span className={`h-2 w-2 rounded-full ${printer ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600"}`} />
        {printer ? (
          <>
            <TypeIcon type={printer.type} className="h-3.5 w-3.5" />
            <span className="max-w-[10rem] truncate">{t(printer.label)}</span>
          </>
        ) : (
          t("No printer selected")
        )}
        <ChevronDown className="h-3.5 w-3.5" />
      </button>

      {open && (
        <div className="absolute start-0 top-full z-40 mt-2 w-80 rounded-lg border border-gray-200 bg-white p-2 shadow-lg dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between px-2 py-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{t("Printers")}</p>
            <button type="button" onClick={refresh} className="rounded p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200" aria-label={t("Refresh")}>
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>
          {printers.length === 0 ? (
            <p className="px-2 py-2 text-sm text-gray-500 dark:text-gray-400">{t("No printers added yet. Connect one and add it below.")}</p>
          ) : (
            <ul role="listbox" className="max-h-60 overflow-auto">
              {printers.map((p) => {
                const selected = printer?.id === p.id;
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={selected}
                      onClick={async () => {
                        await selectPrinter(p);
                        setOpen(false);
                      }}
                      className={`flex w-full items-center gap-2 rounded-md px-2 py-2 text-start text-sm ${
                        selected ? "bg-primary/10 text-gray-900 dark:text-gray-100" : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                      }`}
                    >
                      <TypeIcon type={p.type} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{t(p.label)}</span>
                        <span className="block text-xs text-gray-500 dark:text-gray-400">
                          {p.type === "usb" ? t("USB") : t("Bluetooth / COM")}
                          {p.detail ? ` · ${p.detail}` : ""}
                        </span>
                      </span>
                      {selected && <Check className="h-4 w-4 text-green-600" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="mt-1 grid gap-1 border-t border-gray-100 pt-2 dark:border-gray-800">
            {supportsUsb() && (
              <button type="button" onClick={() => add("usb")} className="flex items-center gap-2 rounded-md px-2 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800">
                <Plus className="h-4 w-4" />
                <Usb className="h-4 w-4" />
                {t("Add USB printer")}
              </button>
            )}
            {supportsSerial() && (
              <button type="button" onClick={() => add("serial")} className="flex items-center gap-2 rounded-md px-2 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800">
                <Plus className="h-4 w-4" />
                <Bluetooth className="h-4 w-4" />
                {t("Add Bluetooth / COM printer")}
              </button>
            )}
            <p className="px-2 pt-1 text-[11px] leading-snug text-gray-500 dark:text-gray-400">
              {t("On Windows, a USB printer with its Windows driver installed can only print through Thermal Receipt.")}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
