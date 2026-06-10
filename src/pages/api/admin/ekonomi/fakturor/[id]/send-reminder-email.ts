import type { NextApiRequest, NextApiResponse } from "next";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;

const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY;

const resendApiKey = process.env.RESEND_API_KEY;

const fromEmail =
  process.env.INVOICE_FROM_EMAIL ||
  process.env.RESEND_FROM_EMAIL ||
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

function cleanText(value: any) {
  const text = String(value ?? "").trim();
  return text.length ? text : null;
}

function toBool(value: any) {
  return value === true || value === "true" || value === 1 || value === "1";
}

function n(value: any, fallback = 0) {
  const num = Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(num) ? num : fallback;
}

function roundMoney(value: number) {
  return Number(value.toFixed(2));
}

function escapeHtml(value: any) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fmtMoney(value: any) {
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
    return String(value);
  }
}

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function daysOverdue(dueDate?: string | null) {
  if (!dueDate) return 0;

  const today = new Date(todayDate() + "T00:00:00");
  const due = new Date(dueDate + "T00:00:00");

  if (Number.isNaN(due.getTime())) return 0;

  const days = Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));

  return Math.max(0, days);
}

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy.toISOString().slice(0, 10);
}

function baseUrlFromRequest(req: NextApiRequest) {
  const envUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    process.env.NEXTAUTH_URL ||
    process.env.VERCEL_URL;

  if (envUrl) {
    if (envUrl.startsWith("http")) return envUrl.replace(/\/$/, "");
    return ("https://" + envUrl).replace(/\/$/, "");
  }

  const host = req.headers.host || "localhost:3000";
  const proto = host.includes("localhost") ? "http" : "https";

  return proto + "://" + host;
}

async function ensurePublicToken(supabase: any, invoice: any) {
  if (invoice.public_token) {
    return invoice.public_token;
  }

  const token = crypto.randomBytes(24).toString("hex");

  const { data, error } = await supabase
    .from("finance_invoices")
    .update({
      public_token: token,
      updated_at: new Date().toISOString(),
    })
    .eq("id", invoice.id)
    .select("public_token")
    .single();

  if (error) throw error;

  return data.public_token;
}

async function loadReminderSettings(supabase: any) {
  const { data } = await supabase
    .from("company_finance_settings")
    .select("*")
    .eq("settings_key", "default")
    .maybeSingle();

  return {
    reminderFeeAmount: n(data?.reminder_fee_amount, 60),
    lateInterestPercent: n(data?.late_interest_percent, 10),
    reminderPaymentDays: Math.max(1, Math.round(n(data?.reminder_payment_days, 7))),
  };
}

function calculateReminderAmounts({
  invoice,
  settings,
  includeReminderFee,
  includeLateInterest,
}: {
  invoice: any;
  settings: any;
  includeReminderFee: boolean;
  includeLateInterest: boolean;
}) {
  const baseAmount = n(invoice.unpaid_amount || invoice.total_amount, 0);
  const overdueDays = daysOverdue(invoice.due_date);

  const reminderFee = includeReminderFee ? roundMoney(n(settings.reminderFeeAmount, 60)) : 0;

  const lateInterest =
    includeLateInterest && overdueDays > 0
      ? roundMoney(baseAmount * (n(settings.lateInterestPercent, 10) / 100) * (overdueDays / 365))
      : 0;

  return {
    baseAmount: roundMoney(baseAmount),
    overdueDays,
    reminderFee,
    lateInterest,
    totalToPay: roundMoney(baseAmount + reminderFee + lateInterest),
    lateInterestPercent: n(settings.lateInterestPercent, 10),
  };
}

