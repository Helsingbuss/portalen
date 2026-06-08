import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import {
  findPrimaryInvoiceAccount,
  findPrimaryPayrollAccount,
  formatIban,
  loadCompanyBankAccounts,
  loadCompanyFinanceSettings,
  maskBankValue,
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

function publicAccount(account: any) {
  if (!account) return null;

  return {
    id: account.id,
    account_label: account.account_label,
    account_purpose: account.account_purpose,
    account_type: account.account_type,
    bank_name: account.bank_name,
    clearing_number: account.clearing_number,
    account_number_masked: maskBankValue(account.account_number),
    bankgiro: account.bankgiro,
    plusgiro: account.plusgiro,
    iban: formatIban(account.iban),
    iban_masked: maskBankValue(account.iban),
    bic: account.bic,
    is_primary_for_invoices: account.is_primary_for_invoices,
    is_primary_for_payroll: account.is_primary_for_payroll,
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const supabase = getSupabase();

    if (req.method !== "GET") {
      return res.status(405).json({
        ok: false,
        error: "Method not allowed",
      });
    }

    const [settings, accounts] = await Promise.all([
      loadCompanyFinanceSettings(supabase),
      loadCompanyBankAccounts(supabase),
    ]);

    const invoiceAccount = findPrimaryInvoiceAccount(accounts);
    const payrollAccount = findPrimaryPayrollAccount(accounts);

    return res.status(200).json({
      ok: true,
      settings,
      invoiceAccount: publicAccount(invoiceAccount),
      payrollAccount: publicAccount(payrollAccount),
      invoicePaymentText:
        settings?.invoice_payment_text ||
        paymentAccountText(invoiceAccount) ||
        "Bankuppgifter saknas.",
      accounts: accounts.map(publicAccount),
    });
  } catch (error: any) {
    console.error("/api/admin/ekonomi/bank/payment-info error", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte hämta betalningsinformation.",
    });
  }
}
