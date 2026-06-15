import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdmin } from "@/lib/supabaseAdmin";

const db = requireAdmin();

function setCors(res: NextApiResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function pick(row: any, keys: string[], fallback: any = "") {
  for (const key of keys) {
    if (row?.[key] !== undefined && row?.[key] !== null && row?.[key] !== "") {
      return row[key];
    }
  }

  return fallback;
}

function normalizeDeparture(row: any) {
  const departureTime = pick(row, [
    "departure_time",
    "departure",
    "start_time",
    "time_departure",
    "departureTime",
  ]);

  const arrivalTime = pick(row, [
    "arrival_time",
    "arrival",
    "end_time",
    "time_arrival",
    "arrivalTime",
  ]);

  const fromName = pick(row, [
    "from_name",
    "from_stop_name",
    "departure_stop_name",
    "from_stop",
    "departure_stop",
    "start_stop_name",
  ]);

  const toName = pick(row, [
    "to_name",
    "to_stop_name",
    "arrival_stop_name",
    "to_stop",
    "arrival_stop",
    "end_stop_name",
  ]);

  return {
    id: row.id,

    lineId: pick(row, ["line_id", "shuttle_line_id", "lineId"], null),
    routeId: pick(row, ["route_id", "shuttle_route_id", "routeId"], null),

    departureTime,
    arrivalTime,

    duration: pick(row, [
      "duration",
      "travel_time",
      "estimated_duration",
      "duration_text",
    ], ""),

    fromStopId: pick(row, [
      "from_stop_id",
      "departure_stop_id",
      "start_stop_id",
    ], null),

    toStopId: pick(row, [
      "to_stop_id",
      "arrival_stop_id",
      "end_stop_id",
    ], null),

    fromName,
    toName,

    vehicle: pick(row, [
      "vehicle",
      "bus_name",
      "vehicle_name",
      "service_name",
    ], "HB Shuttle Direkt"),

    lineName: pick(row, [
      "line_name",
      "line",
      "route_name",
    ], "Linje 101"),

    priceEconomy: Number(pick(row, [
      "price_economy",
      "economy_price",
      "price",
      "price_from",
    ], 129)),

    pricePlus: Number(pick(row, [
      "price_plus",
      "plus_price",
      "premium_price",
    ], 169)),

    active: pick(row, ["active", "is_active"], true),

    date: pick(row, ["date", "departure_date"], null),
    validFrom: pick(row, ["valid_from", "start_date"], null),
    validTo: pick(row, ["valid_to", "end_date"], null),

    raw: row,
  };
}

function matchesText(value: any, search: string) {
  return String(value || "")
    .toLowerCase()
    .includes(search.toLowerCase());
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  setCors(res);

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { from, to, date } = req.query;

  const { data, error } = await db
    .from("shuttle_departures")
    .select("*");

  if (error) {
    console.error("Public shuttle departures error:", error);

    return res.status(500).json({
      error: "Kunde inte hämta avgångar.",
      details: error.message,
    });
  }

  let departures = (data || [])
    .map(normalizeDeparture)
    .filter((item) => item.active !== false);

  if (date) {
    const selectedDate = String(date);

    departures = departures.filter((item) => {
      if (item.date) {
        return String(item.date) === selectedDate;
      }

      if (item.validFrom && String(item.validFrom) > selectedDate) {
        return false;
      }

      if (item.validTo && String(item.validTo) < selectedDate) {
        return false;
      }

      return true;
    });
  }

  if (from) {
    const fromText = String(from);

    departures = departures.filter((item) => {
      return (
        matchesText(item.fromName, fromText) ||
        matchesText(item.raw?.from_stop, fromText) ||
        matchesText(item.raw?.departure_stop, fromText) ||
        matchesText(item.raw?.start_stop, fromText)
      );
    });
  }

  if (to) {
    const toText = String(to);

    departures = departures.filter((item) => {
      return (
        matchesText(item.toName, toText) ||
        matchesText(item.raw?.to_stop, toText) ||
        matchesText(item.raw?.arrival_stop, toText) ||
        matchesText(item.raw?.end_stop, toText)
      );
    });
  }

  departures.sort((a, b) => {
    return String(a.departureTime || "").localeCompare(
      String(b.departureTime || "")
    );
  });

  return res.status(200).json({
    departures,
    count: departures.length,
  });
}
