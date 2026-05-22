export type BookingFilterKey =
  | "all"
  | "bookings"
  | "offers"
  | "shuttle"
  | "trips"
  | "tickets"
  | "today"
  | "waiting"
  | "archive";

export type AdminBookingFeedItem = {
  id: string;
  kind: "booking" | "offer" | string;
  sourceLabel?: string;
  title: string;
  reference: string;
  customer: string;
  date: string;
  startTime?: string;
  endTime?: string;
  passengers: number;
  status: string;
  statusKey: string;
  isArchived?: boolean;
  departurePlace?: string;
  destination?: string;
};

export type BookingGroup = {
  title: string;
  items: AdminBookingFeedItem[];
};
