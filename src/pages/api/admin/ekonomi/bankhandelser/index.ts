import type { NextApiRequest, NextApiResponse } from "next";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { loadCompanyBankAccounts } from "@/lib/companyFinance";

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

function n(value: any) {
  if (value === null || value === undefined || value === "") return 0;

  let text = String(value)
    .trim()
    .replace(/\s/g, "")
    .replace(/kr/gi, "");

  if (text.includes(",") && text.includes(".")) {
    text = text.replace(/\./g, "").replace(",", ".");
  } else {
    text = text.replace(",", ".");
  }

  const num = Number(text);

  return Number.isFinite(num) ? Number(num.toFixed(2)) : 0;
}

function normalizeDate(value: any) {
  const text = String(value ?? "").trim();

  if (!text) return null;

  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return iso[1] + "-" + iso[2] + "-" + iso[3];

  const slashIso = text.match(/^(\d{4})\/(\d{2})\/(\d{2})/);
  if (slashIso) return slashIso[1] + "-" + slashIso[2] + "-" + slashIso[3];

  const sv = text.match(/^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{2,4})$/);
  if (sv) {
    const day = sv[1].padStart(2, "0");
    const month = sv[2].padStart(2, "0");
    let year = sv[3];

    if (year.length === 2) year = "20" + year;

    return year + "-" + month + "-" + day;
  }

  const date = new Date(text);

  if (!Number.isNaN(date.getTime())) {
    return date.toISOString().slice(0, 10);
  }

  return null;
}

function externalId(payload: any) {
  const raw = [
    payload.bank_account_id,
    payload.transaction_date,
    payload.amount,
    payload.description,
    payload.reference,
    payload.source,
  ].join("|");

  return crypto.createHash("sha256").update(raw).digest("hex");
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

function statusLabel(value: any) {
  switch (String(value || "")) {
    case "matched": return "Matchad";
    case "ignored": return "Ignorerad";
    case "new": return "Ny";
    default: return "Ny";
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const supabase = getSupabase();

    if (req.method === "GET") {
      const status = String(req.query.status || "").trim();
      const bankAccountId = String(req.query.bank_account_id || "").trim();

      const accounts = await loadCompanyBankAccounts(supabase);

      let query: any = supabase
        .from("finance_bank_transactions")
        .select("*")
        .order("transaction_date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(500);

      if (status) query = query.eq("status", status);
      if (bankAccountId) query = query.eq("bank_account_id", bankAccountId);

      const { data, error } = await query;

      if (error) {
        if (isMissingTableError(error)) {
          return res.status(200).json({
            ok: true,
            needsSetup: true,
            accounts: accounts || [],
            bankTransactions: [],
            summary: {
              total: 0,
              newCount: 0,
              matchedCount: 0,
              ignoredCount: 0,
              incomingAmount: 0,
              outgoingAmount: 0,
            },
          });
        }

        throw error;
      }

      const rows = data || [];

      return res.status(200).json({
        ok: true,
        needsSetup: false,
        accounts: accounts || [],
        bankTransactions: rows.map((row: any) => ({
          ...row,
          status_label: statusLabel(row.status),
        })),
        summary: {
          total: rows.length,
          newCount: rows.filter((row: any) => row.status === "new").length,
          matchedCount: rows.filter((row: any) => row.status === "matched").length,
          ignoredCount: rows.filter((row: any) => row.status === "ignored").length,
          incomingAmount: Number(rows.filter((row: any) => Number(row.amount) > 0).reduce((sum: number, row: any) => sum + Number(row.amount || 0), 0).toFixed(2)),
          outgoingAmount: Number(rows.filter((row: any) => Number(row.amount) < 0).reduce((sum: number, row: any) => sum + Math.abs(Number(row.amount || 0)), 0).toFixed(2)),
        },
      });
    }

    if (req.method === "POST") {
      const body = req.body || {};
      const bankAccountId = cleanText(body.bank_account_id);
      const rows = Array.isArray(body.rows) ? body.rows : [];

      if (!bankAccountId) {
        return res.status(400).json({
          ok: false,
          error: "Bankkonto saknas.",
        });
      }

      if (rows.length === 0) {
        return res.status(400).json({
          ok: false,
          error: "Inga bankhändelser att importera.",
        });
      }

      if (rows.length > 1000) {
        return res.status(400).json({
          ok: false,
          error: "Max 1000 bankhändelser per import.",
        });
      }

      const now = new Date().toISOString();
      const importBatchId = crypto.randomBytes(12).toString("hex");

      const payloads = rows
        .map((row: any, index: number) => {
          const transactionDate = normalizeDate(row.transaction_date || row.date);
          const amount = n(row.amount);
          const description =
            cleanText(row.description) ||
            cleanText(row.text) ||
            "Bankhändelse";

          if (!transactionDate || !description || amount === 0) {
            return null;
          }

          const payload = {
            bank_account_id: bankAccountId,
            transaction_date: transactionDate,
            description,
            reference: cleanText(row.reference),
            amount,
            balance: row.balance === "" || row.balance === null || row.balance === undefined ? null : n(row.balance),
            currency: cleanText(row.currency) || "SEK",
            source: cleanText(body.source) || "csv",
            import_batch_id: importBatchId,
            status: "new",
            matched_type: null,
            matched_invoice_id: null,
            matched_supplier_invoice_id: null,
            raw_data: row.raw_data || row,
            created_at: now,
            updated_at: now,
          };

          return {
            ...payload,
            external_id: externalId({
              ...payload,
              row_index: index,
            }),
          };
        })
        .filter(Boolean);

      if (payloads.length === 0) {
        return res.status(400).json({
          ok: false,
          error: "Inga giltiga bankhändelser hittades. Kontrollera datum, text och belopp.",
        });
      }

      const { data, error } = await supabase
        .from("finance_bank_transactions")
        .upsert(payloads, {
          onConflict: "external_id",
        })
        .select("*");

      if (error) {
        if (isMissingTableError(error)) {
          return res.status(200).json({
            ok: false,
            needsSetup: true,
            error: "Tabellen för bankhändelser saknas. Kör SQL-koden först.",
          });
        }

        throw error;
      }

      return res.status(201).json({
        ok: true,
        importBatchId,
        importedCount: data?.length || 0,
        rows: data || [],
      });
    }

    if (req.method === "PATCH") {
      const body = req.body || {};
      const id = cleanText(body.id);
      const status = cleanText(body.status);

      if (!id || !status) {
        return res.status(400).json({
          ok: false,
          error: "ID och status krävs.",
        });
      }

      if (!["new", "matched", "ignored"].includes(status)) {
        return res.status(400).json({
          ok: false,
          error: "Ogiltig status.",
        });
      }

      const { data, error } = await supabase
        .from("finance_bank_transactions")
        .update({
          status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select("*")
        .single();

      if (error) throw error;

      return res.status(200).json({
        ok: true,
        bankTransaction: data,
      });
    }

    return res.status(405).json({
      ok: false,
      error: "Method not allowed",
    });
  } catch (error: any) {
    console.error("/api/admin/ekonomi/bankhandelser error", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte hantera bankhändelser.",
    });
  }
}
