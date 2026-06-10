import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import {
  findPrimaryInvoiceAccount,
  loadCompanyBankAccounts,
  loadCompanyFinanceSettings,
  paymentAccountText,
} from "@/lib/companyFinance";
import { generateCustomerInvoicePdf } from "@/lib/customerInvoicePdf";

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
  const id = String(req.query.id || "").trim();

  if (!id) {
    return res.status(400).json({
      ok: false,
      error: "Faktura-ID saknas.",
    });
  }

  try {
    const supabase = getSupabase();

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

    const pdfBytes = await generateCustomerInvoicePdf({
      invoice,
      lines: lines || [],
      settings: meta.settings,
      paymentText: invoice.payment_text || meta.paymentText,
    });

    const filename = "Faktura-" + String(invoice.invoice_number || id).replace(/[^a-zA-Z0-9_-]/g, "") + ".pdf";

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'inline; filename="' + filename + '"');

    return res.status(200).send(Buffer.from(pdfBytes));
  } catch (error: any) {
    console.error("/api/admin/ekonomi/fakturor/[id]/pdf error", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte skapa PDF.",
    });
  }
}
