export type TrafficDeparture = {
  id: string;
  kind: string;
  sourceLabel: string;
  time: string;
  endTime?: string;
  title: string;
  route: string;
  driver: string;
  vehicle: string;
  status: string;
  statusKey: "ok" | "late" | "cancelled" | "completed" | string;
  delayMinutes: number;
};

export type LiveVehicle = {
  id: string;
  vehicleName: string;
  driverName: string;
  title: string;
  route: string;
  status: string;
  delayMinutes: number;
  lat?: number;
  lng?: number;
  speedKmh?: number;
  heading?: number;
  lastSeenAt?: string;
};

export type QuickTrafficStatus = {
  type: "ok" | "warning" | "danger" | string;
  text: string;
  time: string;
};

export type AdminTrafficOverview = {
  summary: {
    departuresToday: number;
    delayedToday: number;
    cancelledToday: number;
  };
  departures: TrafficDeparture[];
  liveVehicles: LiveVehicle[];
  quickStatus: QuickTrafficStatus[];
};
