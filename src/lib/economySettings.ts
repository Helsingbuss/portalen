export type EconomySettings = {
  invoice_payment_text: string;
  default_payment_terms_days: number;
  reminder_fee_amount: number;
  late_interest_percent: number;
  reminder_payment_days: number;
  default_sales_account: string;
  default_output_vat_account: string;
  default_cost_account: string;
  default_input_vat_account: string;
};

export const DEFAULT_ECONOMY_SETTINGS: EconomySettings = {
  invoice_payment_text:
    "Betalning sker till angivet bankgiro eller via Swish. Ange alltid fakturans OCR vid betalning.",
  default_payment_terms_days: 10,
  reminder_fee_amount: 60,
  late_interest_percent: 10,
  reminder_payment_days: 7,
  default_sales_account: "3010",
  default_output_vat_account: "2631",
  default_cost_account: "4010",
  default_input_vat_account: "2641",
};

function num(value: any, fallback: number) {
  const parsed = Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function int(value: any, fallback: number) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function txt(value: any, fallback: string) {
  const text = String(value ?? "").trim();
  return text || fallback;
}

export async function loadEconomySettings(supabase: any): Promise<EconomySettings> {
  try {
    const { data, error } = await supabase
      .from("company_finance_settings")
      .select("*")
      .eq("settings_key", "default")
      .maybeSingle();

    if (error || !data) {
      return DEFAULT_ECONOMY_SETTINGS;
    }

    return {
      invoice_payment_text: txt(data.invoice_payment_text, DEFAULT_ECONOMY_SETTINGS.invoice_payment_text),
      default_payment_terms_days: int(data.default_payment_terms_days, DEFAULT_ECONOMY_SETTINGS.default_payment_terms_days),
      reminder_fee_amount: num(data.reminder_fee_amount, DEFAULT_ECONOMY_SETTINGS.reminder_fee_amount),
      late_interest_percent: num(data.late_interest_percent, DEFAULT_ECONOMY_SETTINGS.late_interest_percent),
      reminder_payment_days: int(data.reminder_payment_days, DEFAULT_ECONOMY_SETTINGS.reminder_payment_days),
      default_sales_account: txt(data.default_sales_account, DEFAULT_ECONOMY_SETTINGS.default_sales_account),
      default_output_vat_account: txt(data.default_output_vat_account, DEFAULT_ECONOMY_SETTINGS.default_output_vat_account),
      default_cost_account: txt(data.default_cost_account, DEFAULT_ECONOMY_SETTINGS.default_cost_account),
      default_input_vat_account: txt(data.default_input_vat_account, DEFAULT_ECONOMY_SETTINGS.default_input_vat_account),
    };
  } catch {
    return DEFAULT_ECONOMY_SETTINGS;
  }
}

function missing(value: any) {
  return value === undefined || value === null || String(value).trim() === "";
}

export function applyCustomerInvoiceDefaultsToBody(body: any, settings: EconomySettings) {
  if (!body || typeof body !== "object") return body;

  if (missing(body.payment_terms_days)) {
    body.payment_terms_days = settings.default_payment_terms_days;
  }

  if (missing(body.default_payment_terms_days)) {
    body.default_payment_terms_days = settings.default_payment_terms_days;
  }

  if (missing(body.payment_text)) {
    body.payment_text = settings.invoice_payment_text;
  }

  if (missing(body.invoice_payment_text)) {
    body.invoice_payment_text = settings.invoice_payment_text;
  }

  if (Array.isArray(body.lines)) {
    body.lines = body.lines.map((line: any) => ({
      ...line,
      sales_account: missing(line?.sales_account) ? settings.default_sales_account : line.sales_account,
      vat_account: missing(line?.vat_account) ? settings.default_output_vat_account : line.vat_account,
    }));
  }

  return body;
}

export function applySupplierInvoiceDefaultsToBody(body: any, settings: EconomySettings) {
  if (!body || typeof body !== "object") return body;

  if (missing(body.default_cost_account)) {
    body.default_cost_account = settings.default_cost_account;
  }

  if (Array.isArray(body.lines)) {
    body.lines = body.lines.map((line: any) => ({
      ...line,
      cost_account: missing(line?.cost_account) ? settings.default_cost_account : line.cost_account,
      vat_account: missing(line?.vat_account) ? settings.default_input_vat_account : line.vat_account,
    }));
  }

  return body;
}
