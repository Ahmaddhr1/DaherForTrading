// Direct printing to an ESC/POS thermal printer from Chrome/Edge on a
// computer, using Web Serial. A Bluetooth printer paired with Windows/macOS
// (and many USB receipt printers) shows up as a serial (COM) port; we send
// it the receipt as a black-and-white image, so Arabic text and the exact
// on-screen layout print as-is - no print dialog, page sizes or margins.
//
// Consistency:
// - The chosen port is remembered (its identity in localStorage, plus the
//   live port object for the session), so every order/purchase page uses the
//   same printer - a paired Bluetooth printer often has two COM ports and
//   "the first one" isn't necessarily it.
// - The port is opened once and kept open for the session. Closing and
//   re-opening a Bluetooth serial port right after a print often fails, which
//   is why printing used to work once and then stop.
// - Print jobs are queued, and a failed job reconnects and retries once.
import { toCanvas } from "html-to-image";
import { isTouchDevice } from "@/core/shared/isTouchDevice";

const PRINTER_DOTS = 576; // printable width of an 80mm printer at 203 dpi
const BAND_LINES = 128; // image rows per raster command (small printer buffers)
const CHUNK_BYTES = 2048;
const STORAGE_KEY = "thermal-printer";

// A printer is either a serial port (a paired Bluetooth printer or a
// USB-serial printer, via Web Serial) or a USB device (via WebUSB):
//   { id, type: "serial" | "usb", label, handle }
// One connection is shared by every page for the whole session.
const state = { printer: null, writer: null, usb: null, queue: Promise.resolve(), listeners: new Set() };

const notify = () => state.listeners.forEach((fn) => fn(state.printer));
export function onPrinterChange(fn) {
  state.listeners.add(fn);
  return () => state.listeners.delete(fn);
}

const hasSerial = () => typeof navigator !== "undefined" && "serial" in navigator;
const hasUsb = () => typeof navigator !== "undefined" && "usb" in navigator;
export const supportsUsb = () => hasUsb() && !isTouchDevice();
export const supportsSerial = () => hasSerial() && !isTouchDevice();
export function isDirectPrintSupported() {
  return (hasSerial() || hasUsb()) && !isTouchDevice();
}

function hex(n) {
  return n === undefined || n === null ? "" : Number(n).toString(16).padStart(4, "0");
}
function serialEntry(port, index) {
  const info = port.getInfo?.() || {};
  const isBt = !!info.bluetoothServiceClassId;
  return {
    id: `serial:${index}:${hex(info.usbVendorId)}:${hex(info.usbProductId)}:${info.bluetoothServiceClassId || ""}`,
    type: "serial",
    label: isBt ? "Bluetooth printer" : info.usbVendorId ? "USB serial printer" : "Serial (COM) printer",
    detail: isBt ? "" : info.usbVendorId ? `${hex(info.usbVendorId)}:${hex(info.usbProductId)}` : "",
    handle: port,
  };
}
function usbEntry(device) {
  return {
    id: `usb:${hex(device.vendorId)}:${hex(device.productId)}:${device.serialNumber || ""}`,
    type: "usb",
    label: [device.manufacturerName, device.productName].filter(Boolean).join(" ") || "USB printer",
    detail: `${hex(device.vendorId)}:${hex(device.productId)}`,
    handle: device,
  };
}

// Every printer this site is allowed to use (picked before), USB and serial.
export async function listPrinters() {
  if (!isDirectPrintSupported()) return [];
  bindEvents();
  const serial = hasSerial() ? (await navigator.serial.getPorts()).map(serialEntry) : [];
  const usb = hasUsb() ? (await navigator.usb.getDevices()).map(usbEntry) : [];
  return [...usb, ...serial];
}

function readSaved() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}
function save(printer) {
  try {
    localStorage.setItem(STORAGE_KEY, printer.id);
  } catch {}
}

