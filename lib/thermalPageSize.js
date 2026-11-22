// Makes the printed page exactly as big as the thermal receipt: 80mm wide
// and as tall as the receipt, with no margins. Without this the browser
// prints on a normal (A4/Letter) page and printer apps such as RawBT shrink
// that whole page down to the roll width - the receipt ends up tiny.
const STYLE_ID = "thermal-page-size";
const PX_PER_MM = 96 / 25.4;

function receiptHeightMm() {
  const el = document.querySelector("#thermal-receipt-root .thermal-receipt");
  if (!el) return 200;
  const root = el.closest("#thermal-receipt-root");
  // On normal pages the receipt is display:none until printing - show it
  // off-screen for a moment to measure it.
  const hidden = root && getComputedStyle(root).display === "none";
  if (hidden) Object.assign(root.style, { display: "block", position: "absolute", left: "-10000px", top: "0" });
  const h = el.getBoundingClientRect().height;
  if (hidden) Object.assign(root.style, { display: "", position: "", left: "", top: "" });
  // Generous bottom margin: some printer drivers keep a few mm unprintable,
  // which would otherwise cut off the last line.
  return Math.ceil(h / PX_PER_MM) + 18;
}

// keep = true: leave the page size in place (dedicated print pages);
// otherwise it's removed again after the print dialog closes.
export function applyThermalPageSize({ keep = false } = {}) {
  if (typeof document === "undefined") return;
  let style = document.getElementById(STYLE_ID);
  if (!style) {
    style = document.createElement("style");
    style.id = STYLE_ID;
    document.head.appendChild(style);
  }
  style.textContent = `@page { size: 80mm ${receiptHeightMm()}mm; margin: 0; }`;
  if (!keep) {
    window.addEventListener("afterprint", clearThermalPageSize, { once: true });
  }
}

export function clearThermalPageSize() {
  document.getElementById(STYLE_ID)?.remove();
}
