export type BusinessUnitResultItem = {
  unit: "bestallning" | "shuttle" | "sundra" | "other" | string;
  revenue: number;
  expectedValue: number;
  costs: number;
  paidCosts: number;
  pendingCosts: number;
  preliminaryResult: number;
  expectedResult: number;
  payments: number;
  invoices: number;
  bookings: number;
  offers: number;
  expenses: number;
};

export type BusinessUnitResultsOverview = {
  summary: {
    totalRevenue: number;
    totalExpectedValue: number;
    totalCosts: number;
    totalPaidCosts: number;
    totalPendingCosts: number;
    totalPreliminaryResult: number;
    totalExpectedResult: number;
  };
  units: BusinessUnitResultItem[];
};
