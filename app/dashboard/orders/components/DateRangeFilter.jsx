"use client";

// Reusable "From" / "To" <input type="date"> pair, styled to match the
// other filter controls on the orders pages (see e.g. the Category/Sort
// selects on the customer orders table). Values are kept as plain
// "YYYY-MM-DD" strings in the parent's state - the parent converts them to
// precise UTC instants with lib/dateUtils.js's localDayStartISO/
// localDayEndISO right before sending them to the API, same pattern used
// everywhere else in this app that filters by date.
export function DateRangeFilter({ startDate, endDate, onStartDateChange, onEndDateChange }) {
  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2">
        <span className="text-sm font-medium text-gray-700">From</span>
        <input
          type="date"
          value={startDate}
          onChange={(e) => onStartDateChange(e.target.value)}
          className="w-full sm:w-auto border rounded-md text-sm px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2">
        <span className="text-sm font-medium text-gray-700">To</span>
        <input
          type="date"
          value={endDate}
          onChange={(e) => onEndDateChange(e.target.value)}
          className="w-full sm:w-auto border rounded-md text-sm px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
    </>
  );
}
