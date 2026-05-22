export type ReportSummaryPoint = {
  label: string;
  from?: string;
  sales: number;
  count: number;
};

export type ReportSummaryOverview = {
  summary: {
    weekSales: number;
    prevWeekSales: number;
    monthSales: number;
    prevMonthSales: number;
    weekPayments: number;
    monthPayments: number;
    paidPayments: number;
    pendingPayments: number;
  };
  activity: {
    offersWeek: number;
    offersMonth: number;
    bookingsWeek: number;
    bookingsMonth: number;
  };
  trends: {
    weeks: ReportSummaryPoint[];
    months: ReportSummaryPoint[];
  };
};
