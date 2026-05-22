export type CustomerType = "private" | "company" | "association" | string;

export type CrmCustomer = {
  id: string;
  customerType: CustomerType;
  name: string;
  companyName?: string;
  orgNumber?: string;
  email?: string;
  phone?: string;
  city?: string;
  status: string;
  notes?: string;
  createdAt?: string;
  logCount: number;
  paymentCount: number;
  pendingPayments: number;
};

export type CustomerLog = {
  id: string;
  customerId: string;
  logType: string;
  title: string;
  message?: string;
  sourceType?: string;
  sourceId?: string;
  createdAt: string;
};

export type CustomerActivityItem = {
  id: string;
  kind: "offer" | "booking" | string;
  reference: string;
  title: string;
  fromText?: string;
  toText?: string;
  date?: string;
  time?: string;
  status: string;
  amount?: string;
};

export type CrmOverview = {
  customers: CrmCustomer[];
};
