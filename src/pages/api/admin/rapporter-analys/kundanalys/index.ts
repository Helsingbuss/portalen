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

function customerName(row: any) {
  return (
    row.customer_name ||
    row.client_name ||
    row.company_name ||
    row.billing_name ||
    row.passenger_name ||
    row.name ||
    "Okänd kund"
  );
}

function customerId(row: any) {
  return (
    row.customer_id ||
    row.client_id ||
    row.company_id ||
    row.billing_customer_id ||
    row.user_id ||
    customerName(row)
  );
}

function customerEmail(row: any) {
  return (
    row.customer_email ||
    row.email ||
    row.billing_email ||
    row.contact_email ||
    ""
  );
}

function customerPhone(row: any) {
  return (
    row.customer_phone ||
    row.phone ||
    row.mobile ||
    row.contact_phone ||
    ""
  );
}

function sourceDate(row: any) {
  return (
    row.invoice_date ||
    row.booking_date ||
    row.departure_date ||
    row.travel_date ||
    row.created_at ||
    row.date
  );
}

function sourceNumber(row: any) {
  return (
    row.invoice_number ||
    row.booking_number ||
    row.order_number ||
    row.offer_number ||
    row.reference ||
    ""
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
    "Kundaktivitet"
  );
}

function sourceNet(row: any) {
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
      sourceNet(row)
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
      if (source.kind === "invoice" && isArchived(row.status)) continue;

      const net = sourceNet(row);
      const gross = sourceGross(row);
      const unpaid =
        source.kind === "invoice"
          ? isPaid(row.status)
            ? 0
            : n(row.unpaid_amount || row.total_amount || row.gross_amount || gross)
          : 0;

      rows.push({
        id: row.id,
        source: source.label,
        date: isoDate(date),
        customer_id: String(customerId(row) || "Okänd kund"),
        customer_name: customerName(row),
        customer_email: customerEmail(row),
        customer_phone: customerPhone(row),
        area: areaName(row),
        description: sourceDescription(row),
        number: sourceNumber(row),
        net_amount: net,
        gross_amount: gross,
        paid_amount:
          source.kind === "invoice"
            ? isPaid(row.status)
              ? gross
              : n(row.paid_amount)
            : gross,
        unpaid_amount: unpaid,
        status: statusLabel(row.status || row.booking_status || row.payment_status),
        raw_status: row.status || row.booking_status || row.payment_status,
        href: source.hrefBase && row.id ? source.hrefBase + row.id : "",
      });
    }
  }

  return rows.sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

function buildCustomers(rows: any[]) {
  const map = new Map<string, any>();

  for (const row of rows) {
    const key = String(row.customer_id || row.customer_name || "Okänd kund");

    const existing =
      map.get(key) ||
      {
        customer_id: key,
        customer_name: row.customer_name || "Okänd kund",
        email: row.customer_email || "",
        phone: row.customer_phone || "",
        rows: 0,
        revenue_net: 0,
        revenue_gross: 0,
        paid_amount: 0,
        unpaid_amount: 0,
        invoices: 0,
        bookings: 0,
        sundra: 0,
        shuttle: 0,
        bestallningstrafik: 0,
        first_date: row.date || "",
        last_date: row.date || "",
      };

    existing.rows += 1;
    existing.revenue_net = Number((n(existing.revenue_net) + n(row.net_amount)).toFixed(2));
    existing.revenue_gross = Number((n(existing.revenue_gross) + n(row.gross_amount)).toFixed(2));
    existing.paid_amount = Number((n(existing.paid_amount) + n(row.paid_amount)).toFixed(2));
    existing.unpaid_amount = Number((n(existing.unpaid_amount) + n(row.unpaid_amount)).toFixed(2));

    if (row.source === "Kundfaktura") existing.invoices += 1;
    if (row.source !== "Kundfaktura") existing.bookings += 1;

    if (row.area === "Sundra") existing.sundra += 1;
    if (row.area === "Shuttle") existing.shuttle += 1;
    if (row.area === "Beställningstrafik") existing.bestallningstrafik += 1;

    if (row.date && (!existing.first_date || row.date < existing.first_date)) {
      existing.first_date = row.date;
    }

    if (row.date && (!existing.last_date || row.date > existing.last_date)) {
      existing.last_date = row.date;
    }

    if (!existing.email && row.customer_email) existing.email = row.customer_email;
    if (!existing.phone && row.customer_phone) existing.phone = row.customer_phone;

    map.set(key, existing);
  }

  return Array.from(map.values())
    .map((customer) => ({
      ...customer,
      average_value:
        customer.rows > 0
          ? Number((customer.revenue_net / customer.rows).toFixed(2))
          : 0,
      is_returning: customer.rows > 1,
    }))
    .sort((a, b) => b.revenue_net - a.revenue_net);
}

function buildAreaChart(rows: any[]) {
  const map = new Map<string, any>();

  for (const row of rows) {
    const key = row.area || "Okänt";
    const existing =
      map.get(key) ||
      {
        label: key,
        customers: new Set(),
        rows: 0,
        revenue: 0,
      };

    existing.customers.add(row.customer_id || row.customer_name);
    existing.rows += 1;
    existing.revenue = Number((n(existing.revenue) + n(row.net_amount)).toFixed(2));

    map.set(key, existing);
  }

  return Array.from(map.values())
    .map((item) => ({
      label: item.label,
      customers: item.customers.size,
      rows: item.rows,
      revenue: item.revenue,
    }))
    .sort((a, b) => b.revenue - a.revenue);
}