let eventsBound = false;
function bindEvents() {
  if (eventsBound || !isDirectPrintSupported()) return;
  eventsBound = true;
  const onDisconnect = (e) => {
    const gone = e.target === state.printer?.handle || e.device === state.printer?.handle;
    if (gone) {
      dropConnection();
      notify();
    }
  };
  if (hasSerial()) navigator.serial.addEventListener?.("disconnect", onDisconnect);
  if (hasUsb()) navigator.usb.addEventListener?.("disconnect", onDisconnect);
  window.addEventListener("pagehide", () => dropConnection());
}

// The printer chosen earlier (or the only one available), or null.
export async function getSavedPrinter() {
  if (!isDirectPrintSupported()) return null;
  if (state.printer) return state.printer;
  const printers = await listPrinters();
  if (!printers.length) return null;
  const savedId = readSaved();
  const printer = printers.find((x) => x.id === savedId) || (printers.length === 1 ? printers[0] : null);
  state.printer = printer;
  return printer;
}

// Use this printer from now on (on every page).
export async function selectPrinter(printer) {
  if (state.printer?.handle !== printer?.handle) await dropConnection();
  state.printer = printer;
  if (printer) save(printer);
  notify();
  return printer;
}

// Browser prompts to allow a new printer.
export async function addUsbPrinter() {
  bindEvents();
  // No filter: some receipt printers report a vendor-specific USB class
  // instead of the "printer" class, so list every device.
  const device = await navigator.usb.requestDevice({ filters: [] });
  return selectPrinter(usbEntry(device));
}
export async function addSerialPrinter() {
  bindEvents();
  const port = await navigator.serial.requestPort();
  const ports = await navigator.serial.getPorts();
  return selectPrinter(serialEntry(port, Math.max(0, ports.indexOf(port))));
}
// Kept for older callers: picking a printer = adding a serial one.
export const choosePrinter = addSerialPrinter;

async function dropConnection() {
  const { printer, writer, usb } = state;
  state.writer = null;
  state.usb = null;
  try {
    writer?.releaseLock();
  } catch {}
  try {
    if (printer?.type === "serial" && (printer.handle.writable || printer.handle.readable)) await printer.handle.close();
  } catch {}
  try {
    if (usb) {
      await usb.device.releaseInterface(usb.interfaceNumber).catch(() => {});
      await usb.device.close();
    }
  } catch {}
}

// ---- serial
async function serialWriter(port) {
  if (state.writer && port.writable) return state.writer;
  state.writer = null;
  if (!port.writable) {
    try {
      await port.open({ baudRate: 9600 });
    } catch (err) {
      // Already open (e.g. from this tab before a reload): reuse it.
      if (!(err?.name === "InvalidStateError" && port.writable)) throw err;
    }
  }
  state.writer = port.writable.getWriter();
  return state.writer;
}

// ---- USB: open the device, find an interface with a bulk OUT endpoint
// (the printer interface, class 7, if there is one) and claim it.
export class UsbBlockedError extends Error {}
async function usbChannel(device) {
  if (state.usb?.device === device && device.opened) return state.usb;
  try {
    if (!device.opened) await device.open();
    if (!device.configuration) await device.selectConfiguration(1);
  } catch (err) {
    // Windows: the printer's own driver holds the device.
    throw new UsbBlockedError(err?.message || "USB device is in use");
  }
  const candidates = [];
  for (const iface of device.configuration.interfaces) {
    for (const alt of iface.alternates) {
      const out = alt.endpoints.find((e) => e.direction === "out" && e.type === "bulk");
      if (out) candidates.push({ iface, alt, out, printerClass: alt.interfaceClass === 7 });
    }
  }
  candidates.sort((a, b) => Number(b.printerClass) - Number(a.printerClass));
  const pick = candidates[0];
  if (!pick) throw new Error("This USB device has no printer output");
  try {
    await device.claimInterface(pick.iface.interfaceNumber);
    if (pick.iface.alternates.length > 1) await device.selectAlternateInterface(pick.iface.interfaceNumber, pick.alt.alternateSetting);
  } catch (err) {
    throw new UsbBlockedError(err?.message || "USB interface is in use");
  }
  state.usb = { device, interfaceNumber: pick.iface.interfaceNumber, endpointNumber: pick.out.endpointNumber, packetSize: pick.out.packetSize || 64 };
  return state.usb;
}

