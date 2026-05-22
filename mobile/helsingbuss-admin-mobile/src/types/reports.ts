export type ReportsOverview = {
  offers: {
    total: number;
    incoming: number;
    answered: number;
    declined: number;
    accepted: number;
  };
  bookings: {
    total: number;
  };
  payments: {
    total: number;
    pending: number;
    paid: number;
    sales: number;
  };
  customers: {
    total: number;
  };
  partners: {
    total: number;
  };
  fleet: {
    vehicles: number;
    drivers: number;
  };
  sms: {
    total: number;
    sent: number;
  };
};
