// Direct printing to an ESC/POS thermal printer from Chrome/Edge on a
// computer, using Web Serial. A Bluetooth printer paired with Windows/macOS
// (and many USB receipt printers) shows up as a serial (COM) port; we send
// it the receipt as a black-and-white image, so Arabic text and the exact
// on-screen layout print as-is - no print dialog, page sizes or margins.
import { toCanvas } from "html-to-image";
import { isTouchDevice } from "@/lib/isTouchDevice";

const PRINTER_DOTS = 576; // printable width of an 80mm printer at 203 dpi
const BAND_LINES = 128; // image rows per raster command (small printer buffers)
const CHUNK_BYTES = 2048;

export function isDirectPrintSupported() {
  return typeof navigator !== "undefined" && "serial" in navigator && !isTouchDevice();
}

// The printer chosen earlier (Chrome remembers the permission per site).
export async function getSavedPrinter() {
  if (!isDirectPrintSupported()) return null;
  const ports = await navigator.serial.getPorts();
  return ports[0] || null;
}

// Asks the user to pick the printer's port (browser prompt).
export async function choosePrinter() {
  const old = await getSavedPrinter();
  const port = await navigator.serial.requestPort();
  if (old && old !== port && typeof old.forget === "function") {
    try {
      await old.forget();
    } catch {}
  }
  return port;
}

// Renders a receipt element to a 576-dot-wide canvas.
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

async function send(port, bytes) {
  if (!port.readable && !port.writable) {
    await port.open({ baudRate: 9600 });
  }
  const writer = port.writable.getWriter();
  try {
    for (let i = 0; i < bytes.length; i += CHUNK_BYTES) {
      await writer.write(bytes.subarray(i, i + CHUNK_BYTES));
    }
  } finally {
    writer.releaseLock();
    try {
      await port.close();
    } catch {}
  }
}

// Prints the receipt currently in the page (#thermal-receipt-root).
export async function printReceiptDirect(port) {
  const el = document.querySelector("#thermal-receipt-root .thermal-receipt");
  if (!el) throw new Error("Receipt not ready yet");
  const canvas = await receiptCanvas(el);
  await send(port, canvasToEscPos(canvas));
}