async function send(printer, bytes) {
  if (printer.type === "usb") {
    const ch = await usbChannel(printer.handle);
    for (let i = 0; i < bytes.length; i += CHUNK_BYTES) {
      const r = await ch.device.transferOut(ch.endpointNumber, bytes.subarray(i, i + CHUNK_BYTES));
      if (r.status !== "ok") throw new Error(`USB transfer ${r.status}`);
    }
    return;
  }
  const writer = await serialWriter(printer.handle);
  for (let i = 0; i < bytes.length; i += CHUNK_BYTES) {
    await writer.ready;
    await writer.write(bytes.subarray(i, i + CHUNK_BYTES));
  }
  await writer.ready;
}

// Renders a receipt element to a canvas at the printer's width.
async function receiptCanvas(el) {
  const root = el.closest("#thermal-receipt-root");
  // The receipt is display:none on normal pages; show it off-screen while
  // it's being captured.
  const hidden = root && getComputedStyle(root).display === "none";
  if (hidden) Object.assign(root.style, { display: "block", position: "fixed", left: "-10000px", top: "0" });
  try {
    try {
      await document.fonts?.ready;
    } catch {}
    const width = el.getBoundingClientRect().width || 302;
    return await toCanvas(el, {
      backgroundColor: "#ffffff",
      pixelRatio: PRINTER_DOTS / width,
      cacheBust: true,
    });
  } finally {
    if (hidden) Object.assign(root.style, { display: "", position: "", left: "", top: "" });
  }
}

// Canvas -> ESC/POS bytes ("GS v 0" raster image, sent in bands).
function canvasToEscPos(canvas) {
  const width = PRINTER_DOTS;
  const height = Math.round((canvas.height * width) / canvas.width);
  const c = document.createElement("canvas");
  c.width = width;
  c.height = height;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(canvas, 0, 0, width, height);
  const { data } = ctx.getImageData(0, 0, width, height);

  const bytesPerRow = width / 8;
  const out = [0x1b, 0x40]; // ESC @  initialise
  for (let y0 = 0; y0 < height; y0 += BAND_LINES) {
    const lines = Math.min(BAND_LINES, height - y0);
    out.push(0x1d, 0x76, 0x30, 0x00, bytesPerRow & 0xff, bytesPerRow >> 8, lines & 0xff, lines >> 8);
    for (let y = y0; y < y0 + lines; y++) {
      for (let bx = 0; bx < bytesPerRow; bx++) {
        let byte = 0;
        for (let bit = 0; bit < 8; bit++) {
          const i = (y * width + bx * 8 + bit) * 4;
          const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          if (lum < 200) byte |= 0x80 >> bit; // keeps thin dashed rules
        }
        out.push(byte);
      }
    }
  }
  out.push(0x1b, 0x64, 0x04); // ESC d 4  feed 4 lines
  out.push(0x1d, 0x56, 0x42, 0x00); // GS V  partial cut (ignored without a cutter)
  return new Uint8Array(out);
}

// Prints the receipt currently in the page (#thermal-receipt-root) on the
// given printer. Jobs run one at a time; a failed job reconnects and retries
// once (except when Windows' own driver blocks a USB printer).
export function printReceiptDirect(printer) {
  const job = state.queue.then(async () => {
    const el = document.querySelector("#thermal-receipt-root .thermal-receipt");
    if (!el) throw new Error("Receipt not ready yet");
    const bytes = canvasToEscPos(await receiptCanvas(el));
    try {
      await send(printer, bytes);
    } catch (first) {
      if (first instanceof UsbBlockedError) throw first;
      console.warn("Printer write failed, reconnecting", first);
      await dropConnection();
      await new Promise((r) => setTimeout(r, 400));
      await send(printer, bytes);
    }
  });
  state.queue = job.catch(() => {});
  return job;
}
