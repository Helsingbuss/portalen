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
    case "paid": return "Betald";
    case "sent": return "Skickad";
    case "draft": return "Utkast";
    case "overdue": return "Förfallen";
    case "accepted": return "Accepterad";
    case "confirmed": return "Bekräftad";
    case "booked": return "Bokad";
    case "cancelled": return "Avbokad";
    case "refunded": return "Återbetald";
    default: return status || "";
  }
}

function isPaid(status: any) {
  return String(status || "").toLowerCase() === "paid";
}

function isArchived(status: any) {
  return String(status || "").toLowerCase() === "archived";
}

function agentName(row: any) {
  return (
    row.agent_name ||
    row.booking_agent_name ||
    row.sales_agent_name ||
    row.seller_name ||
    row.created_by_name ||
    row.created_by ||
    row.assigned_to_name ||
    row.handled_by_name ||
    row.handled_by ||
    row.user_name ||
    row.employee_name ||
    "Ej angiven"
  );
}

function agentId(row: any) {
  return (
    row.agent_id ||
    row.booking_agent_id ||
    row.sales_agent_id ||
    row.seller_id ||
    row.created_by ||
    row.assigned_to ||
    row.handled_by ||
    row.user_id ||
    agentName(row)
  );
}

function sourceDate(row: any) {
  return (
    row.invoice_date ||
    row.booking_date ||
    row.created_at ||
    row.departure_date ||
    row.travel_date ||
    row.date
  );
}

