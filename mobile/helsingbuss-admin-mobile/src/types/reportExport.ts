export type ReportExportRow = {
  id: string;
  source: "store" | "booking" | "offer" | string;
  sourceLabel: string;
  reference: string;
  date?: string;
  customer?: string;
  email?: string;
  phone?: string;
  title: string;
  amount: number;
  vatRate: number;
  vatAmount: number;
  exVat: number;
  status: string;
  currency: string;
};

export type ReportExportOverview = {
  summary: {
    totalRows: number;
    totalAmount: number;
    totalVat: number;
    totalExVat: number;
  };
  rows: ReportExportRow[];
};
