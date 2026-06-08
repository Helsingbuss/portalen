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
  const text = String(value ?? "").trim();
  return text.length ? text : null;
}

function cleanNumber(value: any, fallback = 0) {
  if (value === "" || value === null || value === undefined) return fallback;
  const normalized = String(value).replace(",", ".");
  const n = Number(normalized);
  return Number.isFinite(n) ? Number(n.toFixed(2)) : fallback;
}

function cleanBoolean(value: any, fallback = false) {
  if (value === true || value === "true" || value === "1" || value === 1) return true;
  if (value === false || value === "false" || value === "0" || value === 0) return false;
  return fallback;
}

function isMissingTableError(error: any) {
  const message = String(error?.message || "").toLowerCase();
  const code = String(error?.code || "").toLowerCase();

  return (
    code === "42p01" ||
    code === "pgrst205" ||
    message.includes("does not exist") ||
    message.includes("could not find") ||
    message.includes("schema cache")
  );
}

function calculateAmounts(body: any) {
  const gross = cleanNumber(body.gross_amount ?? body.amount, 0);
  const vatPercent = cleanNumber(body.vat_percent, 0);
  const amountIncludesVat = cleanBoolean(body.amount_includes_vat, true);

  if (vatPercent <= 0) {
    return {
      gross_amount: gross,
      net_amount: gross,
      vat_amount: 0,
    };
  }

  if (amountIncludesVat) {
    const net = gross / (1 + vatPercent / 100);
    const vat = gross - net;

    return {
      gross_amount: Number(gross.toFixed(2)),
      net_amount: Number(net.toFixed(2)),
      vat_amount: Number(vat.toFixed(2)),
    };
  }

  const vat = gross * vatPercent / 100;
  const total = gross + vat;

  return {
    gross_amount: Number(total.toFixed(2)),
    net_amount: Number(gross.toFixed(2)),
    vat_amount: Number(vat.toFixed(2)),
  };
}

function buildTransaction(body: any) {
  const amounts = calculateAmounts(body);

  return {
    transaction_type: cleanText(body.transaction_type) || "income",
    transaction_date: cleanText(body.transaction_date),
    title: cleanText(body.title),
    description: cleanText(body.description),

    category: cleanText(body.category),
    customer_supplier_name: cleanText(body.customer_supplier_name),

    gross_amount: amounts.gross_amount,
    net_amount: amounts.net_amount,
    vat_amount: amounts.vat_amount,
    vat_percent: cleanNumber(body.vat_percent, 0),
    amount_includes_vat: cleanBoolean(body.amount_includes_vat, true),

    payment_method: cleanText(body.payment_method) || "bank_transfer",
    bank_account_id: cleanText(body.bank_account_id),
    reference: cleanText(body.reference),

    invoice_id: cleanText(body.invoice_id),
    booking_id: cleanText(body.booking_id),
    receipt_url: cleanText(body.receipt_url),

    accounting_account: cleanText(body.accounting_account),
    vat_account: cleanText(body.vat_account),

    status: cleanText(body.status) || "draft",
    notes: cleanText(body.notes),
    updated_at: new Date().toISOString(),
  };
}

async function safeSelect(supabase: any, table: string, select = "*") {
  const { data, error } = await supabase
    .from(table)
    .select(select);

  if (error) {
    if (isMissingTableError(error)) {
      return [];
    }

    throw error;
  }

  return data || [];
}

function buildSummary(rows: any[]) {
  const activeRows = rows.filter((row) => row.status !== "archived");

  const incomeRows = activeRows.filter((row) => row.transaction_type === "income");
  const expenseRows = activeRows.filter((row) => row.transaction_type === "expense");

  const incomeGross = incomeRows.reduce((sum, row) => sum + Number(row.gross_amount || 0), 0);
  const incomeNet = incomeRows.reduce((sum, row) => sum + Number(row.net_amount || 0), 0);
  const outputVat = incomeRows.reduce((sum, row) => sum + Number(row.vat_amount || 0), 0);

  const expenseGross = expenseRows.reduce((sum, row) => sum + Number(row.gross_amount || 0), 0);
  const expenseNet = expenseRows.reduce((sum, row) => sum + Number(row.net_amount || 0), 0);
  const inputVat = expenseRows.reduce((sum, row) => sum + Number(row.vat_amount || 0), 0);

  return {
    total: activeRows.length,
    incomeCount: incomeRows.length,
    expenseCount: expenseRows.length,

    incomeGross: Number(incomeGross.toFixed(2)),
    incomeNet: Number(incomeNet.toFixed(2)),
    outputVat: Number(outputVat.toFixed(2)),

    expenseGross: Number(expenseGross.toFixed(2)),
    expenseNet: Number(expenseNet.toFixed(2)),
    inputVat: Number(inputVat.toFixed(2)),

    resultNet: Number((incomeNet - expenseNet).toFixed(2)),
    vatToPay: Number((outputVat - inputVat).toFixed(2)),
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const supabase = getSupabase();

    if (req.method === "POST") {
      const payload = buildTransaction(req.body || {});

      if (!payload.transaction_date) {
        return res.status(400).json({
          ok: false,
          error: "Datum saknas.",
        });
      }

      if (!payload.title) {
        return res.status(400).json({
          ok: false,
          error: "Titel saknas.",
        });
      }

      const { data, error } = await supabase
        .from("finance_transactions")
        .insert(payload)
        .select("*")
        .single();

      if (error) {
        if (isMissingTableError(error)) {
          return res.status(200).json({
            ok: false,
            needsSetup: true,
            error: "Tabellen finance_transactions saknas. Kör SQL-koden först.",
          });
        }

        throw error;
      }

      return res.status(201).json({
        ok: true,
        transaction: data,
      });
    }

    if (req.method !== "GET") {
      return res.status(405).json({
        ok: false,
        error: "Method not allowed",
      });
    }

    const q = String(req.query.q || "").trim().toLowerCase();
    const type = String(req.query.type || "").trim();
    const status = String(req.query.status || "").trim();
    const bankAccountId = String(req.query.bank_account_id || "").trim();

    let query: any = supabase
      .from("finance_transactions")
      .select("*")
      .neq("status", "archived")
      .order("transaction_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(500);

    if (type) query = query.eq("transaction_type", type);
    if (status) query = query.eq("status", status);
    if (bankAccountId) query = query.eq("bank_account_id", bankAccountId);

    const { data, error } = await query;

    if (error) {
      if (isMissingTableError(error)) {
        const accounts = await safeSelect(supabase, "company_bank_accounts", "*");
        const vatRates = await safeSelect(supabase, "company_vat_rates", "*");

        return res.status(200).json({
          ok: true,
          needsSetup: true,
          transactions: [],
          accounts,
          vatRates,
          summary: buildSummary([]),
        });
      }

      throw error;
    }

    let transactions = data || [];

    if (q) {
      transactions = transactions.filter((row: any) => {
        const haystack = [
          row.title,
          row.description,
          row.category,
          row.customer_supplier_name,
          row.payment_method,
          row.reference,
          row.notes,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return haystack.includes(q);
      });
    }

    const accounts = await safeSelect(supabase, "company_bank_accounts", "*");
    const vatRates = await safeSelect(supabase, "company_vat_rates", "*");

    return res.status(200).json({
      ok: true,
      needsSetup: false,
      transactions,
      accounts,
      vatRates,
      summary: buildSummary(transactions),
    });
  } catch (error: any) {
    console.error("/api/admin/ekonomi/intakter-utgifter error", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte hantera intäkter och utgifter.",
    });
  }
}
