"use client";

import { format } from "@/core/shared/i18n/date";
import { formatLL } from "@/core/shared/currency";
import { useT } from "@/core/shared/i18n/LangProvider";
import { useBusiness } from "@/core/shared/business";

const money = (n) => {
  const v = Number(n || 0);
  return `${v < 0 ? "-" : ""}$${Math.abs(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

// The end-of-day closing as a document: summary, the drawer count and the
// day's money movements. Shown on the Daily Closing page and printed (A4)
// from /print/closing.
export default function ClosingDoc({ data, day, opening = 0, counted = null, printable = false }) {
  const t = useT();
  const business = useBusiness();
  if (!data) return null;
  const rate = data.dollarRate;
  const ll = (n) => (rate > 0 ? formatLL(n, rate) : "");
  const expected = Number(opening || 0) + data.netCash;
  const hasCount = counted !== null && counted !== "" && !isNaN(Number(counted));
  const difference = hasCount ? Number(counted) - expected : null;

  const box = printable ? "border border-black" : "rounded-lg border border-gray-200 dark:border-gray-800";
  const muted = printable ? "" : "text-gray-500 dark:text-gray-400";
  const Row = ({ label, value, bold, tone }) => (
    <div className={`flex items-baseline justify-between gap-3 py-1 ${bold ? "font-bold" : ""}`}>
      <span>{label}</span>
      <span className={`text-end ${tone || ""}`}>
        {money(value)}
        {rate > 0 && <span className={`ms-2 text-xs font-normal ${muted}`}>≈ {ll(value)}</span>}
      </span>
    </div>
  );
  const List = ({ title, items, empty }) => (
    <div className={`${box} p-3`}>
      <p className="mb-2 font-semibold">{title}</p>
      {items.length === 0 ? (
        <p className={`text-sm ${muted}`}>{empty}</p>
      ) : (
        <table className="w-full text-sm">
          <tbody>
            {items.map((x) => (
              <tr key={x._id} className="align-top">
                <td className={`py-0.5 pe-2 whitespace-nowrap ${muted}`}>{format(new Date(x.createdAt), "HH:mm")}</td>
                <td className="py-0.5 pe-2">
                  {x.name}
                  {x.category ? <span className={`ms-1 text-xs ${muted}`}>({t(x.category)})</span> : null}
                </td>
                <td className="py-0.5 text-end whitespace-nowrap">{money(x.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  return (
    <div className={printable ? "mx-auto max-w-[178mm] bg-white text-black text-[13px]" : "space-y-4"}>
      {printable && (
        <div className="mb-4 text-center">
          <p className="text-xl font-bold">{business.name}</p>
          {business.phone && <p className="text-xs ltr-text">{business.phone}</p>}
          <p className="text-lg font-semibold">{t("Daily Closing")}</p>
          <p className="text-sm">{format(day, "EEEE, MMMM d, yyyy")}</p>
          {rate > 0 && <p className="text-xs">{t("Rate:")} {Number(rate).toLocaleString()} LL / $</p>}
        </div>
      )}

      <div className={`grid gap-4 ${printable ? "grid-cols-2" : "md:grid-cols-2"}`}>
        <div className={`${box} p-3`}>
          <p className="mb-1 font-semibold">{t("Today's money")}</p>
          <Row label={t("Collected from customers")} value={data.collected} tone={printable ? "" : "text-green-700 dark:text-green-400"} />
          <Row label={t("Paid to suppliers")} value={-data.paidToSuppliers} />
          <Row label={t("Expenses")} value={-data.expensesTotal} />
          <div className="mt-1 border-t border-gray-300 pt-1">
            <Row label={t("Net cash today")} value={data.netCash} bold />
          </div>
        </div>

        <div className={`${box} p-3`}>
          <p className="mb-1 font-semibold">{t("Cash drawer")}</p>
          <Row label={t("Opening cash")} value={Number(opening || 0)} />
          <Row label={t("Net cash today")} value={data.netCash} />
          <div className="mt-1 border-t border-gray-300 pt-1">
            <Row label={t("Should be in the drawer")} value={expected} bold />
          </div>
          {hasCount && (
            <>
              <Row label={t("Counted")} value={Number(counted)} />
              <Row
                label={difference === 0 ? t("Matches") : difference > 0 ? t("Extra") : t("Missing")}
                value={difference}
                bold
                tone={printable ? "" : Math.abs(difference) < 0.005 ? "text-green-700 dark:text-green-400" : "text-red-600 dark:text-red-400"}
              />
            </>
          )}
        </div>

        <div className={`${box} p-3`}>
          <p className="mb-1 font-semibold">{t("Sales")}</p>
          <div className="flex justify-between py-1">
            <span>{t("Orders today")}</span>
            <span>{data.sales.count}</span>
          </div>
          <Row label={t("Sales total")} value={data.sales.total} />
          <Row label={t("Still unpaid from today's orders")} value={data.sales.unpaid} />
        </div>

        <div className={`${box} p-3`}>
          <p className="mb-1 font-semibold">{t("Balances (now)")}</p>
          <Row label={t("Customers owe us")} value={data.owedByCustomers} />
          <Row label={t("We owe suppliers")} value={data.owedToSuppliers} />
        </div>
      </div>

      <div className={`grid gap-4 ${printable ? "mt-4 grid-cols-1" : "lg:grid-cols-3"}`}>
        <List title={t("Payments collected")} items={data.payments} empty={t("No payments today.")} />
        <List title={t("Supplier payments")} items={data.supplierPayments} empty={t("No supplier payments today.")} />
        <List title={t("Expenses")} items={data.expenses} empty={t("No expenses today.")} />
      </div>
      {printable && <p className="mt-6 text-center text-[11px]">{t("Generated")} {format(new Date(), "MMM d, yyyy h:mm a")}</p>}
    </div>
  );
}
