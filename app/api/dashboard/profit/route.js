import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/connectDb";
import Order from "@/models/Orders";
import Purchase from "@/models/Purchase";
import Disbursement from "@/models/Disbursement";
import Payment from "@/models/Payment";
import { resolveDateRange } from "@/lib/dashboardRange";

export async function GET(req) {
  try {
    await connectToDB();

    const { searchParams } = new URL(req.url);
    const range = searchParams.get("range") || "all";
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Calculate time periods
    const startOfLastWeek = new Date(now);
    startOfLastWeek.setDate(startOfLastWeek.getDate() - 7 - startOfLastWeek.getDay() + 1);
    startOfLastWeek.setHours(0, 0, 0, 0);

    const endOfLastWeek = new Date(startOfLastWeek);
    endOfLastWeek.setDate(endOfLastWeek.getDate() + 6);
    endOfLastWeek.setHours(23, 59, 59, 999);

    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    endOfLastMonth.setHours(23, 59, 59, 999);

    // Get all orders, purchases, disbursements and payments once
    const allOrders = await Order.find({}).lean();
    const allPurchases = await Purchase.find({}).lean();
    const allDisbursements = await Disbursement.find({}).lean();
    const allPayments = await Payment.find({}).lean();

    const { start: selectedStart, end: selectedEnd } = resolveDateRange(
      range,
      startDateParam,
      endDateParam
    );

    // Initialize all required variables
    const timePeriods = {
      today: initStats(),
      lastWeek: initStats(),
      lastMonth: initStats(),
      allTime: initStats(),
      selected: initStats(),
    };

    // Process all orders
    allOrders.forEach((order) => {
      const { status, profit, amountpaid, total, remainingBalance, createdAt } = order;
      const isToday = createdAt >= startOfToday;
      const isLastWeek = createdAt >= startOfLastWeek && createdAt <= endOfLastWeek;
      const isLastMonth = createdAt >= startOfLastMonth && createdAt <= endOfLastMonth;
      const isSelected = createdAt >= selectedStart && createdAt <= selectedEnd;

      // Process based on status
      if (status === "paid") {
        updateStats(timePeriods.allTime, {
          realProfit: profit,
          paidOrdersTotal: total,
          paidOrdersCount: 1
        });

        if (isToday) updateStats(timePeriods.today, {
          realProfit: profit,
          paidOrdersTotal: total,
          paidOrdersCount: 1
        });
        if (isLastWeek) updateStats(timePeriods.lastWeek, {
          realProfit: profit,
          paidOrdersTotal: total,
          paidOrdersCount: 1
        });
        if (isLastMonth) updateStats(timePeriods.lastMonth, {
          realProfit: profit,
          paidOrdersTotal: total,
          paidOrdersCount: 1
        });
        if (isSelected) updateStats(timePeriods.selected, {
          realProfit: profit,
          paidOrdersTotal: total,
          paidOrdersCount: 1
        });
      }
      else if (status === "pending") {
        updateStats(timePeriods.allTime, {
          expectedProfit: profit,
          pendingOrdersTotal: total,
          pendingOrdersCount: 1
        });

        if (isToday) updateStats(timePeriods.today, {
          expectedProfit: profit,
          pendingOrdersTotal: total,
          pendingOrdersCount: 1
        });
        if (isLastWeek) updateStats(timePeriods.lastWeek, {
          expectedProfit: profit,
          pendingOrdersTotal: total,
          pendingOrdersCount: 1
        });
        if (isLastMonth) updateStats(timePeriods.lastMonth, {
          expectedProfit: profit,
          pendingOrdersTotal: total,
          pendingOrdersCount: 1
        });
        if (isSelected) updateStats(timePeriods.selected, {
          expectedProfit: profit,
          pendingOrdersTotal: total,
          pendingOrdersCount: 1
        });
      }
      else if (status === "partiallyPaid") {
        // For partially paid, real profit is based on paid ratio
        const paidRatio = total > 0 ? amountpaid / total : 0;
        const realizedProfit = profit * paidRatio;
        const expectedProfit = profit - realizedProfit;

        updateStats(timePeriods.allTime, {
          realProfit: realizedProfit,
          expectedProfit: expectedProfit,
          partialOrdersTotal: total,
          partialPaidAmount: amountpaid,
          partialOrdersCount: 1
        });

        if (isToday) updateStats(timePeriods.today, {
          realProfit: realizedProfit,
          expectedProfit: expectedProfit,
          partialOrdersTotal: total,
          partialPaidAmount: amountpaid,
          partialOrdersCount: 1
        });
        if (isLastWeek) updateStats(timePeriods.lastWeek, {
          realProfit: realizedProfit,
          expectedProfit: expectedProfit,
          partialOrdersTotal: total,
          partialPaidAmount: amountpaid,
          partialOrdersCount: 1
        });
        if (isLastMonth) updateStats(timePeriods.lastMonth, {
          realProfit: realizedProfit,
          expectedProfit: expectedProfit,
          partialOrdersTotal: total,
          partialPaidAmount: amountpaid,
          partialOrdersCount: 1
        });
        if (isSelected) updateStats(timePeriods.selected, {
          realProfit: realizedProfit,
          expectedProfit: expectedProfit,
          partialOrdersTotal: total,
          partialPaidAmount: amountpaid,
          partialOrdersCount: 1
        });
      }
    });

    // Process all purchases (money spent restocking from companies)
    allPurchases.forEach((purchase) => {
      const { total, createdAt } = purchase;
      const isToday = createdAt >= startOfToday;
      const isLastWeek = createdAt >= startOfLastWeek && createdAt <= endOfLastWeek;
      const isLastMonth = createdAt >= startOfLastMonth && createdAt <= endOfLastMonth;
      const isSelected = createdAt >= selectedStart && createdAt <= selectedEnd;

      updateStats(timePeriods.allTime, { purchasesTotal: total });
      if (isToday) updateStats(timePeriods.today, { purchasesTotal: total });
      if (isLastWeek) updateStats(timePeriods.lastWeek, { purchasesTotal: total });
      if (isLastMonth) updateStats(timePeriods.lastMonth, { purchasesTotal: total });
      if (isSelected) updateStats(timePeriods.selected, { purchasesTotal: total });
    });

    // Process all disbursements (cash paid out of the business)
    allDisbursements.forEach((disbursement) => {
      const { amount, createdAt } = disbursement;
      const isToday = createdAt >= startOfToday;
      const isLastWeek = createdAt >= startOfLastWeek && createdAt <= endOfLastWeek;
      const isLastMonth = createdAt >= startOfLastMonth && createdAt <= endOfLastMonth;
      const isSelected = createdAt >= selectedStart && createdAt <= selectedEnd;

      updateStats(timePeriods.allTime, { disbursementsTotal: amount });
      if (isToday) updateStats(timePeriods.today, { disbursementsTotal: amount });
      if (isLastWeek) updateStats(timePeriods.lastWeek, { disbursementsTotal: amount });
      if (isLastMonth) updateStats(timePeriods.lastMonth, { disbursementsTotal: amount });
      if (isSelected) updateStats(timePeriods.selected, { disbursementsTotal: amount });
    });

    // Process all customer payments actually collected (cash basis)
    allPayments.forEach((payment) => {
      const { amount, createdAt } = payment;
      const isToday = createdAt >= startOfToday;
      const isLastWeek = createdAt >= startOfLastWeek && createdAt <= endOfLastWeek;
      const isLastMonth = createdAt >= startOfLastMonth && createdAt <= endOfLastMonth;
      const isSelected = createdAt >= selectedStart && createdAt <= selectedEnd;

      updateStats(timePeriods.allTime, { paymentsCollected: amount });
      if (isToday) updateStats(timePeriods.today, { paymentsCollected: amount });
      if (isLastWeek) updateStats(timePeriods.lastWeek, { paymentsCollected: amount });
      if (isLastMonth) updateStats(timePeriods.lastMonth, { paymentsCollected: amount });
      if (isSelected) updateStats(timePeriods.selected, { paymentsCollected: amount });
    });

    // Calculate derived values
    calculateDerivedStats(timePeriods.allTime);
    calculateDerivedStats(timePeriods.today);
    calculateDerivedStats(timePeriods.lastWeek);
    calculateDerivedStats(timePeriods.lastMonth);
    calculateDerivedStats(timePeriods.selected);

    return NextResponse.json({
      success: true,
      range,
      data: timePeriods
    });

  } catch (error) {
    console.error("Error in profit dashboard:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch profit statistics" },
      { status: 500 }
    );
  }
}

