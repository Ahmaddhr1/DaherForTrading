// Shared date-range resolution for dashboard filters.
// Supported ranges: today, week, month, year, all, custom
export function resolveDateRange(range, startDateParam, endDateParam) {
  const now = new Date();

  switch (range) {
    case "today": {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      return { start, end };
    }
    case "week": {
      const day = now.getDay();
      const diffToMonday = (day === 0 ? -6 : 1) - day;
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }
    case "month": {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      return { start, end };
    }
    case "year": {
      const start = new Date(now.getFullYear(), 0, 1);
      const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      return { start, end };
    }
    case "custom": {
      const start = startDateParam ? new Date(startDateParam) : new Date(0);
      start.setHours(0, 0, 0, 0);
      const end = endDateParam ? new Date(endDateParam) : now;
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }
    case "all":
    default: {
      const start = new Date(0);
      const end = new Date(8640000000000000);
      return { start, end };
    }
  }
}
