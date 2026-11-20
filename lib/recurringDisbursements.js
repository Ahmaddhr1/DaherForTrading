import { connectToDB } from "@/lib/connectDb";
import RecurringDisbursement from "@/models/RecurringDisbursement";
import Disbursement from "@/models/Disbursement";

function currentMonthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

// Creates a real Disbursement for every active recurring template that's
// due and hasn't already run this month. Safe to call more than once a
// day (or to miss a day entirely) - `lastRunMonth` makes it idempotent
// within a given month, and a late catch-up run still fires as soon as
// today's date reaches the template's dayOfMonth.
export async function runDueRecurringDisbursements() {
  await connectToDB();

  const now = new Date();
  const monthKey = currentMonthKey(now);
  const dayOfMonth = now.getDate();

  const due = await RecurringDisbursement.find({
    active: true,
    dayOfMonth: { $lte: dayOfMonth },
    lastRunMonth: { $ne: monthKey },
  });

  const createdIds = [];
  for (const template of due) {
    const disbursement = await Disbursement.create({
      description: template.description,
      amount: template.amount,
      category: template.category,
      recurringSourceId: template._id,
    });
    template.lastRunMonth = monthKey;
    await template.save();
    createdIds.push(disbursement._id);
  }

  return { checked: due.length, created: createdIds.length, createdIds };
}
