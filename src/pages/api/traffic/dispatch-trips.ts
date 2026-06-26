import type { NextApiRequest, NextApiResponse } from "next";
import * as admin from "@/lib/supabaseAdmin";

const supabase =
  (admin as any).supabaseAdmin ||
  (admin as any).supabase ||
  (admin as any).default;

type SourceType = "helsingbuss" | "sundra" | "flygbuss";

type DispatchTripStatus =
  | "planned"
  | "active"
  | "delayed"
  | "needs_driver"
  | "needs_vehicle"
  | "partner_pending"
  | "completed"
  | "cancelled";

type DispatchTrip = {
  id: string;
  sourceType: SourceType;
  sourceLabel: string;
  sourceId: string | null;
  time: string | null;
  date: string | null;
  title: string;
  route: string;
  from: string | null;
  to: string | null;
  driver: string;
  vehicle: string;
  status: string;
  statusCode: DispatchTripStatus;
  passengers: number | null;
  assignmentId?: string | null;
};

type AssignmentRow = {
  id: string;
  source_type: SourceType;
  source_id: string;
  status: string | null;
  notes: string | null;
  planned_start_at: string | null;
  planned_end_at: string | null;
  traffic_drivers?: {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
    status: string | null;
  } | null;
  traffic_vehicles?: {
    id: string;
    name: string;
    registration_number: string | null;
    owner_type: "own" | "partner";
    partner_name: string | null;
    status: string | null;
  } | null;
};

function tidyTime(value: any) {
  if (!value) return null;
  const text = String(value);
  if (text.includes(":")) return text.slice(0, 5);
  if (text.length >= 4) return `${text.slice(0, 2)}:${text.slice(2, 4)}`;
  return text;
}

function statusCode(status: any): DispatchTripStatus {
  const s = String(status || "").toLowerCase();

  if (s.includes("cancel") || s.includes("avbok")) return "cancelled";
  if (s.includes("slut") || s.includes("complete") || s.includes("klar")) return "completed";
  if (s.includes("delay") || s.includes("försen")) return "delayed";
  if (s.includes("active") || s.includes("pågående") || s.includes("in_traffic")) return "active";
  if (s.includes("needs")) return "needs_driver";

  return "planned";
}

function assignmentStatusCode(status: any): DispatchTripStatus {
  const s = String(status || "").toLowerCase();

  if (s === "in_traffic") return "active";
  if (s === "completed") return "completed";
  if (s === "cancelled") return "cancelled";
  if (s === "needs_action") return "needs_driver";
  if (s === "assigned") return "planned";

  return "planned";
}

function assignmentStatusLabel(status: any) {
  switch (String(status || "").toLowerCase()) {
    case "planned":
      return "Planerad";
    case "assigned":
      return "Tilldelad";
    case "in_traffic":
      return "I trafik";
    case "completed":
      return "Klar";
    case "cancelled":
      return "Avbruten";
    case "needs_action":
      return "Kräver åtgärd";
    default:
      return "Planerad";
  }
}

function routeText(from: any, to: any) {
  const a = from || "Okänd start";
  const b = to || "Okänd destination";
  return `${a} → ${b}`;
}

function assignmentKey(sourceType: SourceType, sourceId: string | null) {
  return `${sourceType}:${sourceId || ""}`;
}

function vehicleName(vehicle: AssignmentRow["traffic_vehicles"]) {
  if (!vehicle) return "Saknas";

  if (vehicle.owner_type === "partner") {
    return `${vehicle.name}${vehicle.partner_name ? ` · ${vehicle.partner_name}` : ""}`;
  }

  return vehicle.name;
}

function applyAssignments(trips: DispatchTrip[], assignments: AssignmentRow[]) {
  const assignmentMap = new Map<string, AssignmentRow>();

  for (const assignment of assignments) {
    assignmentMap.set(assignmentKey(assignment.source_type, assignment.source_id), assignment);
  }

  return trips.map((trip) => {
    if (!trip.sourceId) return trip;

    const assignment = assignmentMap.get(assignmentKey(trip.sourceType, trip.sourceId));
    if (!assignment) return trip;

    return {
      ...trip,
      assignmentId: assignment.id,
      driver: assignment.traffic_drivers?.name || "Saknas",
      vehicle: vehicleName(assignment.traffic_vehicles),
      status: assignmentStatusLabel(assignment.status),
      statusCode: assignmentStatusCode(assignment.status),
    };
  });
}

async function getAssignments() {
  const { data, error } = await supabase
    .from("traffic_trip_assignments")
    .select(`
      id,
      source_type,
      source_id,
      status,
      notes,
      planned_start_at,
      planned_end_at,
      traffic_drivers (
        id,
        name,
        phone,
        email,
        status
      ),
      traffic_vehicles (
        id,
        name,
        registration_number,
        owner_type,
        partner_name,
        status
      )
    `);

  if (error) throw error;

  return (data || []) as AssignmentRow[];
}

