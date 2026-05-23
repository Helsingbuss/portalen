export type DriverTripStatus = "confirmed" | "request" | "planned";

export type DriverTrip = {
  id: string;
  title: string;
  customer: string;
  vehicle: string;
  date: string;
  startTime: string;
  endTime: string;
  from: string;
  to: string;
  passengers: number;
  status: DriverTripStatus;
};

export const DRIVER_TRIPS: DriverTrip[] = [
  {
    id: "driver-trip-1",
    title: "Linje 200 – Ullared",
    customer: "ReseGlädje AB",
    vehicle: "HB-123",
    date: "Lördag 16 maj 2026",
    startTime: "07:00",
    endTime: "19:30",
    from: "Helsingborg C",
    to: "Ullared",
    passengers: 53,
    status: "confirmed",
  },
  {
    id: "driver-trip-2",
    title: "Airport Shuttle Kastrup",
    customer: "Nordic Logistics",
    vehicle: "HB-305",
    date: "Lördag 16 maj 2026",
    startTime: "10:30",
    endTime: "12:00",
    from: "Helsingborg C",
    to: "Kastrup Airport",
    passengers: 23,
    status: "request",
  },
  {
    id: "driver-trip-3",
    title: "Kryssning – Köpenhamn",
    customer: "Ocean Events AB",
    vehicle: "HB-305",
    date: "Lördag 16 maj 2026",
    startTime: "13:00",
    endTime: "22:00",
    from: "Helsingborg C",
    to: "Köpenhamn",
    passengers: 41,
    status: "confirmed",
  },
  {
    id: "driver-trip-4",
    title: "Bröllop – Sofiero Slott",
    customer: "Privatkund",
    vehicle: "HB-210",
    date: "Söndag 17 maj 2026",
    startTime: "14:00",
    endTime: "23:30",
    from: "Helsingborg C",
    to: "Sofiero Slott",
    passengers: 48,
    status: "planned",
  },
];

export function getDriverStatusLabel(status: DriverTripStatus) {
  if (status === "confirmed") return "Bekräftad";
  if (status === "request") return "Förfrågan";
  if (status === "planned") return "Planerad";
  return "Okänd";
}
