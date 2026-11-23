// Optional delivery tracking on an order - separate from the payment status
// (pending / partially paid / paid). An order with no delivery status simply
// isn't being delivered (picked up, or not tracked).
export const DELIVERY_STATUSES = [
  { value: "preparing", label: "Preparing", style: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200" },
  { value: "out_for_delivery", label: "Out for delivery", style: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300" },
  { value: "delivered", label: "Delivered", style: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300" },
  { value: "failed", label: "Returned / failed", style: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300" },
];
export const DELIVERY_VALUES = DELIVERY_STATUSES.map((s) => s.value);
export const deliveryInfo = (value) => DELIVERY_STATUSES.find((s) => s.value === value) || null;
