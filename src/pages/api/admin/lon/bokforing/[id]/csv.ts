
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

function money(value: any) {
  return Number(Number(value || 0).toFixed(2));
}

function cleanText(value: any) {
  const text = String(value ?? "").trim();
  return text.length ? text : "";
}

function getAccounts(query: any) {
  return {
    wageAccount: cleanText(query.wageAccount) || "7010",
    vacationAccount: cleanText(query.vacationAccount) || "7090",
    employerFeeAccount: cleanText(query.employerFeeAccount) || "7510",
    taxLiabilityAccount: cleanText(query.taxLiabilityAccount) || "2710",
    employerFeeLiabilityAccount: cleanText(query.employerFeeLiabilityAccount) || "2731",
    netPayLiabilityAccount: cleanText(query.netPayLiabilityAccount) || "2910",
  };
}

function buildLines(run: any, rows: any[], accounts: any) {
  const grossBase = money(rows.reduce((sum, row) => sum + Number(row.gross_base || 0), 0));
  const vacationPay = money(rows.reduce((sum, row) => sum + Number(row.vacation_pay || 0), 0));
  const tax = money(rows.reduce((sum, row) => sum + Number(row.preliminary_tax_amount || 0), 0));
  const net = money(rows.reduce((sum, row) => sum + Number(row.payout_amount || row.net_pay || 0), 0));
  const employerFee = money(rows.reduce((sum, row) => sum + Number(row.employer_fee || 0), 0));

  const lines = [
    {
      account: accounts.wageAccount,
      description: "Löner",
      debit: grossBase,
      credit: 0,
      type: "debit",
    },
    {
      account: accounts.vacationAccount,
      description: "Semesterersättning",
      debit: vacationPay,
      credit: 0,
      type: "debit",
    },
    {
      account: accounts.employerFeeAccount,
      description: "Arbetsgivaravgifter",
      debit: employerFee,
      credit: 0,
      type: "debit",
    },
    {
      account: accounts.taxLiabilityAccount,
      description: "Preliminär skatt",
      debit: 0,
      credit: tax,
      type: "credit",
    },
    {
      account: accounts.employerFeeLiabilityAccount,
      description: "Upplupna arbetsgivaravgifter",
      debit: 0,
      credit: employerFee,
      type: "credit",
    },
    {
      account: accounts.netPayLiabilityAccount,
      description: "Nettolön / löneutbetalning",
      debit: 0,
      credit: net,
      type: "credit",
    },
  ].filter((line) => Number(line.debit || 0) > 0 || Number(line.credit || 0) > 0);

  const totalDebit = money(lines.reduce((sum, line) => sum + Number(line.debit || 0), 0));
  const totalCredit = money(lines.reduce((sum, line) => sum + Number(line.credit || 0), 0));

  return {
    lines,
    summary: {
      employees: rows.length,
      grossBase,
      vacationPay,
      grossTotal: money(grossBase + vacationPay),
      tax,
      net,
      employerFee,
      totalCost: money(grossBase + vacationPay + employerFee),
      totalDebit,
      totalCredit,
      difference: money(totalDebit - totalCredit),
      balanced: Math.abs(totalDebit - totalCredit) < 0.01,
    },
  };
}

function csvEscape(value: any) {
  const text = String(value ?? "");
  return '"' + text.replace(/"/g, '""') + '"';
}

function csvMoney(value: any) {
  return Number(value || 0).toFixed(2).replace(".", ",");
}

function safeFileName(value: string) {
  return value
    .toLowerCase()
    .replace(/å/g, "a")
    .replace(/ä/g, "a")
    .replace(/ö/g, "o")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "bokforingsexport";
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!requirePayrollAccess(req, res)) return;

  const id = String(req.query.id || "").trim();

  if (!id) {
    return res.status(400).json({
      ok: false,
      error: "Lönekörnings-ID saknas.",
    });
  }

  try {
    const supabase = getSupabase();
    const accounts = getAccounts(req.query);

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

    const rows = rowsData || [];
    const built = buildLines(run, rows, accounts);

    const header = [
      "Verifikation",
      "Lönekörning",
      "Period från",
      "Period till",
      "Utbetalningsdatum",
      "Konto",
      "Beskrivning",
      "Debet",
      "Kredit",
      "Kommentar"
    ];

    const csvRows = [
      "sep=;",
      header.map(csvEscape).join(";"),
      ...built.lines.map((line: any) => [
        "LÖN-" + String(run.payout_date || run.period_end || "").slice(0, 10),
        run.title || "Lönekörning",
        run.period_start || "",
        run.period_end || "",
        run.payout_date || "",
        line.account,
        line.description,
        csvMoney(line.debit),
        csvMoney(line.credit),
        built.summary.balanced ? "Balanserad" : "Differens " + csvMoney(built.summary.difference)
      ].map(csvEscape).join(";")),
      "",
      [
        "TOTAL",
        run.title || "",
        "",
        "",
        "",
        "",
        "",
        csvMoney(built.summary.totalDebit),
        csvMoney(built.summary.totalCredit),
        built.summary.balanced ? "Balanserad" : "Kontrollera differens"
      ].map(csvEscape).join(";")
    ];

    const csv = "\uFEFF" + csvRows.join("\r\n");
    const buffer = Buffer.from(csv, "utf8");

    const filename = safeFileName("bokforing-" + String(run.title || "lonekoring")) + ".csv";
    const encodedFilename = encodeURIComponent(filename);

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=\"" + filename + "\"; filename*=UTF-8''" + encodedFilename
    );
    res.setHeader("Content-Length", String(buffer.length));

    return res.status(200).send(buffer);
  } catch (error: any) {
    console.error("/api/admin/lon/bokforing/[id]/csv error", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte skapa bokföringsexport.",
    });
  }
}
