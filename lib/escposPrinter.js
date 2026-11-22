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
import { isTouchDevice } from "@/lib/isTouchDevice";

const PRINTER_DOTS = 576; // printable width of an 80mm printer at 203 dpi
const BAND_LINES = 128; // image rows per raster command (small printer buffers)
const CHUNK_BYTES = 2048;
const STORAGE_KEY = "thermal-printer";

// One connection shared by every page for the whole session.
const state = { port: null, writer: null, queue: Promise.resolve(), listeners: new Set() };

const notify = () => state.listeners.forEach((fn) => fn(state.port));
export function onPrinterChange(fn) {
  state.listeners.add(fn);
  return () => state.listeners.delete(fn);
}

export function isDirectPrintSupported() {
  return typeof navigator !== "undefined" && "serial" in navigator && !isTouchDevice();
}

function identity(port, ports) {
  const info = port.getInfo?.() || {};
  return { ...info, index: ports.indexOf(port) };
}
function readSaved() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
  } catch {
    return null;
  }
}
function save(port, ports) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(identity(port, ports)));
  } catch {}
}

let serialEventsBound = false;
function bindSerialEvents() {
  if (serialEventsBound || !isDirectPrintSupported()) return;
  serialEventsBound = true;
  navigator.serial.addEventListener?.("disconnect", (e) => {
    if (e.target === state.port) {
      dropConnection();
      notify();
    }
  });
  window.addEventListener("pagehide", () => {
    dropConnection();
  });
}

// The printer chosen earlier, or null.
export async function getSavedPrinter() {
  if (!isDirectPrintSupported()) return null;
  bindSerialEvents();
  if (state.port) return state.port;
  const ports = await navigator.serial.getPorts();
  if (!ports.length) return null;
  const saved = readSaved();
  let port = null;
  if (saved) {
    const same = (p) => {
      const i = p.getInfo?.() || {};
      return (
        (saved.usbVendorId === undefined || i.usbVendorId === saved.usbVendorId) &&
        (saved.usbProductId === undefined || i.usbProductId === saved.usbProductId) &&
        (saved.bluetoothServiceClassId === undefined || i.bluetoothServiceClassId === saved.bluetoothServiceClassId)
      );
    };
    const matches = ports.filter(same);
    port = matches.length === 1 ? matches[0] : ports[saved.index] && same(ports[saved.index]) ? ports[saved.index] : matches[0] || null;
  }
  if (!port && ports.length === 1) port = ports[0];
  state.port = port;
  return port;
}

// Asks the user to pick the printer's port (browser prompt) and remembers it.
export async function choosePrinter() {
  bindSerialEvents();
  const port = await navigator.serial.requestPort();
  if (port !== state.port) await dropConnection();
  state.port = port;
  save(port, await navigator.serial.getPorts());
  notify();
  return port;
}

async function dropConnection() {
  const { port, writer } = state;
  state.writer = null;
  try {
    writer?.releaseLock();
  } catch {}
  try {
    if (port?.writable || port?.readable) await port.close();
  } catch {}
}

async function getWriter(port) {
  if (state.writer && state.port === port && port.writable) return state.writer;
  state.writer = null;
  if (!port.writable) {
    try {
      await port.open({ baudRate: 9600 });
    } catch (err) {
      // Already open (e.g. from this tab before a reload): reuse it.
      if (!(err?.name === "InvalidStateError" && port.writable)) throw err;
    }
  }
  state.port = port;
  state.writer = port.writable.getWriter();
  return state.writer;
}

async function send(port, bytes) {
  const writer = await getWriter(port);
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

// Prints the receipt currently in the page (#thermal-receipt-root). Jobs run
// one at a time; a failed job reconnects and retries once.
export function printReceiptDirect(port) {
  const job = state.queue.then(async () => {
    const el = document.querySelector("#thermal-receipt-root .thermal-receipt");
    if (!el) throw new Error("Receipt not ready yet");
    const bytes = canvasToEscPos(await receiptCanvas(el));
    try {
      await send(port, bytes);
    } catch (first) {
      console.warn("Printer write failed, reconnecting", first);
      await dropConnection();
      await new Promise((r) => setTimeout(r, 400));
      await send(port, bytes);
    }
  });
  state.queue = job.catch(() => {});
  return job;
}
