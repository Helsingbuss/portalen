import { generateCustomerInvoicePdf } from "@/lib/customerInvoicePdf";
import type { NextApiRequest, NextApiResponse } from "next";
import crypto from "crypto";
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

const resendApiKey = process.env.RESEND_API_KEY;

const fromEmail =
  process.env.INVOICE_FROM_EMAIL ||
  process.env.RESEND_FROM_EMAIL ||
  process.env.FROM_EMAIL ||
  "Helsingbuss <noreply@helsingbuss.se>";

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

function createPublicToken() {
  return crypto.randomBytes(24).toString("hex");
}

function fmtMoney(value?: number | string | null) {
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: "SEK",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function fmtDate(value?: string | null) {
  if (!value) return "—";

  try {
    return new Intl.DateTimeFormat("sv-SE", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function escapeHtml(value: any) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function appBaseUrl(req: NextApiRequest) {
  const configured =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.APP_URL;

  if (configured) {
    return configured.replace(/\/$/, "");
  }

  const proto = String(req.headers["x-forwarded-proto"] || "http").split(",")[0];
  const host = req.headers.host || "localhost:3000";

  return proto + "://" + host;
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

async function ensurePublicToken(supabase: any, invoice: any) {
  if (invoice.public_token) {
    return invoice;
  }

  const token = createPublicToken();

  const { data, error } = await supabase
    .from("finance_invoices")
    .update({
      public_token: token,
      public_token_created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", invoice.id)
    .select("*")
    .single();

  if (error) throw error;

  return data;
}

function invoiceHtml({
  invoice,
  lines,
  settings,
  paymentText,
  publicInvoiceUrl,
}: {
  invoice: any;
  lines: any[];
  settings: any;
  paymentText: string;
  publicInvoiceUrl: string;
}) {
  const companyName = settings?.company_name || "Helsingbuss";
  const rows = lines
    .map((line) => {
      return `
        <tr>
          <td style="padding:12px;border-bottom:1px solid #e5e7eb;">
            <strong>${escapeHtml(line.description)}</strong>
            ${line.extra_description ? `<br><span style="color:#64748b;white-space:pre-line;">${escapeHtml(line.extra_description)}</span>` : ""}
          </td>
          <td style="padding:12px;border-bottom:1px solid #e5e7eb;text-align:right;">${escapeHtml(line.quantity)}</td>
          <td style="padding:12px;border-bottom:1px solid #e5e7eb;text-align:right;">${fmtMoney(line.line_total_incl_vat)}</td>
        </tr>
      `;
    })
    .join("");

  return `
<!doctype html>
<html>
  <body style="margin:0;background:#f5f4f0;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
    <div style="max-width:760px;margin:0 auto;padding:28px;">
      <div style="background:#ffffff;border-radius:18px;border:1px solid #e5e7eb;overflow:hidden;">
        <div style="background:#194C66;color:#ffffff;padding:26px 30px;">
          <h1 style="margin:0;font-size:28px;">${escapeHtml(companyName)}</h1>
          <p style="margin:8px 0 0;font-size:15px;">Faktura ${escapeHtml(invoice.invoice_number || "")}</p>
        </div>

        <div style="padding:30px;">
          <p style="font-size:16px;line-height:1.6;margin-top:0;">
            Hej ${escapeHtml(invoice.customer_name || "kund")},<br>
            Här kommer er faktura från ${escapeHtml(companyName)}.
          </p>

          <div style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:14px;padding:18px;margin:24px 0;">
            <p style="margin:0 0 8px;"><strong>Fakturanummer:</strong> ${escapeHtml(invoice.invoice_number || "—")}</p>
            <p style="margin:0 0 8px;"><strong>OCR:</strong> ${escapeHtml(invoice.ocr_number || invoice.invoice_number || "—")}</p>
            <p style="margin:0 0 8px;"><strong>Fakturadatum:</strong> ${fmtDate(invoice.invoice_date)}</p>
            <p style="margin:0 0 8px;"><strong>Förfallodatum:</strong> ${fmtDate(invoice.due_date)}</p>
            <p style="margin:0;"><strong>Att betala:</strong> <span style="font-size:20px;color:#194C66;font-weight:800;">${fmtMoney(invoice.total_amount)}</span></p>
          </div>

          <table style="width:100%;border-collapse:collapse;margin:24px 0;">
            <thead>
              <tr style="background:#194C66;color:#ffffff;">
                <th style="padding:12px;text-align:left;">Beskrivning</th>
                <th style="padding:12px;text-align:right;">Antal</th>
                <th style="padding:12px;text-align:right;">Summa</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>

          <div style="background:#ecfeff;border:1px solid #bae6fd;border-radius:14px;padding:18px;margin:24px 0;line-height:1.6;">
            <strong>Betalningsinformation</strong><br>
            <span style="white-space:pre-line;">${escapeHtml(paymentText || invoice.payment_text || "Betalningsuppgifter saknas.")}</span>
          </div>

          <p style="line-height:1.6;">
            Du kan öppna fakturan här:<br>
            <a href="${escapeHtml(publicInvoiceUrl)}" style="display:inline-block;margin-top:10px;background:#00645d;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:700;">Öppna fakturan</a>
          </p>

          <p style="margin-top:28px;line-height:1.6;">
            Tack för att ni valt Helsingbuss.
          </p>
        </div>
      </div>

      <p style="text-align:center;color:#64748b;font-size:12px;margin-top:18px;">
        Detta mejl skickades från Helsingbuss Portal.
      </p>
    </div>
  </body>
</html>
`;
}

async function sendWithResend({
  to,
  subject,
  html,
  attachments,
}: {
  to: string;
  subject: string;
  html: string;
  attachments?: { filename: string; content: string }[];
}) {
  if (!resendApiKey) {
    throw new Error("RESEND_API_KEY saknas i miljövariablerna.");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + resendApiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [to],
      subject,
      html,
      attachments: attachments || [],
    }),
  });

  const json = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(json?.message || json?.error || "Resend kunde inte skicka mejlet.");
  }

  return json;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const id = String(req.query.id || "").trim();

  if (!id) {
    return res.status(400).json({
      ok: false,
      error: "Faktura-ID saknas.",
    });
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      error: "Method not allowed",
    });
  }

  const supabase = getSupabase();

  try {
    const { data: invoiceRaw, error: invoiceError } = await supabase
      .from("finance_invoices")
      .select("*")
      .eq("id", id)
      .single();

    if (invoiceError) throw invoiceError;

    if (!invoiceRaw.approved_for_sending_at) {
      return res.status(409).json({
        ok: false,
        error: "Fakturan måste förhandsgranskas och godkännas innan den kan skickas.",
      });
    }

    const invoice = await ensurePublicToken(supabase, invoiceRaw);

    const toEmail = String(req.body?.to || invoice.customer_email || "").trim();

    if (!toEmail) {
      return res.status(400).json({
        ok: false,
        error: "Kundens e-post saknas.",
      });
    }

    const { data: lines, error: linesError } = await supabase
      .from("finance_invoice_lines")
      .select("*")
      .eq("invoice_id", id)
      .order("line_order", { ascending: true });

    if (linesError) throw linesError;

    const meta = await loadMeta(supabase);
    const baseUrl = appBaseUrl(req);
    const publicInvoiceUrl =
      baseUrl + "/faktura/" + encodeURIComponent(invoice.public_token);

    const subject =
      "Faktura " +
      String(invoice.invoice_number || "") +
      " från " +
      String(meta.settings?.company_name || "Helsingbuss");

    const html = invoiceHtml({
      invoice,
      lines: lines || [],
      settings: meta.settings,
      paymentText: invoice.payment_text || meta.paymentText,
      publicInvoiceUrl,
    });

    const pdfBytes = await generateCustomerInvoicePdf({
      invoice,
      lines: lines || [],
      settings: meta.settings,
      paymentText: invoice.payment_text || meta.paymentText,
    });

    const pdfBase64 = Buffer.from(pdfBytes).toString("base64");
    const pdfFilename =
      "Faktura-" +
      String(invoice.invoice_number || invoice.id).replace(/[^a-zA-Z0-9_-]/g, "") +
      ".pdf";

    const sendResult = await sendWithResend({
      to: toEmail,
      subject,
      html,
      attachments: [
        {
          filename: pdfFilename,
          content: pdfBase64,
        },
      ],
    });

    const now = new Date().toISOString();

    const nextStatus =
      invoice.status === "paid" || invoice.status === "credited"
        ? invoice.status
        : "sent";

    const { data: updatedInvoice, error: updateError } = await supabase
      .from("finance_invoices")
      .update({
        status: nextStatus,
        sent_at: now,
        sent_to_email: toEmail,
        last_send_error: null,
        updated_at: now,
      })
      .eq("id", id)
      .select("*")
      .single();

    if (updateError) throw updateError;

    return res.status(200).json({
      ok: true,
      invoice: updatedInvoice,
      publicInvoiceUrl,
      sendResult,
    });
  } catch (error: any) {
    console.error("/api/admin/ekonomi/fakturor/[id]/send-email error", error);

    try {
      await supabase
        .from("finance_invoices")
        .update({
          last_send_error: error?.message || "Kunde inte skicka fakturan.",
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);
    } catch {
      // Ignorera loggningsfel.
    }

    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte skicka fakturan.",
    });
  }
}
