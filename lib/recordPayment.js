import Customer from "@/models/Customers";
import Company from "@/models/Company";
import Payment from "@/models/Payment";
import SupplierPayment from "@/models/SupplierPayment";

// The one place money paid is recorded. Each call updates the balance
// exactly once AND creates exactly one payment record for that amount, so a
// payment can never lower a debt twice or exist without lowering it.
//
// Used by:
//   - manual customer payments (Payments tab)
//   - marking an order paid / partially paid (with `order`)
//   - marking a purchase paid (recordSupplierPayment, with `purchase`)

const cents = (n) => Math.round(n * 100) / 100;

// Records `amount` received from a customer: lowers their debt once (never
// below 0) and creates one Payment for the full amount received.
export async function recordCustomerPayment({ customerId, amount, order = null }) {
  const paid = cents(amount);
  const before = await Customer.findById(customerId).select("debt fullName");
  if (!before) throw new Error("Customer not found");

  const previousDebt = before.debt || 0;
  const newDebt = cents(Math.max(0, previousDebt - paid));
  await Customer.updateOne({ _id: customerId }, { $set: { debt: newDebt } });

  const payment = await Payment.create({
    customer: customerId,
    amount: paid,
    previousDebt,
    newDebt,
    source: order ? "order" : "manual",
    order: order || null,
  });

  return { payment, previousDebt, newDebt, customerName: before.fullName };
}

// Records `amount` paid to a company: lowers what we owe them once (never
// below 0) and creates one SupplierPayment. Pass affectsDebt: false for a
// purchase paid upfront - nothing was ever owed for it.
export async function recordSupplierPayment({ companyId, amount, purchase = null, admin = null, affectsDebt = true }) {
  const paid = cents(amount);
  const company = await Company.findById(companyId).select("debt name");
  if (!company) throw new Error("Company not found");

  const previousDebt = company.debt || 0;
  const newDebt = affectsDebt ? cents(Math.max(0, previousDebt - paid)) : previousDebt;
  if (affectsDebt) {
    await Company.updateOne({ _id: companyId }, { $set: { debt: newDebt } });
  }

  const payment = await SupplierPayment.create({
    company: companyId,
    purchase: purchase || null,
    amount: paid,
    previousDebt,
    newDebt,
    admin: admin?.id,
    adminName: admin?.adminname,
  });

  return { payment, previousDebt, newDebt, companyName: company.name };
}
