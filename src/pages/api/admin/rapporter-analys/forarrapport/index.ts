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

function isConfirmed(status: any) {
  const s = String(status || "").toLowerCase();

  return ["confirmed", "accepted", "assigned", "completed", "done", "booked", "paid"].includes(s);
}

function driverName(row: any) {
  return (
    row.driver_name ||
    row.chauffeur_name ||
    row.chauffor_name ||
    row.driver_full_name ||
    row.assigned_driver_name ||
    row.assigned_to_name ||
    row.employee_name ||
    row.user_name ||
    row.name ||
    "Ej angiven"
  );
}

function driverId(row: any) {
  return (
    row.driver_id ||
    row.chauffeur_id ||
    row.chauffor_id ||
    row.assigned_driver_id ||
    row.assigned_to ||
    row.employee_id ||
    row.user_id ||
    driverName(row)
  );
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

function sourceEndTime(row: any) {
  return (
    row.arrival_time ||
    row.dropoff_time ||
    row.end_time ||
    ""
  );
}

function sourceCustomer(row: any) {
  return (
    row.customer_name ||
    row.client_name ||
    row.company_name ||
    row.passenger_name ||
    row.name ||
    "Okänd kund"
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
    "Körning"
  );
}

function sourceNumber(row: any) {
  return (
    row.booking_number ||
    row.order_number ||
    row.driver_order_number ||
    row.ticket_number ||
    row.reference ||
    row.invoice_number ||
    ""
  );
}

function sourcePassengers(row: any) {
  const qty = Number(
    row.passenger_count ||
      row.passengers ||
      row.quantity ||
      row.seats ||
      row.seat_count ||
      row.number_of_passengers ||
      0
  );

  return Number.isFinite(qty) && qty > 0 ? qty : 0;
}

function sourceKm(row: any) {
  const km = Number(
    row.distance_km ||
      row.km ||
      row.route_km ||
      row.total_km ||
      0
  );

  return Number.isFinite(km) && km > 0 ? Number(km.toFixed(1)) : 0;
}

function sourceRevenue(row: any) {
  return n(
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

      rows.push({
        id: row.id,
        source: source.label,
        date: isoDate(date),
        time: sourceTime(row),
        end_time: sourceEndTime(row),
        driver_id: String(driverId(row) || "Ej angiven"),
        driver_name: driverName(row),
        area: areaName(row),
        customer: sourceCustomer(row),
        route: sourceRoute(row),
        number: sourceNumber(row),
        passengers: sourcePassengers(row),
        km: sourceKm(row),
        revenue: sourceRevenue(row),
        status: statusLabel(row.status || row.driver_status || row.booking_status || row.order_status),
        raw_status: row.status || row.driver_status || row.booking_status || row.order_status,
        href: source.hrefBase && row.id ? source.hrefBase + row.id : "",
      });
    }
  }

  return rows.sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

function buildDrivers(rows: any[]) {
  const map = new Map<string, any>();

  for (const row of rows) {
    const key = String(row.driver_id || row.driver_name || "Ej angiven");

    const existing =
      map.get(key) ||
      {
        driver_id: key,
        driver_name: row.driver_name || "Ej angiven",
        assignments: 0,
        confirmed: 0,
        passengers: 0,
        km: 0,
        revenue: 0,
        sundra: 0,
        shuttle: 0,
        bestallningstrafik: 0,
      };

    existing.assignments += 1;
    existing.confirmed += isConfirmed(row.raw_status) ? 1 : 0;
    existing.passengers += Number(row.passengers || 0);
    existing.km = Number((Number(existing.km || 0) + Number(row.km || 0)).toFixed(1));
    existing.revenue = Number((n(existing.revenue) + n(row.revenue)).toFixed(2));

    if (row.area === "Sundra") existing.sundra += 1;
    if (row.area === "Shuttle") existing.shuttle += 1;
    if (row.area === "Beställningstrafik") existing.bestallningstrafik += 1;

    map.set(key, existing);
  }

  return Array.from(map.values())
    .map((driver) => ({
      ...driver,
      confirmed_percent:
        driver.assignments > 0
          ? Number(((driver.confirmed / driver.assignments) * 100).toFixed(1))
          : 0,
    }))
    .sort((a, b) => b.assignments - a.assignments);
}

function buildAreaChart(rows: any[]) {
  const map = new Map<string, number>();

  for (const row of rows) {
    const key = row.area || "Okänt";
    map.set(key, Number(map.get(key) || 0) + 1);
  }

  return Array.from(map.entries())
    .map(([label, value]) => ({
      label,
      value,
    }))
    .sort((a, b) => b.value - a.value);
}

function buildSummary(rows: any[], drivers: any[]) {
  const assignments = rows.length;
  const confirmed = rows.filter((row) => isConfirmed(row.raw_status)).length;
  const passengers = rows.reduce((sum, row) => sum + Number(row.passengers || 0), 0);
  const km = rows.reduce((sum, row) => sum + Number(row.km || 0), 0);
  const revenue = rows.reduce((sum, row) => sum + n(row.revenue), 0);

  return {
    driverCount: drivers.length,
    assignments,
    confirmed,
    confirmedPercent:
      assignments > 0 ? Number(((confirmed / assignments) * 100).toFixed(1)) : 0,
    passengers,
    km: Number(km.toFixed(1)),
    revenue: Number(revenue.toFixed(2)),
  };
}

function toCsv(rows: any[], drivers: any[], summary: any, range: any) {
  const csvRows = [
    ["Förarrapport"],
    ["Period", range.start || "Alla", range.end || "Alla"],
    [],
    ["Sammanställning"],
    ["Antal förare", summary.driverCount],
    ["Antal körningar", summary.assignments],
    ["Bekräftade/utförda", summary.confirmed],
    ["Bekräftade %", String(summary.confirmedPercent).replace(".", ",")],
    ["Passagerare", summary.passengers],
    ["Km", String(summary.km).replace(".", ",")],
    ["Intäkt", csvMoney(summary.revenue)],
    [],
    ["Förare"],
    ["Förare", "Körningar", "Bekräftade", "Bekräftade %", "Passagerare", "Km", "Intäkt", "Sundra", "Shuttle", "Beställningstrafik"],
    ...drivers.map((driver) => [
      driver.driver_name,
      driver.assignments,
      driver.confirmed,
      String(driver.confirmed_percent).replace(".", ","),
      driver.passengers,
      String(driver.km).replace(".", ","),
      csvMoney(driver.revenue),
      driver.sundra,
      driver.shuttle,
      driver.bestallningstrafik,
    ]),
    [],
    ["Körningar"],
    ["Datum", "Tid", "Sluttid", "Källa", "Förare", "Område", "Kund", "Rutt/uppdrag", "Nummer", "Passagerare", "Km", "Intäkt", "Status", "Länk"],
    ...rows.map((row) => [
      row.date,
      row.time,
      row.end_time,
      row.source,
      row.driver_name,
      row.area,
      row.customer,
      row.route,
      row.number,
      row.passengers,
      String(row.km).replace(".", ","),
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
    const driverFilter = String(req.query.driver || "all");

    const warnings: string[] = [];

    const sourcesConfig = [
      ["driver_orders", "Körorder", "/admin/driver-orders/"],
      ["bookings", "Bokning", "/admin/bokningar/"],
      ["sundra_bookings", "Sundra bokning", "/admin/sundra/bookings/"],
      ["shuttle_bookings", "Shuttle bokning", "/admin/flygbuss/bokningar/"],
      ["airport_shuttle_bookings", "Airport Shuttle bokning", "/admin/flygbuss/bokningar/"],
      ["assignments", "Tilldelning", ""],
      ["trip_assignments", "Körtilldelning", ""],
      ["trips", "Tur/resa", ""],
      ["departures", "Avgång", ""],
      ["sundra_departures", "Sundra avgång", ""],
      ["shuttle_departures", "Shuttle avgång", ""],
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

    if (driverFilter !== "all") {
      rows = rows.filter((row) => String(row.driver_id) === driverFilter);
    }

    const drivers = buildDrivers(rows);
    const summary = buildSummary(rows, drivers);
    const areaChart = buildAreaChart(rows);

    if (format === "csv") {
      const csv = toCsv(rows, drivers, summary, range);
      const filename = "forarrapport.csv";

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", 'attachment; filename="' + filename + '"');

      return res.status(200).send("\uFEFF" + csv);
    }

    return res.status(200).json({
      ok: true,
      range,
      summary,
      drivers,
      areaChart,
      rows,
      warnings,
    });
  } catch (error: any) {
    console.error("/api/admin/rapporter-analys/forarrapport error", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte hämta förarrapport.",
    });
  }
}
