import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import {
  findPrimaryInvoiceAccount,
  loadCompanyBankAccounts,
  loadCompanyFinanceSettings,
  paymentAccountText,
} from "@/lib/companyFinance";

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

async function loadMeta(supabase: any) {
  const [accounts, settings] = await Promise.all([
    loadCompanyBankAccounts(supabase),
    loadCompanyFinanceSettings(supabase),
  ]);

  const invoiceAccount = findPrimaryInvoiceAccount(accounts);

  return {
    accounts,
    settings,
    invoiceAccount,
    paymentText:
      settings?.invoice_payment_text ||
      paymentAccountText(invoiceAccount) ||
      "Betalningsuppgifter saknas.",
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const id = String(req.query.id || "").trim();

  if (!id) {
    return res.status(400).json({
      ok: false,
      error: "Faktura-ID saknas.",
    });
  }

  try {
    const supabase = getSupabase();

    if (req.method === "GET") {
      const { data: invoice, error: invoiceError } = await supabase
        .from("finance_invoices")
        .select("*")
        .eq("id", id)
        .single();

      if (invoiceError) throw invoiceError;

      const { data: lines, error: linesError } = await supabase
        .from("finance_invoice_lines")
        .select("*")
        .eq("invoice_id", id)
        .order("line_order", { ascending: true });

      if (linesError) throw linesError;

      const meta = await loadMeta(supabase);

      return res.status(200).json({
        ok: true,
        invoice,
        lines: lines || [],
        ...meta,
      });
    }

    if (req.method === "POST") {
      const action = String(req.body?.action || "").trim();
      const now = new Date().toISOString();

      let updateData: any = {
        previewed_at: now,
        updated_at: now,
      };

      if (action === "approve") {
        updateData.approved_for_sending_at = now;
      }

      const { data, error } = await supabase
        .from("finance_invoices")
        .update(updateData)
        .eq("id", id)
        .select("*")
        .single();

      if (error) throw error;

      return res.status(200).json({
        ok: true,
        invoice: data,
      });
    }

    return res.status(405).json({
      ok: false,
      error: "Method not allowed",
    });
  } catch (error: any) {
    console.error("/api/admin/ekonomi/fakturor/[id]/preview error", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte hantera förhandsgranskning.",
    });
  }
}
