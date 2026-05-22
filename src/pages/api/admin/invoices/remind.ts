import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

type ApiResponse =
  | {
      ok: true;
      emailId: string;
      invoiceId: string;
      sentTo: string;
      reminderCount: number;
    }
  | {
      ok: false;
      error: string;
      details?: any;
    };

function getRequiredEnv(name: string, fallback?: string) {
  const value = process.env[name] || fallback;

  if (!value) {
    throw new Error(`Missing env: ${name}`);
  }

  return value;
}

function safeText(value: any) {
  return String(value || "").trim();
}

function money(value: number) {
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: "SEK",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

async function verifyUser(req: NextApiRequest) {
  const supabaseUrl = getRequiredEnv(
    "SUPABASE_URL",
    process.env.NEXT_PUBLIC_SUPABASE_URL
  );

  const anonKey = getRequiredEnv(
    "SUPABASE_ANON_KEY",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_KEY
  );

  const authHeader = req.headers.authorization || "";
  const token = authHeader.replace("Bearer ", "").trim();

  if (!token) {
    throw new Error("Saknar inloggningstoken.");
  }

  const authClient = createClient(supabaseUrl, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { data, error } = await authClient.auth.getUser(token);

  if (error || !data.user) {
    throw new Error("Kunde inte verifiera användaren.");
  }

  return data.user;
}

function createAdminClient() {
  const supabaseUrl = getRequiredEnv(
    "SUPABASE_URL",
    process.env.NEXT_PUBLIC_SUPABASE_URL
  );

  const serviceKey = getRequiredEnv(
    "SUPABASE_SERVICE_ROLE_KEY",
    process.env.SUPABASE_SERVICE_KEY
  );

  return createClient(supabaseUrl, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

async function optionalAdminRoleCheck(adminClient: any, userId: string) {
  const { data, error } = await adminClient
    .from("app_user_roles")
    .select("role_key")
    .eq("user_id", userId)
    .in("role_key", ["admin", "owner", "super_admin"]);

  if (error) {
    console.log("Invoice reminder role check skipped:", error.message);
    return;
  }

  if (!data || data.length === 0) {
    throw new Error("Du saknar behörighet att skicka fakturapåminnelser.");
  }
}

function getPaymentInfo(invoiceNumber: string) {
  const bankgiro = safeText(process.env.INVOICE_BANKGIRO);
  const swish = safeText(process.env.INVOICE_SWISH);
  const bankAccount = safeText(process.env.INVOICE_BANK_ACCOUNT);
  const paymentText =
    safeText(process.env.INVOICE_PAYMENT_TEXT) ||
    "Ange fakturanummer som betalningsreferens.";

  const lines: string[] = [];

  if (bankgiro) lines.push(`Bankgiro: ${bankgiro}`);
  if (swish) lines.push(`Swish: ${swish}`);
  if (bankAccount) lines.push(`Bankkonto: ${bankAccount}`);

  lines.push(`Referens: ${invoiceNumber}`);
  lines.push(paymentText);

  return lines;
}

function buildReminderHtml(invoice: any) {
  const invoiceNumber = safeText(invoice.invoice_number) || "UTKAST";
  const amount = Number(invoice.amount || 0);
  const dueDate = invoice.due_date || "Ej angivet";
  const paymentLines = getPaymentInfo(invoiceNumber);

  return `
    <div style="font-family: Arial, sans-serif; color: #1D2937; line-height: 1.5;">
      <h2 style="color:#003C3A;">Påminnelse om faktura från Helsingbuss</h2>

      <p>Hej ${safeText(invoice.customer_name) || ""}!</p>

      <p>Vi vill vänligen påminna om fakturan nedan.</p>

      <div style="background:#F6F8F7;border:1px solid #E2E8E6;border-radius:12px;padding:16px;margin:18px 0;">
        <p><strong>Fakturanummer:</strong> ${invoiceNumber}</p>
        <p><strong>Belopp:</strong> ${money(amount)}</p>
        <p><strong>Förfallodatum:</strong> ${dueDate}</p>
        <p><strong>Status:</strong> ${safeText(invoice.status) || "Skickad"}</p>
      </div>

      <p><strong>Betalningsinformation:</strong><br />
      ${paymentLines.map((line) => safeText(line)).join("<br />")}
      </p>

      <p>Har betalning redan gjorts kan du bortse från denna påminnelse.</p>

      <p>Vänliga hälsningar,<br />Helsingbuss</p>
    </div>
  `;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      error: "Method not allowed",
    });
  }

  try {
    const user = await verifyUser(req);
    const adminClient = createAdminClient();

    await optionalAdminRoleCheck(adminClient, user.id);

    const invoiceId = safeText(req.body?.invoiceId);

    if (!invoiceId) {
      return res.status(400).json({
        ok: false,
        error: "invoiceId saknas.",
      });
    }

    await adminClient.rpc("refresh_app_invoice_overdue_status");

    const { data: invoice, error: invoiceError } = await adminClient
      .from("app_invoices")
      .select("*")
      .eq("id", invoiceId)
      .single();

    if (invoiceError || !invoice) {
      return res.status(404).json({
        ok: false,
        error: "Fakturan hittades inte.",
        details: invoiceError,
      });
    }

    if (!invoice.customer_email) {
      return res.status(400).json({
        ok: false,
        error: "Fakturan saknar kundens e-postadress.",
      });
    }

    if (invoice.status === "paid") {
      return res.status(400).json({
        ok: false,
        error: "Fakturan är redan markerad som betald.",
      });
    }

    if (invoice.status === "cancelled") {
      return res.status(400).json({
        ok: false,
        error: "Fakturan är makulerad.",
      });
    }

    const resendKey = getRequiredEnv("RESEND_API_KEY");

    const from =
      process.env.INVOICE_MAIL_FROM ||
      process.env.MAIL_FROM ||
      process.env.EMAIL_FROM ||
      "Helsingbuss <info@helsingbuss.se>";

    const replyTo =
      process.env.INVOICE_REPLY_TO ||
      process.env.EMAIL_REPLY_TO ||
      process.env.MAIL_REPLY_TO ||
      "info@helsingbuss.se";

    const forceTo = safeText(process.env.MAIL_FORCE_TO);
    const sentTo = forceTo || invoice.customer_email;

    const invoiceNumber = safeText(invoice.invoice_number) || "UTKAST";

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [sentTo],
        reply_to: replyTo,
        subject: `Påminnelse: Faktura ${invoiceNumber} från Helsingbuss`,
        html: buildReminderHtml(invoice),
      }),
    });

    const resendJson = await resendResponse.json();

    if (!resendResponse.ok) {
      await adminClient
        .from("app_invoices")
        .update({
          last_reminder_error: JSON.stringify(resendJson),
          updated_at: new Date().toISOString(),
        })
        .eq("id", invoiceId);

      return res.status(500).json({
        ok: false,
        error: "Resend kunde inte skicka påminnelsen.",
        details: resendJson,
      });
    }

    const emailId = String(resendJson?.id || "");
    const newReminderCount = Number(invoice.reminder_count || 0) + 1;

    await adminClient
      .from("app_invoices")
      .update({
        reminder_count: newReminderCount,
        last_reminder_at: new Date().toISOString(),
        last_reminder_to: sentTo,
        last_reminder_email_id: emailId,
        last_reminder_error: null,
        status: invoice.status === "draft" ? "sent" : invoice.status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", invoiceId);

    return res.status(200).json({
      ok: true,
      emailId,
      invoiceId,
      sentTo,
      reminderCount: newReminderCount,
    });
  } catch (error: any) {
    console.error("Send invoice reminder error:", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte skicka fakturapåminnelsen.",
    });
  }
}
