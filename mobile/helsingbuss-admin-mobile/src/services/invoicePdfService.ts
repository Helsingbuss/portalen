import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as MailComposer from "expo-mail-composer";

import { INVOICE_LOGO_DATA_URI } from "../assets/invoiceLogo";

export type InvoicePdfInput = {
  invoiceNumber?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  title: string;
  amount: number;
  vatRate?: number;
  dueDate?: string;
  notes?: string;
  status?: string;
};

function toMoney(value: number) {
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: "SEK",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function escapeHtml(value?: string) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function cleanFileName(value: string) {
  return value
    .toLowerCase()
    .replace(/å/g, "a")
    .replace(/ä/g, "a")
    .replace(/ö/g, "o")
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function logoHtml() {
  if (INVOICE_LOGO_DATA_URI) {
    return `<img class="logo-img" src="${INVOICE_LOGO_DATA_URI}" />`;
  }

  return `<div class="brand-name">Helsingbuss</div>`;
}

function getPaymentInfo(invoiceNumber: string) {
  const bankgiro = String(process.env.EXPO_PUBLIC_INVOICE_BANKGIRO || "").trim();
  const swish = String(process.env.EXPO_PUBLIC_INVOICE_SWISH || "").trim();
  const bankAccount = String(process.env.EXPO_PUBLIC_INVOICE_BANK_ACCOUNT || "").trim();
  const paymentText =
    String(process.env.EXPO_PUBLIC_INVOICE_PAYMENT_TEXT || "").trim() ||
    "Ange fakturanummer som betalningsreferens.";

  const lines: string[] = [];

  if (bankgiro) lines.push(`Bankgiro: ${bankgiro}`);
  if (swish) lines.push(`Swish: ${swish}`);
  if (bankAccount) lines.push(`Bankkonto: ${bankAccount}`);

  lines.push(`Referens: ${invoiceNumber}`);
  lines.push(paymentText);

  return lines;
}

export function createInvoiceHtml(input: InvoicePdfInput) {
  const vatRate = Number(input.vatRate || 6);
  const amount = Number(input.amount || 0);
  const vatAmount = amount * vatRate / (100 + vatRate);
  const exVat = amount - vatAmount;

  const invoiceNumber = input.invoiceNumber?.trim() || "UTKAST";
  const today = new Date().toLocaleDateString("sv-SE");
  const dueDate = input.dueDate?.trim() || "Ej angivet";

  return `
<!doctype html>
<html lang="sv">
<head>
  <meta charset="utf-8" />
  <style>
    * { box-sizing: border-box; }

    body {
      margin: 0;
      padding: 0;
      font-family: Arial, Helvetica, sans-serif;
      color: #1D2937;
      background: #ffffff;
    }

    .page {
      padding: 42px;
    }

    .top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 4px solid #003C3A;
      padding-bottom: 24px;
      margin-bottom: 32px;
    }

    .brand {
      max-width: 55%;
    }

    .logo-img {
      width: 210px;
      max-height: 72px;
      object-fit: contain;
      object-position: left center;
      margin-bottom: 10px;
    }

    .brand-name {
      font-size: 32px;
      font-weight: 900;
      color: #003C3A;
      letter-spacing: -0.7px;
      margin-bottom: 8px;
    }

    .brand-sub {
      font-size: 13px;
      color: #52616D;
      line-height: 1.5;
    }

    .invoice-box {
      text-align: right;
    }

    .invoice-title {
      font-size: 30px;
      font-weight: 900;
      color: #003C3A;
      margin-bottom: 8px;
    }

    .invoice-number {
      font-size: 14px;
      color: #52616D;
      font-weight: 700;
    }

    .section-row {
      display: flex;
      gap: 18px;
      margin-bottom: 26px;
    }

    .card {
      flex: 1;
      background: #F6F8F7;
      border: 1px solid #E2E8E6;
      border-radius: 16px;
      padding: 18px;
    }

    .card-title {
      font-size: 12px;
      font-weight: 900;
      color: #003C3A;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      margin-bottom: 10px;
    }

    .line {
      font-size: 13px;
      color: #1D2937;
      margin-bottom: 6px;
      line-height: 1.45;
    }

    .muted { color: #667985; }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
      margin-bottom: 24px;
    }

    th {
      text-align: left;
      background: #003C3A;
      color: #ffffff;
      padding: 13px 12px;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    td {
      padding: 14px 12px;
      border-bottom: 1px solid #E2E8E6;
      font-size: 13px;
      vertical-align: top;
    }

    .right { text-align: right; }

    .summary {
      width: 42%;
      margin-left: auto;
      background: #F6F8F7;
      border: 1px solid #E2E8E6;
      border-radius: 16px;
      padding: 18px;
    }

    .summary-row {
      display: flex;
      justify-content: space-between;
      font-size: 13px;
      margin-bottom: 10px;
      color: #1D2937;
    }

    .summary-total {
      display: flex;
      justify-content: space-between;
      border-top: 2px solid #003C3A;
      padding-top: 12px;
      margin-top: 12px;
      font-size: 18px;
      font-weight: 900;
      color: #003C3A;
    }

    .payment-box {
      margin-top: 28px;
      padding: 18px;
      border-radius: 16px;
      background: #F9F5E8;
      color: #1D2937;
      font-size: 13px;
      line-height: 1.5;
    }

    .footer {
      margin-top: 42px;
      padding-top: 18px;
      border-top: 1px solid #E2E8E6;
      color: #667985;
      font-size: 11px;
      line-height: 1.5;
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="top">
      <div class="brand">
        ${logoHtml()}
        <div class="brand-sub">
          Professionella bussresor, beställningstrafik och reseupplevelser.<br />
          Helsingborg, Sverige
        </div>
      </div>

      <div class="invoice-box">
        <div class="invoice-title">Faktura</div>
        <div class="invoice-number">Nr: ${escapeHtml(invoiceNumber)}</div>
      </div>
    </div>

    <div class="section-row">
      <div class="card">
        <div class="card-title">Faktureras till</div>
        <div class="line"><strong>${escapeHtml(input.customerName || "Kund saknas")}</strong></div>
        <div class="line muted">${escapeHtml(input.customerEmail || "")}</div>
        <div class="line muted">${escapeHtml(input.customerPhone || "")}</div>
      </div>

      <div class="card">
        <div class="card-title">Fakturadetaljer</div>
        <div class="line"><strong>Fakturadatum:</strong> ${today}</div>
        <div class="line"><strong>Förfallodatum:</strong> ${escapeHtml(dueDate)}</div>
        <div class="line"><strong>Status:</strong> ${escapeHtml(input.status || "Utkast")}</div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Beskrivning</th>
          <th class="right">Moms</th>
          <th class="right">Belopp</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            <strong>${escapeHtml(input.title || "Faktura")}</strong>
            ${input.notes ? `<br /><span class="muted">${escapeHtml(input.notes)}</span>` : ""}
          </td>
          <td class="right">${vatRate}%</td>
          <td class="right">${toMoney(amount)}</td>
        </tr>
      </tbody>
    </table>

    <div class="summary">
      <div class="summary-row">
        <span>Exkl. moms</span>
        <strong>${toMoney(exVat)}</strong>
      </div>

      <div class="summary-row">
        <span>Moms ${vatRate}%</span>
        <strong>${toMoney(vatAmount)}</strong>
      </div>

      <div class="summary-total">
        <span>Att betala</span>
        <span>${toMoney(amount)}</span>
      </div>
    </div>

    <div class="payment-box">
      <strong>Betalningsinformation:</strong><br />
      ${getPaymentInfo(invoiceNumber).map((line) => escapeHtml(line)).join("<br />")}
    </div>

    <div class="footer">
      Helsingbuss · Fakturaunderlag · Skapad via Helsingbuss Admin<br />
      Vid frågor, kontakta Helsingbuss kundteam.
    </div>
  </div>
</body>
</html>
`;
}

export async function createInvoicePdfFile(input: InvoicePdfInput) {
  const html = createInvoiceHtml(input);

  const result = await Print.printToFileAsync({
    html,
    base64: false,
  });

  return result.uri;
}

export async function shareInvoicePdf(input: InvoicePdfInput) {
  const canShare = await Sharing.isAvailableAsync();

  if (!canShare) {
    throw new Error("Delning av filer stöds inte på denna enhet.");
  }

  const uri = await createInvoicePdfFile(input);
  const invoiceNumber = input.invoiceNumber?.trim() || "utkast";
  const fileName = cleanFileName(`helsingbuss-faktura-${invoiceNumber}`) || "helsingbuss-faktura";

  await Sharing.shareAsync(uri, {
    mimeType: "application/pdf",
    dialogTitle: "Dela faktura",
    UTI: "com.adobe.pdf",
  });

  return {
    uri,
    fileName: `${fileName}.pdf`,
  };
}

export async function emailInvoicePdf(input: InvoicePdfInput) {
  if (!input.customerEmail?.trim()) {
    throw new Error("Kunden saknar e-postadress.");
  }

  const canSendMail = await MailComposer.isAvailableAsync();

  if (!canSendMail) {
    throw new Error("E-postfunktionen är inte tillgänglig på denna enhet.");
  }

  const uri = await createInvoicePdfFile(input);
  const invoiceNumber = input.invoiceNumber?.trim() || "utkast";

  await MailComposer.composeAsync({
    recipients: [input.customerEmail.trim()],
    subject: `Faktura från Helsingbuss ${invoiceNumber}`,
    body:
      `Hej ${input.customerName || ""}!\n\n` +
      `Här kommer faktura/fakturaunderlag från Helsingbuss.\n\n` +
      `Fakturanummer: ${invoiceNumber}\n` +
      `Belopp: ${toMoney(Number(input.amount || 0))}\n` +
      `Förfallodatum: ${input.dueDate || "Ej angivet"}\n` +
      `Betalning:\n${getPaymentInfo(invoiceNumber).join("\n")}\n\n` +
      `Vänliga hälsningar,\nHelsingbuss`,
    attachments: [uri],
  });

  return uri;
}