function reminderHtml({
  invoice,
  publicInvoiceUrl,
  reminderCount,
  amounts,
  includeReminderFee,
  includeLateInterest,
  paymentDueDate,
}: {
  invoice: any;
  publicInvoiceUrl: string;
  reminderCount: number;
  amounts: any;
  includeReminderFee: boolean;
  includeLateInterest: boolean;
  paymentDueDate: string;
}) {
  const reminderTitle =
    reminderCount <= 1
      ? "Vänlig påminnelse om faktura"
      : "Påminnelse " + reminderCount + " om faktura";

  const feeRows = `
    ${includeReminderFee ? `
      <tr>
        <td style="padding:6px 0;color:#64748b;">Påminnelseavgift</td>
        <td style="padding:6px 0;text-align:right;font-weight:700;">${escapeHtml(fmtMoney(amounts.reminderFee))}</td>
      </tr>
    ` : ""}
    ${includeLateInterest ? `
      <tr>
        <td style="padding:6px 0;color:#64748b;">Dröjsmålsränta</td>
        <td style="padding:6px 0;text-align:right;font-weight:700;">${escapeHtml(fmtMoney(amounts.lateInterest))}</td>
      </tr>
      <tr>
        <td style="padding:6px 0;color:#64748b;">Ränta / dagar</td>
        <td style="padding:6px 0;text-align:right;font-weight:700;">${escapeHtml(String(amounts.lateInterestPercent))}% · ${escapeHtml(String(amounts.overdueDays))} dagar</td>
      </tr>
    ` : ""}
  `;

  return `
  <div style="margin:0;padding:0;background:#f5f4f0;font-family:Arial,Helvetica,sans-serif;color:#102a43;">
    <div style="max-width:680px;margin:0 auto;padding:28px 18px;">
      <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:18px;overflow:hidden;">
        <div style="background:#194C66;padding:24px 26px;color:#ffffff;">
          <div style="font-size:24px;font-weight:800;letter-spacing:-0.5px;">Helsingbuss</div>
          <div style="margin-top:8px;font-size:15px;opacity:0.92;">${escapeHtml(reminderTitle)}</div>
        </div>

        <div style="padding:28px 26px;">
          <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">
            Hej ${escapeHtml(invoice.customer_name || "")},
          </p>

          <p style="margin:0 0 18px;font-size:15px;line-height:1.7;color:#334155;">
            Vi vill vänligen påminna om att faktura <strong>${escapeHtml(invoice.invoice_number || "—")}</strong>
            fortfarande står som obetald hos oss.
          </p>

          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;padding:18px;margin:20px 0;">
            <table style="width:100%;border-collapse:collapse;font-size:14px;">
              <tr>
                <td style="padding:6px 0;color:#64748b;">Fakturanummer</td>
                <td style="padding:6px 0;text-align:right;font-weight:700;">${escapeHtml(invoice.invoice_number || "—")}</td>
              </tr>
              <tr>
                <td style="padding:6px 0;color:#64748b;">OCR</td>
                <td style="padding:6px 0;text-align:right;font-weight:700;">${escapeHtml(invoice.ocr_number || invoice.invoice_number || "—")}</td>
              </tr>
              <tr>
                <td style="padding:6px 0;color:#64748b;">Förfallodatum</td>
                <td style="padding:6px 0;text-align:right;font-weight:700;">${escapeHtml(fmtDate(invoice.due_date))}</td>
              </tr>
              <tr>
                <td style="padding:6px 0;color:#64748b;">Ursprungligt obetalt belopp</td>
                <td style="padding:6px 0;text-align:right;font-weight:700;">${escapeHtml(fmtMoney(amounts.baseAmount))}</td>
              </tr>
              ${feeRows}
              <tr>
                <td style="padding:10px 0 6px;border-top:1px solid #cbd5e1;color:#194C66;font-weight:800;">Att betala</td>
                <td style="padding:10px 0 6px;border-top:1px solid #cbd5e1;text-align:right;font-weight:900;color:#194C66;">${escapeHtml(fmtMoney(amounts.totalToPay))}</td>
              </tr>
              <tr>
                <td style="padding:6px 0;color:#64748b;">Betalas senast</td>
                <td style="padding:6px 0;text-align:right;font-weight:700;">${escapeHtml(fmtDate(paymentDueDate))}</td>
              </tr>
            </table>
          </div>

          <p style="margin:0 0 22px;font-size:15px;line-height:1.7;color:#334155;">
            Om betalningen redan är genomförd kan du bortse från denna påminnelse. Annars ber vi dig att betala fakturan så snart som möjligt.
          </p>

          <div style="text-align:center;margin:28px 0;">
            <a href="${escapeHtml(publicInvoiceUrl)}"
               style="display:inline-block;background:#00645d;color:#ffffff;text-decoration:none;padding:14px 24px;border-radius:12px;font-weight:800;font-size:15px;">
              Öppna fakturan
            </a>
          </div>

          <p style="margin:24px 0 0;font-size:14px;line-height:1.7;color:#64748b;">
            Har du frågor om fakturan är du varmt välkommen att kontakta oss.
          </p>

          <p style="margin:20px 0 0;font-size:14px;line-height:1.7;color:#334155;">
            Med vänliga hälsningar,<br />
            <strong>Helsingbuss</strong><br />
            info@helsingbuss.se
          </p>
        </div>
      </div>

      <div style="padding:16px 8px;text-align:center;font-size:12px;color:#64748b;">
        Helsingbuss · Helsingborg
      </div>
    </div>
  </div>`;
}

