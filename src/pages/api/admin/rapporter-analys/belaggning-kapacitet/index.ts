import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;

const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY;

function getSupabase() {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase env saknas.");
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function n(value: any) {
  const num = Number(String(value ?? "0").replace(",", "."));
  return Number.isFinite(num) ? Number(num.toFixed(2)) : 0;
}

function clean(value: any) {
  return String(value ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/;/g, ",")
    .replace(/\s+/g, " ")
    .trim();
}

function csvEscape(value: any) {
  const text = clean(value);

  if (text.includes('"') || text.includes(";") || text.includes("\n")) {
    return '"' + text.replace(/"/g, '""') + '"';
  }

  return text;
}

function csvMoney(value: any) {
  return String(n(value).toFixed(2)).replace(".", ",");
}

function isoDate(value: any) {
  if (!value) return "";

  try {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "";

    return date.toISOString().slice(0, 10);
  } catch {
    return "";
  }
}

function currentYear() {
  return new Date().getFullYear();
}

function thisYearRange() {
  const year = currentYear();

  return {
    start: year + "-01-01",
    end: year + "-12-31",
  };
}

function rangeFromQuery(req: NextApiRequest) {
  const period = String(req.query.period || "this_year");

  if (period === "this_month") {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();

    return {
      start: year + "-" + month + "-01",
      end: year + "-" + month + "-" + String(lastDay).padStart(2, "0"),
    };
  }

  if (period === "custom") {
    return {
      start: String(req.query.start || ""),
      end: String(req.query.end || ""),
    };
  }

  if (period === "all") {
    return {
      start: "",
      end: "",
    };
  }

  return thisYearRange();
}

function inRange(value: any, start: string, end: string) {
  const date = isoDate(value);

  if (!date) return false;
  if (start && date < start) return false;
  if (end && date > end) return false;

  return true;
}

function rowText(row: any) {
  return Object.values(row || {})
    .map((value) => String(value ?? ""))
    .join(" ")
    .toLowerCase();
}

function areaName(row: any) {
  const directArea = String(
    row?.business_area ||
      row?.businessArea ||
      row?.area ||
      row?.product_area ||
      row?.sales_area ||
      ""
  ).toLowerCase();

  if (
    directArea.includes("shuttle") ||
    directArea.includes("airport") ||
    directArea.includes("flygbuss")
  ) {
    return "Shuttle";
  }

  if (
    directArea.includes("sundra") ||
    directArea.includes("dagsresa") ||
    directArea.includes("paketresa")
  ) {
    return "Sundra";
  }

  if (
    directArea.includes("beställning") ||
    directArea.includes("bestallning") ||
    directArea.includes("charter") ||
    directArea.includes("uppdrag")
  ) {
    return "Beställningstrafik";
  }

  const text = rowText(row);

  if (
    text.includes("shuttle") ||
    text.includes("airport shuttle") ||
    text.includes("flygbuss") ||
    text.includes("airport") ||
    text.includes("ängelholm airport") ||
    text.includes("angelholm airport") ||
    text.includes("malmö airport") ||
    text.includes("malmo airport")
  ) {
    return "Shuttle";
  }

  if (
    text.includes("sundra") ||
    text.includes("sundra resor") ||
    text.includes("dagsresa") ||
    text.includes("paketresa") ||
    text.includes("lucy") ||
    text.includes("allsång") ||
    text.includes("allsang") ||
    text.includes("vallarna") ||
    text.includes("gekås") ||
    text.includes("gekas") ||
    text.includes("ullared") ||
    text.includes("liseberg") ||
    text.includes("legoland") ||
    text.includes("lalandia") ||
    text.includes("kryssning")
  ) {
    return "Sundra";
  }

  return "Beställningstrafik";
}

function statusLabel(status: any) {
  switch (String(status || "")) {
    case "confirmed": return "Bekräftad";
    case "accepted": return "Accepterad";
    case "assigned": return "Tilldelad";
    case "completed": return "Utförd";
    case "done": return "Utförd";
    case "cancelled": return "Avbokad";
    case "pending": return "Väntar";
    case "planned": return "Planerad";
    case "booked": return "Bokad";
    case "paid": return "Betald";
    default: return status || "";
  }
}

function sourceDate(row: any) {
  return (
    row.departure_date ||
    row.travel_date ||
    row.pickup_date ||
    row.start_date ||
    row.date ||
    row.booking_date ||
    row.created_at
  );
}

function sourceTime(row: any) {
  return (
    row.departure_time ||
    row.pickup_time ||
    row.start_time ||
    row.time ||
    ""
  );
}

function sourceRoute(row: any) {
  const from =
    row.pickup_location ||
    row.from_location ||
    row.departure_location ||
    row.start_location ||
    row.origin ||
    "";

  const to =
    row.dropoff_location ||
    row.to_location ||
    row.destination ||
    row.arrival_location ||
    row.end_location ||
    "";

  if (from && to) return from + " → " + to;

  return (
    row.route_name ||
    row.line_name ||
    row.trip_title ||
    row.title ||
    row.description ||
    row.notes ||
    "Avgång/körning"
  );
}

function sourceNumber(row: any) {
  return (
    row.departure_number ||
    row.booking_number ||
    row.order_number ||
    row.ticket_number ||
    row.reference ||
    row.line_number ||
    ""
  );
}

function sourceVehicle(row: any) {
  return (
    row.vehicle_name ||
    row.bus_name ||
    row.bus_registration ||
    row.vehicle_registration ||
    row.registration_number ||
    row.vehicle_id ||
    row.bus_id ||
    ""
  );
}

function firstPositive(...values: any[]) {
  for (const value of values) {
    const num = Number(value);

    if (Number.isFinite(num) && num > 0) {
      return num;
    }
  }

  return 0;
}

function sourceCapacity(row: any) {
  return firstPositive(
    row.capacity,
    row.total_capacity,
    row.seat_capacity,
    row.seats_total,
    row.total_seats,
    row.available_seats_total,
    row.vehicle_seats,
    row.bus_seats,
    row.max_passengers,
    row.max_seats,
    row.seats
  );
}

function sourceBooked(row: any) {
  return firstPositive(
    row.booked_seats,
    row.sold_seats,
    row.seats_booked,
    row.passenger_count,
    row.passengers,
    row.number_of_passengers,
    row.quantity,
    row.tickets_sold,
    row.booked_count,
    row.reserved_seats,
    row.seats_reserved
  );
}

function sourceRevenue(row: any) {
  return n(
    row.revenue_net ||
      row.subtotal_excl_vat ||
      row.net_amount ||
      row.total_excl_vat ||
      row.price_excl_vat ||
      row.amount_excl_vat ||
      row.total_amount ||
      row.gross_amount ||
      row.price ||
      row.amount ||
      0
  );
}

async function safeSelect(supabase: any, table: string) {
  const { data, error } = await supabase.from(table).select("*").limit(5000);

  if (error) {
    return {
      data: [],
      warning: table + ": " + (error.message || "kunde inte hämtas"),
    };
  }

  return {
    data: data || [],
    warning: "",
  };
}

function buildRows(sources: any[], range: any) {
  const rows: any[] = [];

  for (const source of sources) {
    for (const row of source.data || []) {
      const date = sourceDate(row);

      if (!inRange(date, range.start, range.end)) continue;

      const capacity = sourceCapacity(row);
      const booked = sourceBooked(row);
      const free = capacity > 0 ? capacity - booked : 0;
      const occupancy = capacity > 0 ? (booked / capacity) * 100 : 0;

      rows.push({
        id: row.id,
        source: source.label,
        date: isoDate(date),
        time: sourceTime(row),
        area: areaName(row),
        route: sourceRoute(row),
        number: sourceNumber(row),
        vehicle: sourceVehicle(row),
        capacity,
        booked,
        free,
        occupancy_percent: Number(occupancy.toFixed(1)),
        overbooked: capacity > 0 && booked > capacity,
        revenue: sourceRevenue(row),
        status: statusLabel(row.status || row.booking_status || row.departure_status || row.order_status),
        raw_status: row.status || row.booking_status || row.departure_status || row.order_status,
        href: source.hrefBase && row.id ? source.hrefBase + row.id : "",
      });
    }
  }

  return rows.sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

function buildSummary(rows: any[]) {
  const departures = rows.length;
  const capacity = rows.reduce((sum, row) => sum + Number(row.capacity || 0), 0);
  const booked = rows.reduce((sum, row) => sum + Number(row.booked || 0), 0);
  const free = capacity > 0 ? capacity - booked : 0;
  const revenue = rows.reduce((sum, row) => sum + n(row.revenue), 0);
  const overbooked = rows.filter((row) => row.overbooked).length;
  const withoutCapacity = rows.filter((row) => Number(row.capacity || 0) <= 0).length;
  const occupancyPercent = capacity > 0 ? (booked / capacity) * 100 : 0;

  return {
    departures,
    capacity,
    booked,
    free,
    revenue: Number(revenue.toFixed(2)),
    overbooked,
    withoutCapacity,
    occupancyPercent: Number(occupancyPercent.toFixed(1)),
  };
}

function buildAreaChart(rows: any[]) {
  const map = new Map<string, any>();

  for (const row of rows) {
    const key = row.area || "Okänt";
    const existing =
      map.get(key) ||
      {
        label: key,
        departures: 0,
        capacity: 0,
        booked: 0,
        revenue: 0,
      };

    existing.departures += 1;
    existing.capacity += Number(row.capacity || 0);
    existing.booked += Number(row.booked || 0);
    existing.revenue = Number((n(existing.revenue) + n(row.revenue)).toFixed(2));

    map.set(key, existing);
  }

  return Array.from(map.values())
    .map((row) => ({
      ...row,
      occupancy_percent:
        row.capacity > 0 ? Number(((row.booked / row.capacity) * 100).toFixed(1)) : 0,
    }))
    .sort((a, b) => b.booked - a.booked);
}

function buildCapacityGroups(rows: any[]) {
  const groups = [
    { label: "0–25 %", min: 0, max: 25, count: 0 },
    { label: "26–50 %", min: 26, max: 50, count: 0 },
    { label: "51–75 %", min: 51, max: 75, count: 0 },
    { label: "76–100 %", min: 76, max: 100, count: 0 },
    { label: "Över 100 %", min: 101, max: 999, count: 0 },
    { label: "Saknar kapacitet", min: -1, max: -1, count: 0 },
  ];

  for (const row of rows) {
    if (Number(row.capacity || 0) <= 0) {
      groups[5].count += 1;
      continue;
    }

    const pct = Number(row.occupancy_percent || 0);
    const group = groups.find((item) => pct >= item.min && pct <= item.max);

    if (group) group.count += 1;
  }

  return groups;
}

function toCsv(rows: any[], summary: any, areaChart: any[], capacityGroups: any[], range: any) {
  const csvRows = [
    ["Beläggning & kapacitet"],
    ["Period", range.start || "Alla", range.end || "Alla"],
    [],
    ["Sammanställning"],
    ["Avgångar/körningar", summary.departures],
    ["Kapacitet", summary.capacity],
    ["Bokade/sålda platser", summary.booked],
    ["Lediga platser", summary.free],
    ["Beläggning %", String(summary.occupancyPercent).replace(".", ",")],
    ["Överbokade", summary.overbooked],
    ["Saknar kapacitet", summary.withoutCapacity],
    ["Intäkt", csvMoney(summary.revenue)],
    [],
    ["Per område"],
    ["Område", "Avgångar", "Kapacitet", "Bokade", "Beläggning %", "Intäkt"],
    ...areaChart.map((row) => [
      row.label,
      row.departures,
      row.capacity,
      row.booked,
      String(row.occupancy_percent).replace(".", ","),
      csvMoney(row.revenue),
    ]),
    [],
    ["Beläggningsgrupper"],
    ["Grupp", "Antal"],
    ...capacityGroups.map((row) => [row.label, row.count]),
    [],
    ["Underlag"],
    ["Datum", "Tid", "Källa", "Område", "Rutt/uppdrag", "Nummer", "Fordon", "Kapacitet", "Bokade", "Lediga", "Beläggning %", "Överbokad", "Intäkt", "Status", "Länk"],
    ...rows.map((row) => [
      row.date,
      row.time,
      row.source,
      row.area,
      row.route,
      row.number,
      row.vehicle,
      row.capacity,
      row.booked,
      row.free,
      String(row.occupancy_percent).replace(".", ","),
      row.overbooked ? "Ja" : "Nej",
      csvMoney(row.revenue),
      row.status,
      row.href,
    ]),
  ];

  return "sep=;\n" + csvRows.map((row) => row.map(csvEscape).join(";")).join("\n");
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const supabase = getSupabase();
    const range = rangeFromQuery(req);
    const format = String(req.query.format || "json");
    const areaFilter = String(req.query.area || "all");

    const warnings: string[] = [];

    const sourcesConfig = [
      ["departures", "Avgång", ""],
      ["sundra_departures", "Sundra avgång", ""],
      ["shuttle_departures", "Shuttle avgång", ""],
      ["airport_shuttle_departures", "Airport Shuttle avgång", ""],
      ["trips", "Tur/resa", ""],
      ["routes", "Linje/rutt", ""],
      ["bookings", "Bokning", "/admin/bokningar/"],
      ["sundra_bookings", "Sundra bokning", "/admin/sundra/bookings/"],
      ["shuttle_bookings", "Shuttle bokning", "/admin/flygbuss/bokningar/"],
      ["airport_shuttle_bookings", "Airport Shuttle bokning", "/admin/flygbuss/bokningar/"],
      ["driver_orders", "Körorder", "/admin/driver-orders/"],
    ];

    const sources: any[] = [];

    for (const [table, label, hrefBase] of sourcesConfig) {
      const result = await safeSelect(supabase, table);

      if (result.warning) {
        warnings.push(result.warning);
      }

      if (result.data.length > 0) {
        sources.push({
          table,
          label,
          hrefBase,
          data: result.data,
        });
      }
    }

    let rows = buildRows(sources, range);

    if (areaFilter !== "all") {
      rows = rows.filter((row) => row.area === areaFilter);
    }

    const summary = buildSummary(rows);
    const areaChart = buildAreaChart(rows);
    const capacityGroups = buildCapacityGroups(rows);

    if (format === "csv") {
      const csv = toCsv(rows, summary, areaChart, capacityGroups, range);
      const filename = "belaggning-kapacitet.csv";

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", 'attachment; filename="' + filename + '"');

      return res.status(200).send("\uFEFF" + csv);
    }

    return res.status(200).json({
      ok: true,
      range,
      summary,
      areaChart,
      capacityGroups,
      rows,
      warnings,
    });
  } catch (error: any) {
    console.error("/api/admin/rapporter-analys/belaggning-kapacitet error", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte hämta beläggning och kapacitet.",
    });
  }
}
