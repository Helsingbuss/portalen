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
    case "received": return "Mottagen";
    case "approved": return "Godkänd";
    case "accepted": return "Accepterad";
    case "confirmed": return "Bekräftad";
    case "completed": return "Utförd";
    case "cancelled": return "Avbokad";
    case "pending": return "Väntar";
    default: return status || "";
  }
}

function isPaid(status: any) {
  return String(status || "").toLowerCase() === "paid";
}

function isArchived(status: any) {
  return String(status || "").toLowerCase() === "archived";
}

function operatorName(row: any) {
  return (
    row.operator_name ||
    row.partner_name ||
    row.subcontractor_name ||
    row.supplier_name ||
    row.carrier_name ||
    row.bus_company_name ||
    row.company_name ||
    row.provider_name ||
    row.name ||
    "Ej angiven"
  );
}

function operatorId(row: any) {
  return (
    row.operator_id ||
    row.partner_id ||
    row.subcontractor_id ||
    row.supplier_id ||
    row.carrier_id ||
    row.bus_company_id ||
    row.provider_id ||
    operatorName(row)
  );
}

function sourceDate(row: any) {
  return (
    row.invoice_date ||
    row.departure_date ||
    row.travel_date ||
    row.pickup_date ||
    row.booking_date ||
    row.created_at ||
    row.date
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
    row.invoice_reference ||
    "Uppdrag"
  );
}