// Helper functions
function initStats() {
  return {
    // Profit
    realProfit: 0,
    expectedProfit: 0,
    
    // Paid orders
    paidOrdersTotal: 0,
    paidOrdersCount: 0,
    
    // Pending orders
    pendingOrdersTotal: 0,
    pendingOrdersCount: 0,
    
    // Partially paid orders
    partialOrdersTotal: 0,
    partialPaidAmount: 0,
    partialOrdersCount: 0,
    
    // Purchases (money spent restocking from companies)
    purchasesTotal: 0,

    // Disbursements (cash paid out of the business)
    disbursementsTotal: 0,

    // Payments actually collected from customers (cash basis)
    paymentsCollected: 0,

    // Calculated fields (will be added later)
    totalAllOrders: 0,
    totalAllOrdersValue: 0,
    totalReceivedAmount: 0,
    totalPendingAmount: 0,
    netRevenue: 0,
    revenueInHand: 0,
    salesMinusPayments: 0
  };
}

function updateStats(stats, updates) {
  Object.keys(updates).forEach(key => {
    stats[key] += updates[key];
  });
}

function calculateDerivedStats(stats) {
  stats.totalAllOrders = stats.paidOrdersCount + stats.pendingOrdersCount + stats.partialOrdersCount;
  stats.totalAllOrdersValue = stats.paidOrdersTotal + stats.pendingOrdersTotal + stats.partialOrdersTotal;
  stats.totalReceivedAmount = stats.paidOrdersTotal + stats.partialPaidAmount;
  stats.totalPendingAmount = stats.pendingOrdersTotal + (stats.partialOrdersTotal - stats.partialPaidAmount);
  // Net revenue nets sales revenue against money spent on purchases from
  // companies. This is allowed to go negative when purchases outweigh sales.
  stats.netRevenue = stats.totalAllOrdersValue - stats.purchasesTotal;
  // Revenue in hand further deducts disbursements (cash paid out) from net
  // revenue. Can go negative.
  stats.revenueInHand = stats.netRevenue - stats.disbursementsTotal;
  // Sales vs actual cash collected from customers (cash-basis gap). Can go negative.
  stats.salesMinusPayments = stats.totalAllOrdersValue - stats.paymentsCollected;
}