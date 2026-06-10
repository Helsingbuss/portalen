import type { NextApiRequest, NextApiResponse } from "next";
import QRCode from "qrcode";
import { createClient } from "@supabase/supabase-js";
import {
  findPrimaryInvoiceAccount,
  loadCompanyBankAccounts,
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

function onlyDigits(value: any) {
  return String(value || "").replace(/[^0-9]/g, "");
}

function amountNumber(value: any) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? Number(n.toFixed(2)) : 0;
}

function amountWithComma(value: any) {
  return amountNumber(value).toFixed(2).replace(".", ",");
}

function safeMessage(value: any) {
  const text = String(value || "").trim();
  return (text || "Faktura").slice(0, 50);
}

async function createLocalSwishQr({
  swishNumber,
  amount,
  message,
}: {
  swishNumber: string;
  amount: number;
  message: string;
}) {
  /*
    Swish QR C-format:
    C<swishnummer>;<belopp>;<meddelande>;<lock>

    0 i slutet används för låst/förifyllt flöde.
    Beloppet hämtas alltid från fakturans totalbelopp.
  */
  const payload =
    "C" +
    swishNumber +
    ";" +
    amountWithComma(amount) +
    ";" +
    message +
    ";0";

  const qrDataUrl = await QRCode.toDataURL(payload, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 420,
  });

  return {
    payload,
    qrDataUrl,
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

    const accounts = await loadCompanyBankAccounts(supabase);
    const invoiceAccount: any = findPrimaryInvoiceAccount(accounts);

    const swishNumber =
      onlyDigits(invoiceAccount?.swish_number) ||
      onlyDigits(process.env.NEXT_PUBLIC_COMPANY_SWISH_NUMBER) ||
      onlyDigits(process.env.COMPANY_SWISH_NUMBER);

    if (!swishNumber) {
      return res.status(404).json({
        ok: false,
        error: "Swishnummer saknas. Lägg in Swishnummer på primärt fakturakonto under Ekonomi → Bank & betalning.",
      });
    }

    const invoiceNumber = String(invoice.invoice_number || invoice.id || "").trim();
    const fixedAmount = amountNumber(invoice.total_amount || invoice.unpaid_amount || 0);
    const message = safeMessage("Faktura " + invoiceNumber);

    if (fixedAmount <= 0) {
      return res.status(400).json({
        ok: false,
        error: "Fakturabeloppet är 0 kr. Skapa fakturarader och spara fakturan först.",
      });
    }

    const qr = await createLocalSwishQr({
      swishNumber,
      amount: fixedAmount,
      message,
    });

    return res.status(200).json({
      ok: true,
      swishNumber,
      amount: fixedAmount.toFixed(2),
      message,
      lockedAmount: true,
      lockedMessage: true,
      qrSource: "local",
      qrPayload: qr.payload,
      qrDataUrl: qr.qrDataUrl,
    });
  } catch (error: any) {
    console.error("/api/admin/ekonomi/fakturor/[id]/swish-qr error", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte skapa Swish QR-kod.",
    });
  }
}
