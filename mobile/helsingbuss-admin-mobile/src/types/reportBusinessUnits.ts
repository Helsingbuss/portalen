export type BusinessUnitReportItem = {
  key: string;
  label: string;
  totalPayments: number;
  paidPayments: number;
  pendingPayments: number;
  refundedPayments: number;
  sales: number;
  salesToday: number;
  salesWeek: number;
  salesMonth: number;
};

export type BusinessUnitsReport = {
  units: BusinessUnitReportItem[];
  totals: {
    sales: number;
    paidPayments: number;
    pendingPayments: number;
    totalPayments: number;
  };
};
