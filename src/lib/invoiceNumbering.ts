export type ReservedInvoiceNumbers = {
  invoiceNumber: string;
  ocrNumber: string;
};

function toInt(value: any, fallback = 0) {
  const n = Number.parseInt(String(value || "").replace(/[^0-9]/g, ""), 10);
  return Number.isFinite(n) ? n : fallback;
}

async function maxExistingNumber(supabase: any, column: string, fallback: number) {
  const { data, error } = await supabase
    .from("finance_invoices")
    .select(column)
    .not(column, "is", null)
    .limit(1000);

  if (error) {
    return fallback;
  }

  const numbers = (data || [])
    .map((row: any) => toInt(row?.[column], 0))
    .filter((n: number) => n > 0);

  if (!numbers.length) return fallback;

  return Math.max(...numbers) + 1;
}

export async function reserveInvoiceNumbers(supabase: any): Promise<ReservedInvoiceNumbers> {
  const { data: settings } = await supabase
    .from("company_finance_settings")
    .select("settings_key,next_invoice_number,next_ocr_number")
    .eq("settings_key", "default")
    .maybeSingle();

  let nextInvoiceNumber = toInt(settings?.next_invoice_number, 0);
  let nextOcrNumber = toInt(settings?.next_ocr_number, 0);

  if (nextInvoiceNumber <= 0) {
    nextInvoiceNumber = await maxExistingNumber(supabase, "invoice_number", 16);
  }

  if (nextOcrNumber <= 0) {
    nextOcrNumber = await maxExistingNumber(supabase, "ocr_number", 1546);
  }

  const invoiceNumber = String(nextInvoiceNumber);
  const ocrNumber = String(nextOcrNumber);

  await supabase
    .from("company_finance_settings")
    .upsert(
      {
        settings_key: "default",
        next_invoice_number: nextInvoiceNumber + 1,
        next_ocr_number: nextOcrNumber + 1,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "settings_key",
      }
    );

  return {
    invoiceNumber,
    ocrNumber,
  };
}