function buildSummary(rows: any[], customers: any[]) {
  const revenueNet = rows.reduce((sum, row) => sum + n(row.net_amount), 0);
  const revenueGross = rows.reduce((sum, row) => sum + n(row.gross_amount), 0);
  const paid = rows.reduce((sum, row) => sum + n(row.paid_amount), 0);
  const unpaid = rows.reduce((sum, row) => sum + n(row.unpaid_amount), 0);
  const returning = customers.filter((customer) => customer.is_returning).length;

  return {
    customerCount: customers.length,
    returningCustomers: returning,
    newCustomers: Math.max(0, customers.length - returning),
    rowCount: rows.length,
    revenueNet: Number(revenueNet.toFixed(2)),
    revenueGross: Number(revenueGross.toFixed(2)),
    paid: Number(paid.toFixed(2)),
    unpaid: Number(unpaid.toFixed(2)),
    averageCustomerValue:
      customers.length > 0 ? Number((revenueNet / customers.length).toFixed(2)) : 0,
  };
}

function toCsv(rows: any[], customers: any[], summary: any, areaChart: any[], range: any) {
  const csvRows = [
    ["Kundanalys"],
    ["Period", range.start || "Alla", range.end || "Alla"],
    [],
    ["Sammanställning"],
    ["Antal kunder", summary.customerCount],
    ["Återkommande kunder", summary.returningCustomers],
    ["Nya/engångskunder", summary.newCustomers],
    ["Antal rader", summary.rowCount],
    ["Intäkt exkl moms", csvMoney(summary.revenueNet)],
    ["Intäkt inkl moms", csvMoney(summary.revenueGross)],
    ["Betalt", csvMoney(summary.paid)],
    ["Obetalt", csvMoney(summary.unpaid)],
    ["Snittvärde per kund", csvMoney(summary.averageCustomerValue)],
    [],
    ["Per område"],
    ["Område", "Kunder", "Rader", "Intäkt"],
    ...areaChart.map((row) => [
      row.label,
      row.customers,
      row.rows,
      csvMoney(row.revenue),
    ]),
    [],
    ["Kunder"],
    ["Kund", "E-post", "Telefon", "Rader", "Fakturor", "Bokningar", "Intäkt exkl moms", "Intäkt inkl moms", "Betalt", "Obetalt", "Snittvärde", "Första datum", "Senaste datum", "Sundra", "Shuttle", "Beställningstrafik"],
    ...customers.map((customer) => [
      customer.customer_name,
      customer.email,
      customer.phone,
      customer.rows,
      customer.invoices,
      customer.bookings,
      csvMoney(customer.revenue_net),
      csvMoney(customer.revenue_gross),
      csvMoney(customer.paid_amount),
      csvMoney(customer.unpaid_amount),
      csvMoney(customer.average_value),
      customer.first_date,
      customer.last_date,
      customer.sundra,
      customer.shuttle,
      customer.bestallningstrafik,
    ]),
    [],
    ["Underlag"],
    ["Datum", "Källa", "Kund", "Område", "Beskrivning", "Nummer", "Netto", "Brutto", "Betalt", "Obetalt", "Status", "Länk"],
    ...rows.map((row) => [
      row.date,
      row.source,
      row.customer_name,
      row.area,
      row.description,
      row.number,
      csvMoney(row.net_amount),
      csvMoney(row.gross_amount),
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
    const customerFilter = String(req.query.customer || "all");

    const warnings: string[] = [];

    const sourcesConfig = [
      ["finance_invoices", "Kundfaktura", "/admin/ekonomi/fakturor/", "invoice"],
      ["bookings", "Bokning", "/admin/bokningar/", "booking"],
      ["sundra_bookings", "Sundra bokning", "/admin/sundra/bookings/", "booking"],
      ["shuttle_bookings", "Shuttle bokning", "/admin/flygbuss/bokningar/", "booking"],
      ["airport_shuttle_bookings", "Airport Shuttle bokning", "/admin/flygbuss/bokningar/", "booking"],
      ["offers", "Offert", "/admin/offerter/", "booking"],
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

    if (customerFilter !== "all") {
      rows = rows.filter((row) => String(row.customer_id) === customerFilter);
    }

    const customers = buildCustomers(rows);
    const areaChart = buildAreaChart(rows);
    const summary = buildSummary(rows, customers);

    if (format === "csv") {
      const csv = toCsv(rows, customers, summary, areaChart, range);
      const filename = "kundanalys.csv";

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", 'attachment; filename="' + filename + '"');

      return res.status(200).send("\uFEFF" + csv);
    }

    return res.status(200).json({
      ok: true,
      range,
      summary,
      customers,
      areaChart,
      rows,
      warnings,
    });
  } catch (error: any) {
    console.error("/api/admin/rapporter-analys/kundanalys error", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte hämta kundanalys.",
    });
  }
}
