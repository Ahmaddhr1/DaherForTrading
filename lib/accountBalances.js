import Payment from "@/models/Payment";
import Disbursement from "@/models/Disbursement";
import Purchase from "@/models/Purchase";
import SupplierPayment from "@/models/SupplierPayment";

// An account's balance is never stored - it's always derived from
// openingBalance plus every transaction that references it, so it can
// never drift out of sync with the underlying records:
//   + customer payments deposited into it
//   - disbursements paid out of it
//   - purchases paid out of it at the time of purchase
//   - supplier debt payments paid out of it
//
// Returns a Map of accountId (string) -> net movement (can be negative).
// Callers add this to each account's openingBalance themselves.
export async function computeAccountMovements() {
  const [paymentsIn, disbursementsOut, purchasesOut, supplierPaymentsOut] = await Promise.all([
    Payment.aggregate([
      { $match: { account: { $ne: null } } },
      { $group: { _id: "$account", total: { $sum: "$amount" } } },
    ]),
    Disbursement.aggregate([
      { $match: { account: { $ne: null } } },
      { $group: { _id: "$account", total: { $sum: "$amount" } } },
    ]),
    Purchase.aggregate([
      { $match: { paid: true, account: { $ne: null } } },
      { $group: { _id: "$account", total: { $sum: "$total" } } },
    ]),
    SupplierPayment.aggregate([
      { $match: { account: { $ne: null } } },
      { $group: { _id: "$account", total: { $sum: "$amount" } } },
    ]),
  ]);

  const movements = new Map();
  const add = (id, delta) => {
    const key = id.toString();
    movements.set(key, (movements.get(key) || 0) + delta);
  };

  paymentsIn.forEach((row) => add(row._id, row.total));
  disbursementsOut.forEach((row) => add(row._id, -row.total));
  purchasesOut.forEach((row) => add(row._id, -row.total));
  supplierPaymentsOut.forEach((row) => add(row._id, -row.total));

  return movements;
}

export function balanceFor(account, movements) {
  const movement = movements.get(account._id.toString()) || 0;
  return (account.openingBalance || 0) + movement;
}
