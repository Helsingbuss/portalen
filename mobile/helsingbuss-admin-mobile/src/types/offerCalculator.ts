export type OfferCalculatorOffer = {
  id: string;
  reference: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  departure?: string;
  destination?: string;
  travelDate?: string;
  status?: string;
  calculator?: any;
  priceExVat?: number;
  priceVatAmount?: number;
  priceTotal?: number;
  priceVatRate?: number;
  priceNote?: string;
  proposalStatus?: string;
};

export type OfferCalculatorResult = {
  exVat: number;
  vatAmount: number;
  total: number;
  vatRate: number;
};
