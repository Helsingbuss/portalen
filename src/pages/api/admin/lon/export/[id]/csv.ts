import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import { requirePayrollAccess } from "@/lib/payrollAccess";

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

function csvEscape(value: any) {
  const text = String(value ?? "");
  const escaped = text.replace(/"/g, '""');
  return '"' + escaped + '"';
}

function money(value: any) {
  const n = Number(value || 0);
  return n.toFixed(2).replace(".", ",");
}

function safeFileName(value: string) {
  return value
    .toLowerCase()
    .replace(/å/g, "a")
    .replace(/ä/g, "a")
    .replace(/ö/g, "o")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "loneexport";
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!requirePayrollAccess(req, res)) return;

  const id = String(req.query.id || "").trim();

  if (!id) {
    return res.status(400).json({ ok: false, error: "Lönekörnings-ID saknas." });
  }

  try {
    const supabase = getSupabase();

    const { data: run, error: runError } = await supabase
      .from("payroll_runs")
      .select("*")
      .eq("id", id)
      .single();

    if (runError) throw runError;

    const { data: rowsData, error: rowsError } = await supabase
      .from("payroll_run_rows")
      .select("*")
      .eq("payroll_run_id", id)
      .order("employee_name_snapshot", { ascending: true });

    if (rowsError) throw rowsError;

    const rows = (rowsData || []) as any[];

    const header = [
      "Lönekörning",
      "Period från",
      "Period till",
      "Utbetalningsdatum",
      "Anställd",
      "Roll",
      "Lönetyp",
      "Timmar",
      "Timlön",
      "Månadslön",
      "Semester %",
      "Grundlön",
      "Semesterersättning",
      "Bruttolön",
      "Preliminär skatt %",
      "Preliminär skatt kr",
      "Nettolön",
      "Utbetalningsbelopp",
      "Arbetsgivaravgift %",
      "Arbetsgivaravgift kr",
      "Total kostnad",
      "Status",
      "Anteckning"
    ];

    const csvRows = [
      "sep=;",
      header.map(csvEscape).join(";"),
      ...rows.map((row) => [
        run.title,
        run.period_start,
        run.period_end,
        run.payout_date,
        row.employee_name_snapshot,
        row.employee_role_snapshot,
        row.pay_type,
        money(row.hours),
        money(row.hourly_rate),
        money(row.monthly_salary),
        money(row.vacation_percent),
        money(row.gross_base),
        money(row.vacation_pay),
        money(row.gross_total),
        money(row.preliminary_tax_percent),
        money(row.preliminary_tax_amount),
        money(row.net_pay),
        money(row.payout_amount || row.net_pay),
        money(row.employer_fee_percent),
        money(row.employer_fee),
        money(row.total_cost),
        row.status,
        row.notes
      ].map(csvEscape).join(";")),
      "",
      [
        "TOTAL",
        "",
        "",
        "",
        "",
        "",
        "",
        money(rows.reduce((sum, row) => sum + Number(row.hours || 0), 0)),
        "",
        "",
        "",
        money(rows.reduce((sum, row) => sum + Number(row.gross_base || 0), 0)),
        money(rows.reduce((sum, row) => sum + Number(row.vacation_pay || 0), 0)),
        money(rows.reduce((sum, row) => sum + Number(row.gross_total || 0), 0)),
        "",
        money(rows.reduce((sum, row) => sum + Number(row.preliminary_tax_amount || 0), 0)),
        money(rows.reduce((sum, row) => sum + Number(row.net_pay || 0), 0)),
        money(rows.reduce((sum, row) => sum + Number(row.payout_amount || row.net_pay || 0), 0)),
        "",
        money(rows.reduce((sum, row) => sum + Number(row.employer_fee || 0), 0)),
        money(rows.reduce((sum, row) => sum + Number(row.total_cost || 0), 0)),
        "",
        ""
      ].map(csvEscape).join(";")
    ];

    const csv = "\uFEFF" + csvRows.join("\r\n");
    const buffer = Buffer.from(csv, "utf8");

    const filename = safeFileName(String(run.title || "loneexport")) + ".csv";
    const encodedFilename = encodeURIComponent(filename);

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=\"" + filename + "\"; filename*=UTF-8''" + encodedFilename
    );
    res.setHeader("Content-Length", String(buffer.length));

    return res.status(200).send(buffer);
  } catch (error: any) {
    console.error("/api/admin/lon/export/[id]/csv error", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte skapa CSV-export.",
    });
  }
}
