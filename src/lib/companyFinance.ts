export type CompanyBankAccount = {
  id?: string;
  account_label?: string | null;
  account_purpose?: string | null;
  account_type?: string | null;
  bank_name?: string | null;
  clearing_number?: string | null;
  account_number?: string | null;
  bankgiro?: string | null;
  plusgiro?: string | null;
  iban?: string | null;
  bic?: string | null;
  is_primary_for_invoices?: boolean | null;
  is_primary_for_payroll?: boolean | null;
  is_active?: boolean | null;
  display_order?: number | null;
  notes?: string | null;
};

export type CompanyFinanceSettings = {
  company_name?: string | null;
  legal_name?: string | null;
  org_number?: string | null;
  vat_number?: string | null;
  default_currency?: string | null;
  default_payment_terms_days?: number | null;
  invoice_payment_text?: string | null;
  reminder_fee?: number | null;
  late_interest_percent?: number | null;
};

function clean(value: any) {
  return String(value || "").trim();
}

export function maskBankValue(value?: string | null) {
  const text = clean(value).replace(/\s/g, "");

  if (!text) return "";
  if (text.length <= 4) return "****";

  return "**** " + text.slice(-4);
}

export function normalizeAccountNumber(value?: string | null) {
  return clean(value).replace(/[^0-9]/g, "");
}

export function normalizeIban(value?: string | null) {
  return clean(value).replace(/\s/g, "").toUpperCase();
}

export function formatIban(value?: string | null) {
  const iban = normalizeIban(value);

  if (!iban) return "";

  return iban.replace(/(.{4})/g, "$1 ").trim();
}

export function accountDisplayName(account?: CompanyBankAccount | null) {
  if (!account) return "Bankkonto saknas";

  return clean(account.account_label) || clean(account.bank_name) || "Bankkonto";
}

export function paymentAccountText(account?: CompanyBankAccount | null) {
  if (!account) {
    return "Bankuppgifter saknas. Lägg in primärt fakturakonto under Ekonomi → Bank & betalning.";
  }

  const parts = [];

  if (account.bankgiro) parts.push("Bankgiro: " + account.bankgiro);
  if (account.plusgiro) parts.push("Plusgiro: " + account.plusgiro);
  if (account.iban) parts.push("IBAN: " + formatIban(account.iban));
  if (account.bic) parts.push("BIC/SWIFT: " + account.bic);

  if (parts.length === 0 && account.clearing_number && account.account_number) {
    parts.push("Konto: " + account.clearing_number + " " + account.account_number);
  }

  return parts.join(" · ");
}

export async function loadCompanyFinanceSettings(supabase: any) {
  const { data, error } = await supabase
    .from("company_finance_settings")
    .select("*")
    .eq("settings_key", "default")
    .maybeSingle();

  if (error) {
    const message = String(error.message || "").toLowerCase();

    if (
      error.code === "42P01" ||
      error.code === "PGRST205" ||
      message.includes("does not exist") ||
      message.includes("could not find") ||
      message.includes("schema cache")
    ) {
      return null;
    }

    throw error;
  }

  return data || null;
}

export async function loadCompanyBankAccounts(supabase: any) {
  const { data, error } = await supabase
    .from("company_bank_accounts")
    .select("*")
    .eq("is_active", true)
    .order("display_order", { ascending: true })
    .order("account_label", { ascending: true });

  if (error) {
    const message = String(error.message || "").toLowerCase();

    if (
      error.code === "42P01" ||
      error.code === "PGRST205" ||
      message.includes("does not exist") ||
      message.includes("could not find") ||
      message.includes("schema cache")
    ) {
      return [];
    }

    throw error;
  }

  return data || [];
}

export function findPrimaryInvoiceAccount(accounts: CompanyBankAccount[]) {
  return (
    accounts.find((account) => account.is_primary_for_invoices) ||
    accounts.find((account) => account.account_purpose === "operating") ||
    accounts[0] ||
    null
  );
}

export function findPrimaryPayrollAccount(accounts: CompanyBankAccount[]) {
  return (
    accounts.find((account) => account.is_primary_for_payroll) ||
    accounts.find((account) => account.account_purpose === "payroll") ||
    accounts.find((account) => account.account_purpose === "operating") ||
    accounts[0] ||
    null
  );
}

export async function loadPrimaryInvoiceAccount(supabase: any) {
  const accounts = await loadCompanyBankAccounts(supabase);
  return findPrimaryInvoiceAccount(accounts);
}

export async function loadPrimaryPayrollAccount(supabase: any) {
  const accounts = await loadCompanyBankAccounts(supabase);
  return findPrimaryPayrollAccount(accounts);
}
