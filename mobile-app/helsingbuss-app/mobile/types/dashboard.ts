export type OfferStatus = "inkommen" | "besvarad" | "godkand" | "avbockad";

export type Offer = {
  id: string;
  offerNumber: string;
  customerName?: string;
  from: string;
  to: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:mm
  passengers?: number;
  status: OfferStatus;
  amountSek?: number;
};

export type BookingStatus = "bokad" | "genomford" | "avbokad";

export type Booking = {
  id: string;
  bookingNumber: string;
  customerName?: string;
  from: string;
  to: string;
  date: string; // YYYY-MM-DD
  time?: string;
  passengers?: number;
  status: BookingStatus;
  amountSek?: number;
};

export type DashboardSummary = {
  periodLabel: string; // t.ex. "2026-01-01  2026-12-31"
  offers: {
    answeredCount: number;
    unansweredCount: number;
    approvedCount: number;
    answeredValueSek: number;
    approvedValueSek: number;
  };
  bookings: {
    bookedCount: number;
    completedCount: number;
    bookedValueSek: number;
    completedValueSek: number;
  };
  tickets: {
    soldCount: number;
    revenueSek: number;
  };
};

export type NewsItem = {
  id: string;
  title: string;
  subtitle?: string;
  createdAt: string; // ISO
};
