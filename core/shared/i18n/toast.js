// sonner's toast, with the message (and description) translated through the
// app dictionary. Drop-in replacement for `import { toast } from "sonner"`.
import { toast as sonnerToast } from "sonner";
import { t } from "./index";

const tr = (v) => (typeof v === "string" ? t(v) : v);
const wrapOpts = (opts) => (opts && typeof opts.description === "string" ? { ...opts, description: t(opts.description) } : opts);

function toast(message, opts) {
  return sonnerToast(tr(message), wrapOpts(opts));
}
for (const key of ["success", "error", "info", "warning", "message", "loading"]) {
  toast[key] = (message, opts) => sonnerToast[key](tr(message), wrapOpts(opts));
}
toast.dismiss = sonnerToast.dismiss;
toast.promise = sonnerToast.promise;
toast.custom = sonnerToast.custom;

export { toast };