async function getHelsingbussBookings(date?: string) {
  let query = supabase
    .from("bookings")
    .select("id,booking_number,status,contact_person,customer_name,passengers,departure_place,destination,departure_date,departure_time,return_departure,return_destination,return_date,return_time")
    .order("departure_date", { ascending: true })
    .order("departure_time", { ascending: true })
    .limit(80);

  if (date) query = query.eq("departure_date", date);

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map((row: any): DispatchTrip => {
    const from = row.departure_place || null;
    const to = row.destination || null;

    return {
      id: `booking-${row.id}`,
      sourceType: "helsingbuss",
      sourceLabel: "Helsingbuss",
      sourceId: row.id,
      date: row.departure_date || null,
      time: tidyTime(row.departure_time),
      title: "Beställningstrafik",
      route: routeText(from, to),
      from,
      to,
      driver: "Saknas",
      vehicle: "Saknas",
      status: row.status || "Planerad",
      statusCode: statusCode(row.status),
      passengers: row.passengers ?? null,
    };
  });
}

async function getSundraDepartures(date?: string) {
  let query = supabase
    .from("sundra_departures")
    .select(`
      id,
      departure_date,
      departure_time,
      departure_location,
      destination_location,
      status,
      capacity,
      booked_count,
      sundra_trips (
        id,
        title,
        destination
      ),
      sundra_vehicles (
        id,
        name,
        registration_number,
        operator_name
      )
    `)
    .order("departure_date", { ascending: true })
    .order("departure_time", { ascending: true })
    .limit(80);

  if (date) query = query.eq("departure_date", date);

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map((row: any): DispatchTrip => {
    const trip = Array.isArray(row.sundra_trips) ? row.sundra_trips[0] : row.sundra_trips;
    const vehicle = Array.isArray(row.sundra_vehicles) ? row.sundra_vehicles[0] : row.sundra_vehicles;

    const from = row.departure_location || null;
    const to = row.destination_location || trip?.destination || null;

    return {
      id: `sundra-${row.id}`,
      sourceType: "sundra",
      sourceLabel: "Sundra",
      sourceId: row.id,
      date: row.departure_date || null,
      time: tidyTime(row.departure_time),
      title: trip?.title || "Sundra avgång",
      route: routeText(from, to),
      from,
      to,
      driver: "Saknas",
      vehicle: vehicle?.name || vehicle?.registration_number || "Saknas",
      status: row.status || "Planerad",
      statusCode: vehicle ? statusCode(row.status) : "needs_vehicle",
      passengers: row.booked_count ?? null,
    };
  });
}

async function getFlygbussDepartures(date?: string) {
  let query = supabase
    .from("shuttle_departures")
    .select(`
      id,
      departure_date,
      departure_time,
      departure_location,
      destination_location,
      status,
      capacity,
      booked_count,
      direction,
      shuttle_routes (
        id,
        name,
        route_code,
        from_city,
        to_city
      ),
      shuttle_lines (
        id,
        name,
        code,
        start_city,
        end_city
      )
    `)
    .order("departure_date", { ascending: true })
    .order("departure_time", { ascending: true })
    .limit(120);

  if (date) query = query.eq("departure_date", date);

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map((row: any): DispatchTrip => {
    const line = Array.isArray(row.shuttle_lines) ? row.shuttle_lines[0] : row.shuttle_lines;
    const route = Array.isArray(row.shuttle_routes) ? row.shuttle_routes[0] : row.shuttle_routes;

    const from = row.departure_location || route?.from_city || line?.start_city || null;
    const to = row.destination_location || route?.to_city || line?.end_city || null;

    return {
      id: `flygbuss-${row.id}`,
      sourceType: "flygbuss",
      sourceLabel: "Flygbuss",
      sourceId: row.id,
      date: row.departure_date || null,
      time: tidyTime(row.departure_time),
      title: line?.name || route?.name || "Flygbuss",
      route: routeText(from, to),
      from,
      to,
      driver: "Saknas",
      vehicle: "Saknas",
      status: row.status || "Planerad",
      statusCode: statusCode(row.status),
      passengers: row.booked_count ?? null,
    };
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({ ok: false, error: "Method not allowed" });
    }

    if (!supabase) {
      return res.status(500).json({ ok: false, error: "Supabase-admin saknas" });
    }

    const date = typeof req.query.date === "string" ? req.query.date : undefined;

    const results = await Promise.allSettled([
      getHelsingbussBookings(date),
      getSundraDepartures(date),
      getFlygbussDepartures(date),
      getAssignments(),
    ]);

    const trips = results
      .slice(0, 3)
      .flatMap((result) => (result.status === "fulfilled" ? result.value : [])) as DispatchTrip[];

    const assignmentsResult = results[3];
    const assignments =
      assignmentsResult.status === "fulfilled"
        ? (assignmentsResult.value as AssignmentRow[])
        : [];

    const mergedTrips = applyAssignments(trips, assignments);

    const errors = results
      .filter((result) => result.status === "rejected")
      .map((result: any) => result.reason?.message || "Okänt fel");

    mergedTrips.sort((a, b) =>
      `${a.date || ""} ${a.time || ""}`.localeCompare(`${b.date || ""} ${b.time || ""}`)
    );

    return res.status(200).json({
      ok: true,
      trips: mergedTrips,
      errors,
    });
  } catch (e: any) {
    console.error("/api/traffic/dispatch-trips error:", e?.message || e);
    return res.status(500).json({
      ok: false,
      error: e?.message || "Kunde inte hämta trafikledningens körningar",
    });
  }
}