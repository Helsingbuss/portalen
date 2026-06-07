
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

function cleanText(value: any) {
  return String(value ?? "").trim();
}

function onlyDigits(value: any) {
  return cleanText(value).replace(/\D/g, "");
}

function money(value: any) {
  return Number(Number(value || 0).toFixed(2));
}

function escapeXml(value: any) {
  return cleanText(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function safeId(value: any) {
  return cleanText(value)
    .replace(/å/g, "a")
    .replace(/ä/g, "a")
    .replace(/ö/g, "o")
    .replace(/Å/g, "A")
    .replace(/Ä/g, "A")
    .replace(/Ö/g, "O")
    .replace(/[^A-Za-z0-9]/g, "")
    .slice(0, 30) || "PAYMENT";
}

function safeFileName(value: string) {
  return value
    .toLowerCase()
    .replace(/å/g, "a")
    .replace(/ä/g, "a")
    .replace(/ö/g, "o")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "swedbank-lon";
}

function isoDate(value: any) {
  if (!value) return new Date().toISOString().slice(0, 10);

  try {
    return new Date(value).toISOString().slice(0, 10);
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

function isoDateTime() {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

function getSettings(query: any) {
  const debtorName = cleanText(query.debtorName) || cleanText(process.env.PAYROLL_DEBTOR_NAME) || "Helsingbuss";
  const debtorOrgNumber = onlyDigits(query.debtorOrgNumber || process.env.PAYROLL_DEBTOR_ORGNR);
  const debtorIban = cleanText(query.debtorIban || process.env.PAYROLL_DEBTOR_IBAN).replace(/\s/g, "").toUpperCase();
  const debtorAccount = onlyDigits(query.debtorAccount || process.env.PAYROLL_DEBTOR_ACCOUNT);
  const messagePrefix = safeId(query.messagePrefix || process.env.PAYROLL_MESSAGE_PREFIX || "HELSINGBUSS");
  const paymentInfoId = safeId(query.paymentInfoId || "LON");

  return {
    debtorName,
    debtorOrgNumber,
    debtorIban,
    debtorAccount,
    messagePrefix,
    paymentInfoId,
  };
}

function creditorAccountXml(row: any) {
  const iban = cleanText(row.iban).replace(/\s/g, "").toUpperCase();
  const clearing = onlyDigits(row.clearing_number);
  const account = onlyDigits(row.account_number);
  const localAccount = clearing + account;

  if (iban) {
    return "<Id><IBAN>" + escapeXml(iban) + "</IBAN></Id>";
  }

  return "<Id><Othr><Id>" + escapeXml(localAccount) + "</Id></Othr></Id>";
}

function debtorAccountXml(settings: any) {
  if (settings.debtorIban) {
    return "<Id><IBAN>" + escapeXml(settings.debtorIban) + "</IBAN></Id>";
  }

  return "<Id><Othr><Id>" + escapeXml(settings.debtorAccount) + "</Id></Othr></Id>";
}

function validateRows(rows: any[]) {
  const result = rows.map((row) => {
    const payout = money(row.payout_amount || row.net_pay || 0);
    const iban = cleanText(row.iban);
    const clearing = onlyDigits(row.clearing_number);
    const account = onlyDigits(row.account_number);

    const missingAccount = !iban && (!clearing || !account);
    const missingName = !cleanText(row.recipient_name || row.employee_name_snapshot);
    const zeroAmount = payout <= 0;

    return {
      ...row,
      payout_amount_final: payout,
      recipient_name_final: cleanText(row.recipient_name || row.employee_name_snapshot),
      missing_account: missingAccount,
      missing_name: missingName,
      zero_amount: zeroAmount,
      can_export: !missingAccount && !missingName && !zeroAmount,
    };
  });

  return result;
}

function buildSummary(rows: any[]) {
  const readyRows = rows.filter((row) => row.can_export);

  return {
    rows: rows.length,
    ready: readyRows.length,
    missingAccount: rows.filter((row) => row.missing_account).length,
    missingName: rows.filter((row) => row.missing_name).length,
    zeroAmount: rows.filter((row) => row.zero_amount).length,
    totalAmount: money(readyRows.reduce((sum, row) => sum + Number(row.payout_amount_final || 0), 0)),
  };
}

async function loadRowsForRun(supabase: any, runId: string) {
  const { data: rowData, error: rowError } = await supabase
    .from("payroll_run_rows")
    .select("*")
    .eq("payroll_run_id", runId)
    .order("employee_name_snapshot", { ascending: true });

  if (rowError) throw rowError;

  const { data: bankData, error: bankError } = await supabase
    .from("payroll_employee_bank_details")
    .select("*")
    .eq("is_active", true);

  if (bankError) throw bankError;

  const bankDetails = bankData || [];

  const combined = (rowData || []).map((row: any) => {
    const bank = bankDetails.find((item: any) => item.employee_id === row.employee_id);

    return {
      ...row,
      bank_detail_id: bank?.id || null,
      recipient_name: bank?.recipient_name || row.employee_name_snapshot || "",
      bank_name: bank?.bank_name || "",
      clearing_number: bank?.clearing_number || "",
      account_number: bank?.account_number || "",
      iban: bank?.iban || "",
      bic: bank?.bic || "",
      payslip_email: bank?.payslip_email || "",
    };
  });

  return validateRows(combined);
}

function buildPain001Xml(run: any, rows: any[], settings: any) {
  const readyRows = rows.filter((row) => row.can_export);
  const totalAmount = money(readyRows.reduce((sum, row) => sum + Number(row.payout_amount_final || 0), 0));
  const createdAt = isoDateTime();
  const executionDate = isoDate(run.payout_date);
  const msgId = safeId(settings.messagePrefix) + "-" + safeId(run.id).slice(0, 12) + "-" + Date.now();
  const pmtInfId = safeId(settings.paymentInfoId) + "-" + safeId(run.id).slice(0, 12);

  const txXml = readyRows.map((row, index) => {
    const amount = money(row.payout_amount_final).toFixed(2);
    const endToEndId = "LON-" + safeId(row.id).slice(0, 24);
    const recipientName = row.recipient_name_final || row.employee_name_snapshot || "Mottagare";
    const remittance = "Lön " + (run.period_start || "") + " - " + (run.period_end || "");

    return [
      "      <CdtTrfTxInf>",
      "        <PmtId>",
      "          <EndToEndId>" + escapeXml(endToEndId) + "</EndToEndId>",
      "        </PmtId>",
      "        <Amt>",
      "          <InstdAmt Ccy=\"SEK\">" + amount + "</InstdAmt>",
      "        </Amt>",
      "        <Cdtr>",
      "          <Nm>" + escapeXml(recipientName) + "</Nm>",
      "        </Cdtr>",
      "        <CdtrAcct>",
      "          " + creditorAccountXml(row),
      "        </CdtrAcct>",
      "        <RmtInf>",
      "          <Ustrd>" + escapeXml(remittance) + "</Ustrd>",
      "        </RmtInf>",
      "      </CdtTrfTxInf>"
    ].join("\n");
  }).join("\n");

  return [
    "<?xml version=\"1.0\" encoding=\"UTF-8\"?>",
    "<Document xmlns=\"urn:iso:std:iso:20022:tech:xsd:pain.001.001.03\" xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\">",
    "  <CstmrCdtTrfInitn>",
    "    <GrpHdr>",
    "      <MsgId>" + escapeXml(msgId) + "</MsgId>",
    "      <CreDtTm>" + createdAt + "</CreDtTm>",
    "      <NbOfTxs>" + readyRows.length + "</NbOfTxs>",
    "      <CtrlSum>" + totalAmount.toFixed(2) + "</CtrlSum>",
    "      <InitgPty>",
    "        <Nm>" + escapeXml(settings.debtorName) + "</Nm>",
    settings.debtorOrgNumber ? "        <Id><OrgId><Othr><Id>" + escapeXml(settings.debtorOrgNumber) + "</Id></Othr></OrgId></Id>" : "",
    "      </InitgPty>",
    "    </GrpHdr>",
    "    <PmtInf>",
    "      <PmtInfId>" + escapeXml(pmtInfId) + "</PmtInfId>",
    "      <PmtMtd>TRF</PmtMtd>",
    "      <BtchBookg>true</BtchBookg>",
    "      <NbOfTxs>" + readyRows.length + "</NbOfTxs>",
    "      <CtrlSum>" + totalAmount.toFixed(2) + "</CtrlSum>",
    "      <PmtTpInf>",
    "        <CtgyPurp><Cd>SALA</Cd></CtgyPurp>",
    "      </PmtTpInf>",
    "      <ReqdExctnDt>" + executionDate + "</ReqdExctnDt>",
    "      <Dbtr>",
    "        <Nm>" + escapeXml(settings.debtorName) + "</Nm>",
    "      </Dbtr>",
    "      <DbtrAcct>",
    "        " + debtorAccountXml(settings),
    "      </DbtrAcct>",
    "      <DbtrAgt>",
    "        <FinInstnId><BIC>SWEDSESS</BIC></FinInstnId>",
    "      </DbtrAgt>",
    "      <ChrgBr>SLEV</ChrgBr>",
    txXml,
    "    </PmtInf>",
    "  </CstmrCdtTrfInitn>",
    "</Document>"
  ].filter(Boolean).join("\n");
}

async function loadData(supabase: any, selectedRunId: string, settings: any) {
  const { data: runsData, error: runsError } = await supabase
    .from("payroll_runs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);

  if (runsError) throw runsError;

  const runs = runsData || [];
  const runId = selectedRunId || runs?.[0]?.id || "";

  let selectedRun = null;
  let rows: any[] = [];
  let summary = buildSummary([]);

  if (runId) {
    selectedRun = runs.find((run: any) => run.id === runId) || null;
    rows = await loadRowsForRun(supabase, runId);
    summary = buildSummary(rows);
  }

  const settingsWarnings = {
    missingDebtorName: !settings.debtorName,
    missingDebtorAccount: !settings.debtorIban && !settings.debtorAccount,
    missingOrgNumber: !settings.debtorOrgNumber,
  };

  return {
    runs,
    selectedRun,
    rows,
    summary,
    settings,
    settingsWarnings,
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const supabase = getSupabase();

    if (req.method === "POST") {
      const payrollRunId = cleanText(req.body?.payroll_run_id);
      const reference = cleanText(req.body?.swedbank_export_reference);
      const notes = cleanText(req.body?.swedbank_export_notes);

      if (!payrollRunId) {
        return res.status(400).json({
          ok: false,
          error: "Lönekörning saknas.",
        });
      }

      const now = new Date().toISOString();

      const { data, error } = await supabase
        .from("payroll_runs")
        .update({
          swedbank_exported_at: now,
          swedbank_export_reference: reference,
          swedbank_export_notes: notes,
          updated_at: now,
        })
        .eq("id", payrollRunId)
        .select("*")
        .single();

      if (error) throw error;

      return res.status(200).json({
        ok: true,
        run: data,
      });
    }

    if (req.method !== "GET") {
      return res.status(405).json({
        ok: false,
        error: "Method not allowed",
      });
    }

    const selectedRunId = cleanText(req.query.payroll_run_id);
    const settings = getSettings(req.query);

    const data = await loadData(supabase, selectedRunId, settings);

    return res.status(200).json({
      ok: true,
      ...data,
    });
  } catch (error: any) {
    console.error("/api/admin/lon/swedbank error", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte hämta Swedbank-underlag.",
    });
  }
}