function sourceNumber(row: any) {
  return (
    row.supplier_invoice_number ||
    row.invoice_number ||
    row.booking_number ||
    row.order_number ||
    row.offer_number ||
    row.reference ||
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

function sourceRevenue(row: any) {
  return n(
    row.customer_revenue ||
      row.revenue_net ||
      row.subtotal_excl_vat ||
      row.net_amount ||
      row.total_excl_vat ||
      row.price_excl_vat ||
      row.amount_excl_vat ||
      row.customer_price ||
      row.sell_price ||
      0
  );
}

function sourceCost(row: any) {
  return n(
    row.supplier_cost ||
      row.operator_cost ||
      row.partner_price ||
      row.purchase_price ||
      row.cost_net ||
      row.cost_excl_vat ||
      row.subtotal_excl_vat ||
      row.net_amount ||
      row.total_excl_vat ||
      row.price_excl_vat ||
      row.amount_excl_vat ||
      row.total_amount ||
      row.gross_amount ||
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
      if (source.kind === "supplier_invoice" && isArchived(row.status)) continue;

      const cost = source.kind === "income_source" ? 0 : sourceCost(row);
      const revenue = source.kind === "supplier_invoice" ? 0 : sourceRevenue(row);

      rows.push({
        id: row.id,
        source: source.label,
        date: isoDate(date),
        operator_id: String(operatorId(row) || "Ej angiven"),
        operator_name: operatorName(row),
        area: areaName(row),
        customer: sourceCustomer(row),
        route: sourceRoute(row),
        number: sourceNumber(row),
        passengers: sourcePassengers(row),
        revenue,
        cost,
        result: Number((n(revenue) - n(cost)).toFixed(2)),
        paid_amount:
          source.kind === "supplier_invoice"
            ? isPaid(row.status)
              ? n(row.total_amount || row.gross_amount || cost)
              : n(row.paid_amount)
            : 0,
        unpaid_amount:
          source.kind === "supplier_invoice"
            ? isPaid(row.status)
              ? 0
              : n(row.unpaid_amount || row.total_amount || row.gross_amount || cost)
            : 0,
        status: statusLabel(row.status || row.booking_status || row.offer_status || row.order_status),
        raw_status: row.status || row.booking_status || row.offer_status || row.order_status,
        href: source.hrefBase && row.id ? source.hrefBase + row.id : "",
      });
    }
  }

  return rows.sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

function buildOperators(rows: any[]) {
  const map = new Map<string, any>();

  for (const row of rows) {
    const key = String(row.operator_id || row.operator_name || "Ej angiven");

    const existing =
      map.get(key) ||
      {
        operator_id: key,
        operator_name: row.operator_name || "Ej angiven",
        rows: 0,
        assignments: 0,
        supplier_invoices: 0,
        passengers: 0,
        revenue: 0,
        cost: 0,
        result: 0,
        paid_amount: 0,
        unpaid_amount: 0,
        sundra: 0,
        shuttle: 0,
        bestallningstrafik: 0,
      };

    existing.rows += 1;

    if (row.source === "Leverantörsfaktura") {
      existing.supplier_invoices += 1;
    } else {
      existing.assignments += 1;
    }

    existing.passengers += Number(row.passengers || 0);
    existing.revenue = Number((n(existing.revenue) + n(row.revenue)).toFixed(2));
    existing.cost = Number((n(existing.cost) + n(row.cost)).toFixed(2));
    existing.result = Number((n(existing.result) + n(row.result)).toFixed(2));
    existing.paid_amount = Number((n(existing.paid_amount) + n(row.paid_amount)).toFixed(2));
    existing.unpaid_amount = Number((n(existing.unpaid_amount) + n(row.unpaid_amount)).toFixed(2));

    if (row.area === "Sundra") existing.sundra += 1;
    if (row.area === "Shuttle") existing.shuttle += 1;
    if (row.area === "Beställningstrafik") existing.bestallningstrafik += 1;

    map.set(key, existing);
  }

  return Array.from(map.values())
    .map((item) => ({
      ...item,
      margin_percent:
        item.revenue > 0
          ? Number(((item.result / item.revenue) * 100).toFixed(1))
          : item.cost > 0
            ? -100
            : 0,
    }))
    .sort((a, b) => b.cost - a.cost);
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

function buildSummary(rows: any[], operators: any[]) {
  const revenue = rows.reduce((sum, row) => sum + n(row.revenue), 0);
  const cost = rows.reduce((sum, row) => sum + n(row.cost), 0);
  const result = revenue - cost;
  const unpaid = rows.reduce((sum, row) => sum + n(row.unpaid_amount), 0);
  const paid = rows.reduce((sum, row) => sum + n(row.paid_amount), 0);
  const passengers = rows.reduce((sum, row) => sum + Number(row.passengers || 0), 0);

  return {
    operatorCount: operators.length,
    rowCount: rows.length,
    revenue: Number(revenue.toFixed(2)),
    cost: Number(cost.toFixed(2)),
    result: Number(result.toFixed(2)),
    marginPercent: revenue > 0 ? Number(((result / revenue) * 100).toFixed(1)) : 0,
    paid: Number(paid.toFixed(2)),
    unpaid: Number(unpaid.toFixed(2)),
    passengers,
  };
}

function toCsv(rows: any[], operators: any[], summary: any, range: any) {
  const csvRows = [
    ["Operatörsrapport"],
    ["Period", range.start || "Alla", range.end || "Alla"],
    [],
    ["Sammanställning"],
    ["Antal operatörer", summary.operatorCount],
    ["Antal rader", summary.rowCount],
    ["Intäkt", csvMoney(summary.revenue)],
    ["Kostnad", csvMoney(summary.cost)],
    ["Resultat", csvMoney(summary.result)],
    ["Marginal %", String(summary.marginPercent).replace(".", ",")],
    ["Betalt leverantörer", csvMoney(summary.paid)],
    ["Obetalt leverantörer", csvMoney(summary.unpaid)],
    ["Passagerare", summary.passengers],
    [],
    ["Operatörer"],
    ["Operatör", "Rader", "Uppdrag", "Leverantörsfakturor", "Passagerare", "Intäkt", "Kostnad", "Resultat", "Marginal %", "Betalt", "Obetalt", "Sundra", "Shuttle", "Beställningstrafik"],
    ...operators.map((operator) => [
      operator.operator_name,
      operator.rows,
      operator.assignments,
      operator.supplier_invoices,
      operator.passengers,
      csvMoney(operator.revenue),
      csvMoney(operator.cost),
      csvMoney(operator.result),
      String(operator.margin_percent).replace(".", ","),
      csvMoney(operator.paid_amount),
      csvMoney(operator.unpaid_amount),
      operator.sundra,
      operator.shuttle,
      operator.bestallningstrafik,
    ]),
    [],
    ["Underlag"],
    ["Datum", "Källa", "Operatör", "Område", "Kund", "Rutt/uppdrag", "Nummer", "Passagerare", "Intäkt", "Kostnad", "Resultat", "Betalt", "Obetalt", "Status", "Länk"],
    ...rows.map((row) => [
      row.date,
      row.source,
      row.operator_name,
      row.area,
      row.customer,
      row.route,
      row.number,
      row.passengers,
      csvMoney(row.revenue),
      csvMoney(row.cost),
      csvMoney(row.result),
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
    const operatorFilter = String(req.query.operator || "all");

    const warnings: string[] = [];

    const sourcesConfig = [
      ["supplier_invoices", "Leverantörsfaktura", "/admin/ekonomi/leverantorsreskontra/", "supplier_invoice"],
      ["bookings", "Bokning", "/admin/bokningar/", "booking"],
      ["sundra_bookings", "Sundra bokning", "/admin/sundra/bookings/", "booking"],
      ["shuttle_bookings", "Shuttle bokning", "/admin/flygbuss/bokningar/", "booking"],
      ["airport_shuttle_bookings", "Airport Shuttle bokning", "/admin/flygbuss/bokningar/", "booking"],
      ["partner_offers", "Partneroffert", "", "booking"],
      ["operator_quotes", "Operatörspris", "", "booking"],
      ["subcontractor_quotes", "Underleverantörspris", "", "booking"],
      ["driver_orders", "Körorder", "/admin/driver-orders/", "booking"],
    ];

    const sources: any[] = [];

    for (const [table, label, hrefBase, kind] of sourcesConfig) {
      const result = await safeSelect(supabase, table);

      if (result.warning) {
        warnings.push(result.warning);
      }

      if (result.data.length > 0) {
        sources.push({
          table,
          label,
          hrefBase,
          kind,
          data: result.data,
        });
      }
    }

    let rows = buildRows(sources, range);

    if (operatorFilter !== "all") {
      rows = rows.filter((row) => String(row.operator_id) === operatorFilter);
    }

    const operators = buildOperators(rows);
    const summary = buildSummary(rows, operators);
    const areaChart = buildAreaChart(rows);

    if (format === "csv") {
      const csv = toCsv(rows, operators, summary, range);
      const filename = "operatorrapport.csv";

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", 'attachment; filename="' + filename + '"');

      return res.status(200).send("\uFEFF" + csv);
    }

    return res.status(200).json({
      ok: true,
      range,
      summary,
      operators,
      areaChart,
      rows,
      warnings,
    });
  } catch (error: any) {
    console.error("/api/admin/rapporter-analys/operatorrapport error", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte hämta operatörsrapport.",
    });
  }
}
