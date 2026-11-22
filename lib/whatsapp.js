// WhatsApp links need the full international number (country code, no "+"
// or leading zeros). Phone numbers here are usually stored as local
// Lebanese numbers (e.g. 76522837 or 03123456), so those get the 961
// country code; numbers that already include a country code are kept.
export const DEFAULT_COUNTRY_CODE = "961";

export function whatsappNumber(phone) {
  let digits = String(phone ?? "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("00")) digits = digits.slice(2); // 00961... -> 961...
  if (digits.startsWith(DEFAULT_COUNTRY_CODE) && digits.length > 9) return digits;
  digits = digits.replace(/^0+/, ""); // local trunk prefix (03 -> 3)
  return digits.length <= 8 ? DEFAULT_COUNTRY_CODE + digits : digits;
}

export function whatsappUrl(phone, text) {
  const n = whatsappNumber(phone);
  const q = text ? `?text=${encodeURIComponent(text)}` : "";
  return `https://wa.me/${n}${q}`;
}
