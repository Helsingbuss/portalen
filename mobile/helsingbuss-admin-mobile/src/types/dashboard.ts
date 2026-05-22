export type WeekBookingItem = {
  day: string;
  date?: string;
  count: number;
};

export type RecentActivityItem = {
  type: "booking" | "offer" | "ticket" | "message" | string;
  title: string;
  reference?: string;
  customer?: string;
  description?: string;
  time?: string;
  created_at?: string;
};

export type AdminDashboardSummary = {
  todayBookings: number;
  todayBookingsDiff: number;

  activeOffers: number;
  activeOffersDiff: number;

  upcomingDepartures: number;
  unreadMessages: number;

  trafficStatus: string;
  trafficText: string;

  weekBookings: WeekBookingItem[];
  recentActivity: RecentActivityItem[];
};