async function sendWithResend({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  if (!resendApiKey) {
    throw new Error("RESEND_API_KEY saknas i .env.");
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
    }),
  });

  const json = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(json?.message || json?.error || "Kunde inte skicka påminnelsemejlet.");
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

  try {
    const supabase = getSupabase();

    const { data: invoice, error: invoiceError } = await supabase
      .from("finance_invoices")
      .select("*")
      .eq("id", id)
      .single();

    if (invoiceError) throw invoiceError;

    if (invoice.status === "paid") {
      return res.status(400).json({
        ok: false,
        error: "Fakturan är redan markerad som betald.",
      });
    }

    const toEmail =
      cleanText(req.body?.to_email) ||
      cleanText(req.body?.toEmail) ||
      cleanText(invoice.customer_email);

    if (!toEmail) {
      return res.status(400).json({
        ok: false,
        error: "Kundens e-post saknas.",
      });
    }

    const settings = await loadReminderSettings(supabase);

    const includeReminderFee = toBool(req.body?.include_reminder_fee);
    const includeLateInterest = toBool(req.body?.include_late_interest);

    const amounts = calculateReminderAmounts({
      invoice,
      settings,
      includeReminderFee,
      includeLateInterest,
    });

    const publicToken = await ensurePublicToken(supabase, invoice);
    const publicInvoiceUrl =
      baseUrlFromRequest(req) + "/faktura/" + encodeURIComponent(publicToken);

    const reminderCount = Number(invoice.reminder_count || 0) + 1;
    const now = new Date();

    const paymentDueDate =
      cleanText(req.body?.payment_due_date) ||
      addDays(now, settings.reminderPaymentDays || 7);

    const nextReminderDate =
      cleanText(req.body?.next_reminder_date) ||
      addDays(now, reminderCount >= 2 ? 5 : 7);

    const subject =
      "Påminnelse faktura " +
      String(invoice.invoice_number || "") +
      " från Helsingbuss";

    const html = reminderHtml({
      invoice,
      publicInvoiceUrl,
      reminderCount,
      amounts,
      includeReminderFee,
      includeLateInterest,
      paymentDueDate,
    });

    const sendResult = await sendWithResend({
      to: toEmail,
      subject,
      html,
    });

    const { data: updatedInvoice, error: updateError } = await supabase
      .from("finance_invoices")
      .update({
        reminder_count: reminderCount,
        last_reminder_sent_at: now.toISOString(),
        next_reminder_date: nextReminderDate,
        last_reminder_fee_amount: amounts.reminderFee,
        last_late_interest_amount: amounts.lateInterest,
        last_reminder_total_amount: amounts.totalToPay,
        last_reminder_included_fee: includeReminderFee,
        last_reminder_included_interest: includeLateInterest,
        updated_at: now.toISOString(),
      })
      .eq("id", id)
      .select("*")
      .single();

    if (updateError) throw updateError;

    return res.status(200).json({
      ok: true,
      invoice: updatedInvoice,
      sent_to_email: toEmail,
      public_invoice_url: publicInvoiceUrl,
      reminder: {
        includeReminderFee,
        includeLateInterest,
        paymentDueDate,
        ...amounts,
      },
      resend: sendResult,
    });
  } catch (error: any) {
    console.error("/api/admin/ekonomi/fakturor/[id]/send-reminder-email error", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte skicka påminnelsemejlet.",
    });
  }
}
