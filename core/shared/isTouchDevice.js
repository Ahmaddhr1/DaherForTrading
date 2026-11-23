// Phones and tablets (touch-first devices). Used where printing has to work
// differently: mobile browsers run window.print() asynchronously, so pages
// that toggle print-only state around it need a dedicated print page there.
export function isTouchDevice() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(pointer: coarse)").matches ||
    /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || "")
  );
}
