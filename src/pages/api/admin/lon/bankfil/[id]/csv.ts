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
    .slice(0, 80) || "bankunderlag";
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

    const { data: bankData, error: bankError } = await supabase
      .from("payroll_employee_bank_details")
      .select("*")
      .eq("is_active", true);

    if (bankError) throw bankError;

    const bankDetails = bankData || [];
    const rows = (rowsData || []).map((row: any) => {
      const bank = bankDetails.find((item: any) => item.employee_id === row.employee_id);

      const payoutAmount = Number(row.net_pay || row.payout_amount || row.gross_total || 0);
      const missingBank = !bank || (!bank.iban && (!bank.clearing_number || !bank.account_number));

      return {
        employee_name: row.employee_name_snapshot || "",
        recipient_name: bank?.recipient_name || row.employee_name_snapshot || "",
        bank_name: bank?.bank_name || "",
        clearing_number: bank?.clearing_number || "",
        account_number: bank?.account_number || "",
        iban: bank?.iban || "",
        bic: bank?.bic || "",
        payout_amount: payoutAmount,
        missing_bank: missingBank ? "Ja" : "Nej",
        status: row.status || "",
        note: missingBank ? "Saknar bankuppgifter" : "",
      };
    });

    const header = [
      "Lönekörning",
      "Period från",
      "Period till",
      "Utbetalningsdatum",
      "Anställd",
      "Mottagarnamn",
      "Bank",
      "Clearingnummer",
      "Kontonummer",
      "IBAN",
      "BIC",
      "Nettolön",
      "Utbetalningsbelopp",
      "Saknar bankuppgift",
      "Status",
      "Anteckning"
    ];

    const csvRows = [
      "sep=;",
      header.map(csvEscape).join(";"),
      ...rows.map((row: any) => [
        run.title,
        run.period_start,
        run.period_end,
        run.payout_date,
        row.employee_name,
        row.recipient_name,
        row.bank_name,
        row.clearing_number,
        row.account_number,
        row.iban,
        row.bic,
        money(row.payout_amount),
        money(row.payout_amount),
        row.missing_bank,
        row.status,
        row.note
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
        "",
        "",
        "",
        "",
        money(rows.reduce((sum: number, row: any) => sum + Number(row.payout_amount || 0), 0)),
        "",
        "",
        ""
      ].map(csvEscape).join(";")
    ];

    const csv = "\uFEFF" + csvRows.join("\r\n");
    const buffer = Buffer.from(csv, "utf8");

    const filename = safeFileName("bankunderlag-" + String(run.title || "lonekoring")) + ".csv";
    const encodedFilename = encodeURIComponent(filename);

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=\"" + filename + "\"; filename*=UTF-8''" + encodedFilename
    );
    res.setHeader("Content-Length", String(buffer.length));

    return res.status(200).send(buffer);
  } catch (error: any) {
    console.error("/api/admin/lon/bankfil/[id]/csv error", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte skapa bankunderlag.",
    });
  }
}