function sourceAmount(row: any) {
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

function sourceGross(row: any) {
  return n(
    row.total_amount ||
      row.gross_amount ||
      row.price_incl_vat ||
      row.amount_incl_vat ||
      row.price ||
      row.amount ||
      sourceAmount(row)
  );
}

function sourceCustomer(row: any) {
  return (
    row.customer_name ||
    row.client_name ||
    row.company_name ||
    row.name ||
    row.passenger_name ||
    "Okänd kund"
  );
}

function sourceDescription(row: any) {
  return (
    row.title ||
    row.description ||
    row.notes ||
    row.route_name ||
    row.trip_title ||
    row.product_name ||
    row.invoice_reference ||
    row.reference ||
    "Uppdrag/försäljning"
  );
}

function sourceNumber(row: any) {
  return (
    row.invoice_number ||
    row.booking_number ||
    row.offer_number ||
    row.order_number ||
    row.reference ||
    ""
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

function addAgent(summaryMap: Map<string, any>, row: any) {
  const key = String(agentId(row) || agentName(row) || "Ej angiven");
  const existing =
    summaryMap.get(key) ||
    {
      agent_id: key,
      agent_name: agentName(row),
      rows: 0,
      revenue_net: 0,
      revenue_gross: 0,
      paid_amount: 0,
      unpaid_amount: 0,
      accepted_count: 0,
      paid_count: 0,
      area_sundra: 0,
      area_shuttle: 0,
      area_bestallningstrafik: 0,
    };

  const area = areaName(row);
  const net = sourceAmount(row);
  const gross = sourceGross(row);
  const unpaid = isPaid(row.status) ? 0 : n(row.unpaid_amount || row.remaining_amount || 0);

  existing.rows += 1;
  existing.revenue_net = Number((n(existing.revenue_net) + net).toFixed(2));
  existing.revenue_gross = Number((n(existing.revenue_gross) + gross).toFixed(2));
  existing.paid_amount = Number((n(existing.paid_amount) + (isPaid(row.status) ? gross : n(row.paid_amount))).toFixed(2));
  existing.unpaid_amount = Number((n(existing.unpaid_amount) + unpaid).toFixed(2));

  if (["accepted", "confirmed", "booked", "paid"].includes(String(row.status || "").toLowerCase())) {
    existing.accepted_count += 1;
  }

  if (isPaid(row.status)) {
    existing.paid_count += 1;
  }

  if (area === "Sundra") existing.area_sundra += 1;
  if (area === "Shuttle") existing.area_shuttle += 1;
  if (area === "Beställningstrafik") existing.area_bestallningstrafik += 1;

  summaryMap.set(key, existing);
}

function buildRows({
  invoices,
  offers,
  bookings,
  sundraBookings,
  shuttleBookings,
  range,
}: {
  invoices: any[];
  offers: any[];
  bookings: any[];
  sundraBookings: any[];
  shuttleBookings: any[];
  range: any;
}) {
  const rows: any[] = [];

  for (const invoice of invoices || []) {
    const date = sourceDate(invoice);

    if (!inRange(date, range.start, range.end)) continue;
    if (isArchived(invoice.status)) continue;

    rows.push({
      id: invoice.id,
      source: "Kundfaktura",
      date: isoDate(date),
      agent_id: agentId(invoice),
      agent_name: agentName(invoice),
      area: areaName(invoice),
      customer: sourceCustomer(invoice),
      description: sourceDescription(invoice),
      number: sourceNumber(invoice),
      status: statusLabel(invoice.status),
      revenue_net: n(invoice.subtotal_excl_vat),
      revenue_gross: n(invoice.total_amount),
      paid_amount: n(invoice.paid_amount),
      unpaid_amount: isPaid(invoice.status) ? 0 : n(invoice.unpaid_amount || invoice.total_amount),
      href: "/admin/ekonomi/fakturor/" + invoice.id,
      raw_status: invoice.status,
    });
  }

  const optionalRows = [
    ...(offers || []).map((row: any) => ({ ...row, __source: "Offert", __hrefBase: "/admin/offerter/" })),
    ...(bookings || []).map((row: any) => ({ ...row, __source: "Bokning", __hrefBase: "/admin/bokningar/" })),
    ...(sundraBookings || []).map((row: any) => ({ ...row, __source: "Sundra bokning", __hrefBase: "/admin/sundra/bookings/" })),
    ...(shuttleBookings || []).map((row: any) => ({ ...row, __source: "Shuttle bokning", __hrefBase: "/admin/flygbuss/bokningar/" })),
  ];

  for (const item of optionalRows) {
    const date = sourceDate(item);

    if (!inRange(date, range.start, range.end)) continue;

    rows.push({
      id: item.id,
      source: item.__source,
      date: isoDate(date),
      agent_id: agentId(item),
      agent_name: agentName(item),
      area: areaName(item),
      customer: sourceCustomer(item),
      description: sourceDescription(item),
      number: sourceNumber(item),
      status: statusLabel(item.status || item.booking_status || item.offer_status),
      revenue_net: sourceAmount(item),
      revenue_gross: sourceGross(item),
      paid_amount: isPaid(item.status || item.payment_status) ? sourceGross(item) : n(item.paid_amount),
      unpaid_amount: isPaid(item.status || item.payment_status) ? 0 : n(item.unpaid_amount),
      href: item.id ? item.__hrefBase + item.id : "",
      raw_status: item.status || item.booking_status || item.offer_status,
    });
  }

  return rows.sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

function buildSummary(rows: any[]) {
  const totalRevenueNet = rows.reduce((sum, row) => sum + n(row.revenue_net), 0);
  const totalRevenueGross = rows.reduce((sum, row) => sum + n(row.revenue_gross), 0);
  const totalPaid = rows.reduce((sum, row) => sum + n(row.paid_amount), 0);
  const totalUnpaid = rows.reduce((sum, row) => sum + n(row.unpaid_amount), 0);

  const agents = new Set(rows.map((row) => row.agent_id || row.agent_name));

  return {
    rowCount: rows.length,
    agentCount: agents.size,
    totalRevenueNet: Number(totalRevenueNet.toFixed(2)),
    totalRevenueGross: Number(totalRevenueGross.toFixed(2)),
    totalPaid: Number(totalPaid.toFixed(2)),
    totalUnpaid: Number(totalUnpaid.toFixed(2)),
    averagePerAgent:
      agents.size > 0 ? Number((totalRevenueNet / agents.size).toFixed(2)) : 0,
  };
}

function buildAgents(rows: any[]) {
  const map = new Map<string, any>();

  for (const row of rows) {
    addAgent(map, {
      ...row,
      status: row.raw_status,
      subtotal_excl_vat: row.revenue_net,
      total_amount: row.revenue_gross,
      paid_amount: row.paid_amount,
      unpaid_amount: row.unpaid_amount,
      business_area: row.area,
    });
  }

  return Array.from(map.values())
    .map((agent) => ({
      ...agent,
      conversion_hint:
        agent.rows > 0
          ? Number(((agent.accepted_count / agent.rows) * 100).toFixed(1))
          : 0,
    }))
    .sort((a, b) => b.revenue_net - a.revenue_net);
}

function buildAreaChart(rows: any[]) {
  const map = new Map<string, number>();

  for (const row of rows) {
    map.set(row.area || "Okänt", n(map.get(row.area || "Okänt") || 0) + n(row.revenue_net));
  }

  return Array.from(map.entries())
    .map(([label, value]) => ({
      label,
      value: Number(n(value).toFixed(2)),
    }))
    .sort((a, b) => b.value - a.value);
}

function toCsv(rows: any[], agents: any[], summary: any, range: any) {
  const csvRows = [
    ["Agentrapport"],
    ["Period", range.start || "Alla", range.end || "Alla"],
    [],
    ["Sammanställning"],
    ["Antal agenter", summary.agentCount],
    ["Antal rader", summary.rowCount],
    ["Intäkt exkl moms", csvMoney(summary.totalRevenueNet)],
    ["Intäkt inkl moms", csvMoney(summary.totalRevenueGross)],
    ["Betalt", csvMoney(summary.totalPaid)],
    ["Obetalt", csvMoney(summary.totalUnpaid)],
    [],
    ["Agenter"],
    ["Agent", "Rader", "Intäkt exkl moms", "Intäkt inkl moms", "Betalt", "Obetalt", "Accepterade/Bekräftade %", "Sundra", "Shuttle", "Beställningstrafik"],
    ...agents.map((agent) => [
      agent.agent_name,
      agent.rows,
      csvMoney(agent.revenue_net),
      csvMoney(agent.revenue_gross),
      csvMoney(agent.paid_amount),
      csvMoney(agent.unpaid_amount),
      String(agent.conversion_hint).replace(".", ","),
      agent.area_sundra,
      agent.area_shuttle,
      agent.area_bestallningstrafik,
    ]),
    [],
    ["Rader"],
    ["Datum", "Källa", "Agent", "Område", "Kund", "Beskrivning", "Nummer", "Intäkt exkl moms", "Intäkt inkl moms", "Betalt", "Obetalt", "Status", "Länk"],
    ...rows.map((row) => [
      row.date,
      row.source,
      row.agent_name,
      row.area,
      row.customer,
      row.description,
      row.number,
      csvMoney(row.revenue_net),
      csvMoney(row.revenue_gross),
      csvMoney(row.paid_amount),
      csvMoney(row.unpaid_amount),
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
    const agentFilter = String(req.query.agent || "all");

    const warnings: string[] = [];

    const invoicesResult = await safeSelect(supabase, "finance_invoices");
    const offersResult = await safeSelect(supabase, "offers");
    const bookingsResult = await safeSelect(supabase, "bookings");
    const sundraBookingsResult = await safeSelect(supabase, "sundra_bookings");
    const shuttleBookingsResult = await safeSelect(supabase, "shuttle_bookings");

    for (const result of [
      invoicesResult,
      offersResult,
      bookingsResult,
      sundraBookingsResult,
      shuttleBookingsResult,
    ]) {
      if (result.warning) warnings.push(result.warning);
    }

    let rows = buildRows({
      invoices: invoicesResult.data,
      offers: offersResult.data,
      bookings: bookingsResult.data,
      sundraBookings: sundraBookingsResult.data,
      shuttleBookings: shuttleBookingsResult.data,
      range,
    });

    if (agentFilter !== "all") {
      rows = rows.filter((row) => String(row.agent_id) === agentFilter);
    }

    const summary = buildSummary(rows);
    const agents = buildAgents(rows);
    const areaChart = buildAreaChart(rows);

    if (format === "csv") {
      const csv = toCsv(rows, agents, summary, range);
      const filename = "agentrapport.csv";

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", 'attachment; filename="' + filename + '"');

      return res.status(200).send("\uFEFF" + csv);
    }

    return res.status(200).json({
      ok: true,
      range,
      summary,
      agents,
      areaChart,
      rows,
      warnings,
    });
  } catch (error: any) {
    console.error("/api/admin/rapporter-analys/agentrapport error", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte hämta agentrapport.",
    });
  }
}
