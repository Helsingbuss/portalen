import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

const PDFDocument = require("pdfkit");

type ApiResponse =
  | {
      ok: true;
      emailId: string;
      invoiceId: string;
      sentTo: string;
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

function money(value: number) {
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: "SEK",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function safeText(value: any) {
  return String(value || "").trim();
}

function invoiceStatusLabel(status: string) {
  const clean = String(status || "").toLowerCase();

  if (clean === "draft") return "Utkast";
  if (clean === "sent") return "Skickad";
  if (clean === "paid") return "Betald";
  if (clean === "overdue") return "Förfallen";

  return status || "Utkast";
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

  // Om rolltabellen skiljer sig i din portal hoppar vi inte sönder utskicket.
  // Token-verifieringen ovan gäller fortfarande.
  if (error) {
    console.log("Invoice send role check skipped:", error.message);
    return;
  }

  if (!data || data.length === 0) {
    throw new Error("Du saknar behörighet att skicka fakturor.");
  }
}

function buildInvoicePdfBuffer(invoice: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "A4",
        margin: 50,
        info: {
          Title: `Faktura ${invoice.invoice_number || ""}`,
          Author: "Helsingbuss",
          Subject: "Faktura",
        },
      });

      const chunks: Buffer[] = [];

      doc.on("data", (chunk: Buffer) => chunks.push(Buffer.from(chunk)));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      const amount = Number(invoice.amount || 0);
      const vatRate = Number(invoice.vat_rate || 6);
      const vatAmount = amount * vatRate / (100 + vatRate);
      const exVat = amount - vatAmount;

      const invoiceNumber = safeText(invoice.invoice_number) || "UTKAST";
      const today = new Date().toLocaleDateString("sv-SE");
      const dueDate = invoice.due_date
        ? new Date(invoice.due_date).toLocaleDateString("sv-SE")
        : "Ej angivet";

      // Header
      doc
        .fontSize(28)
        .fillColor("#003C3A")
        .font("Helvetica-Bold")
        .text("Helsingbuss", 50, 48);

      doc
        .fontSize(10)
        .fillColor("#52616D")
        .font("Helvetica")
        .text("Professionella bussresor, beställningstrafik och reseupplevelser.", 50, 82)
        .text("Helsingborg, Sverige", 50, 97);

      doc
        .fontSize(26)
        .fillColor("#003C3A")
        .font("Helvetica-Bold")
        .text("Faktura", 380, 50, { align: "right" });

      doc
        .fontSize(11)
        .fillColor("#52616D")
        .font("Helvetica-Bold")
        .text(`Nr: ${invoiceNumber}`, 380, 84, { align: "right" });

      doc
        .moveTo(50, 128)
        .lineTo(545, 128)
        .lineWidth(3)
        .strokeColor("#003C3A")
        .stroke();

      // Customer box
      doc
        .roundedRect(50, 155, 235, 112, 12)
        .fillAndStroke("#F6F8F7", "#E2E8E6");

      doc
        .fillColor("#003C3A")
        .font("Helvetica-Bold")
        .fontSize(10)
        .text("FAKTURERAS TILL", 68, 174);

      doc
        .fillColor("#1D2937")
        .fontSize(12)
        .text(safeText(invoice.customer_name) || "Kund saknas", 68, 198);

      doc
        .fillColor("#52616D")
        .font("Helvetica")
        .fontSize(10)
        .text(safeText(invoice.customer_email), 68, 218)
        .text(safeText(invoice.customer_phone), 68, 234);

      // Details box
      doc
        .roundedRect(310, 155, 235, 112, 12)
        .fillAndStroke("#F6F8F7", "#E2E8E6");

      doc
        .fillColor("#003C3A")
        .font("Helvetica-Bold")
        .fontSize(10)
        .text("FAKTURADETALJER", 328, 174);

      doc
        .fillColor("#1D2937")
        .font("Helvetica")
        .fontSize(10)
        .text(`Fakturadatum: ${today}`, 328, 198)
        .text(`Förfallodatum: ${dueDate}`, 328, 216)
        .text(`Status: ${invoiceStatusLabel(invoice.status)}`, 328, 234);

      // Table header
      doc
        .roundedRect(50, 305, 495, 32, 8)
        .fill("#003C3A");

      doc
        .fillColor("#FFFFFF")
        .font("Helvetica-Bold")
        .fontSize(10)
        .text("BESKRIVNING", 65, 316)
        .text("MOMS", 370, 316, { width: 60, align: "right" })
        .text("BELOPP", 455, 316, { width: 75, align: "right" });

      // Table row
      doc
        .fillColor("#1D2937")
        .font("Helvetica-Bold")
        .fontSize(12)
        .text(safeText(invoice.title) || "Faktura", 65, 360, { width: 270 });

      if (invoice.notes) {
        doc
          .fillColor("#52616D")
          .font("Helvetica")
          .fontSize(9)
          .text(safeText(invoice.notes), 65, 380, { width: 270 });
      }

      doc
        .fillColor("#1D2937")
        .font("Helvetica")
        .fontSize(11)
        .text(`${vatRate}%`, 370, 360, { width: 60, align: "right" })
        .text(money(amount), 455, 360, { width: 75, align: "right" });

      doc
        .moveTo(50, 420)
        .lineTo(545, 420)
        .lineWidth(1)
        .strokeColor("#E2E8E6")
        .stroke();

      // Summary
      doc
        .roundedRect(330, 455, 215, 118, 12)
        .fillAndStroke("#F6F8F7", "#E2E8E6");

      doc
        .fillColor("#1D2937")
        .font("Helvetica")
        .fontSize(11)
        .text("Exkl. moms", 350, 475)
        .text(money(exVat), 430, 475, { width: 95, align: "right" })
        .text(`Moms ${vatRate}%`, 350, 500)
        .text(money(vatAmount), 430, 500, { width: 95, align: "right" });

      doc
        .moveTo(350, 528)
        .lineTo(525, 528)
        .lineWidth(1.5)
        .strokeColor("#003C3A")
        .stroke();

      doc
        .fillColor("#003C3A")
        .font("Helvetica-Bold")
        .fontSize(14)
        .text("Att betala", 350, 542)
        .text(money(amount), 430, 542, { width: 95, align: "right" });

      // Payment info
      doc
        .roundedRect(50, 615, 495, 72, 12)
        .fillAndStroke("#F9F5E8", "#EFE4BE");

      doc
        .fillColor("#1D2937")
        .font("Helvetica-Bold")
        .fontSize(11)
        .text("Betalningsinformation", 68, 633);

            const paymentLines = getPaymentInfo(invoiceNumber);

      doc
        .font("Helvetica")
        .fontSize(10)
        .text(paymentLines.join("\n"), 68, 653, { width: 455 });

      // Footer
      doc
        .moveTo(50, 745)
        .lineTo(545, 745)
        .lineWidth(1)
        .strokeColor("#E2E8E6")
        .stroke();

      doc
        .fillColor("#667985")
        .font("Helvetica")
        .fontSize(9)
        .text("Helsingbuss · Faktura skapad via Helsingbuss Admin", 50, 760)
        .text("Vid frågor, kontakta Helsingbuss kundteam.", 50, 774);

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

function buildEmailHtml(invoice: any) {
  const amount = Number(invoice.amount || 0);
  const invoiceNumber = safeText(invoice.invoice_number) || "UTKAST";

  return `
    <div style="font-family: Arial, sans-serif; color: #1D2937; line-height: 1.5;">
      <h2 style="color:#003C3A;">Faktura från Helsingbuss</h2>

      <p>Hej ${safeText(invoice.customer_name) || ""}!</p>

      <p>Här kommer faktura/fakturaunderlag från Helsingbuss.</p>

      <div style="background:#F6F8F7;border:1px solid #E2E8E6;border-radius:12px;padding:16px;margin:18px 0;">
        <p><strong>Fakturanummer:</strong> ${invoiceNumber}</p>
        <p><strong>Belopp:</strong> ${money(amount)}</p>
        <p><strong>Förfallodatum:</strong> ${invoice.due_date || "Ej angivet"}</p>
      </div>

            <p><strong>Betalningsinformation:</strong><br />
      ${getPaymentInfo(invoiceNumber).map((line) => safeText(line)).join("<br />")}
      </p>

      <p>Fakturan finns bifogad som PDF.</p>

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

  let invoiceId = "";

  try {
    const user = await verifyUser(req);
    const adminClient = createAdminClient();

    await optionalAdminRoleCheck(adminClient, user.id);

    invoiceId = safeText(req.body?.invoiceId);

    if (!invoiceId) {
      return res.status(400).json({
        ok: false,
        error: "invoiceId saknas.",
      });
    }

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

    const pdfBuffer = await buildInvoicePdfBuffer(invoice);
    const pdfBase64 = pdfBuffer.toString("base64");

    const invoiceNumber = safeText(invoice.invoice_number) || "UTKAST";
    const subject = `Faktura från Helsingbuss ${invoiceNumber}`;

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
        subject,
        html: buildEmailHtml(invoice),
        attachments: [
          {
            filename: `helsingbuss-faktura-${invoiceNumber}.pdf`,
            content: pdfBase64,
          },
        ],
      }),
    });

    const resendJson = await resendResponse.json();

    if (!resendResponse.ok) {
      await adminClient
        .from("app_invoices")
        .update({
          last_send_error: JSON.stringify(resendJson),
          updated_at: new Date().toISOString(),
        })
        .eq("id", invoiceId);

      return res.status(500).json({
        ok: false,
        error: "Resend kunde inte skicka fakturan.",
        details: resendJson,
      });
    }

    const emailId = String(resendJson?.id || "");

    await adminClient
      .from("app_invoices")
      .update({
        status: "sent",
        sent_at: new Date().toISOString(),
        sent_by: user.id,
        last_email_id: emailId,
        last_sent_to: sentTo,
        last_send_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", invoiceId);

    return res.status(200).json({
      ok: true,
      emailId,
      invoiceId,
      sentTo,
    });
  } catch (error: any) {
    console.error("Send invoice error:", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte skicka fakturan.",
    });
  }
}

