export type ActiveOfferItem = {
  id: string;
  reference: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  departure?: string;
  destination?: string;
  tripType?: string;
  travelDate?: string;
  amount: number;
  status?: string;
};

export type ActiveOffersOverview = {
  summary: {
    total: number;
    value: number;
  };
  offers: ActiveOfferItem[];
};
