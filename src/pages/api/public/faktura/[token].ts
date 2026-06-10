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
    settings,
    invoiceAccount,
    paymentText:
      settings?.invoice_payment_text ||
      paymentAccountText(invoiceAccount) ||
      "Betalningsuppgifter saknas.",
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const token = String(req.query.token || "").trim();

  if (!token) {
    return res.status(400).json({
      ok: false,
      error: "Fakturalänk saknas.",
    });
  }

  try {
    const supabase = getSupabase();

    const { data: invoice, error: invoiceError } = await supabase
      .from("finance_invoices")
      .select("*")
      .eq("public_token", token)
      .neq("status", "archived")
      .single();

    if (invoiceError || !invoice) {
      return res.status(404).json({
        ok: false,
        error: "Fakturan kunde inte hittas.",
      });
    }

    const { data: lines, error: linesError } = await supabase
      .from("finance_invoice_lines")
      .select("*")
      .eq("invoice_id", invoice.id)
      .order("line_order", { ascending: true });

    if (linesError) throw linesError;

    const meta = await loadMeta(supabase);

    await supabase
      .from("finance_invoices")
      .update({
        public_viewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", invoice.id);

    return res.status(200).json({
      ok: true,
      invoice,
      lines: lines || [],
      ...meta,
    });
  } catch (error: any) {
    console.error("/api/public/faktura/[token] error", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte hämta fakturan.",
    });
  }
}
