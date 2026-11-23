// date-fns `format` that follows the app language (Arabic month/day names
// when Arabic is selected). Drop-in replacement for `import { format } from
// "date-fns"` in UI code.
import { format as dfFormat } from "date-fns";
import { ar } from "date-fns/locale";
import { getCurrentLang } from "./index";

export function format(date, pattern, options = {}) {
  if (getCurrentLang() === "ar" && !options.locale) {
    // literal English words inside patterns, e.g. "MMM d 'at' h:mm a"
    const arPattern = pattern.replace(/'at'/g, "'في'");
    return dfFormat(date, arPattern, { ...options, locale: ar });
  }
  return dfFormat(date, pattern, options);
}
