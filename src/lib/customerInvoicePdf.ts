import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

type Invoice = Record<string, any>;
type InvoiceLine = Record<string, any>;

function clean(value: any) {
  return String(value ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/[→←–—]/g, "-")
    .replace(/€/g, "EUR")
    .trim();
}

function money(value: any) {
  return new Intl.NumberFormat("sv-SE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function fmtDate(value?: string | null) {
  if (!value) return "-";

  try {
    return new Intl.DateTimeFormat("sv-SE", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(value));
  } catch {
    return clean(value);
  }
}

function splitText(text: string, maxLength: number) {
  const words = clean(text).split(/\s+/);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    if ((current + " " + word).trim().length > maxLength) {
      if (current) lines.push(current);
      current = word;
    } else {
      current = (current + " " + word).trim();
    }
  }

  if (current) lines.push(current);

  return lines;
}

export async function generateCustomerInvoicePdf({
  invoice,
  lines,
  settings,
  paymentText,
}: {
  invoice: Invoice;
  lines: InvoiceLine[];
  settings?: any;
  paymentText?: string;
}) {
  const pdfDoc = await PDFDocument.create();

  const page = pdfDoc.addPage([595.28, 841.89]); // A4
  const { width, height } = page.getSize();

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const dark = rgb(0.10, 0.30, 0.40);
  const text = rgb(0.10, 0.12, 0.16);
  const muted = rgb(0.38, 0.42, 0.48);
  const lineColor = rgb(0.82, 0.85, 0.88);

  let y = height - 46;

  function drawText(value: any, x: number, yy: number, size = 10, isBold = false, color = text) {
    page.drawText(clean(value), {
      x,
      y: yy,
      size,
      font: isBold ? bold : font,
      color,
    });
  }

  function drawRight(value: any, xRight: number, yy: number, size = 10, isBold = false, color = text) {
    const safe = clean(value);
    const usedFont = isBold ? bold : font;
    const w = usedFont.widthOfTextAtSize(safe, size);

    page.drawText(safe, {
      x: xRight - w,
      y: yy,
      size,
      font: usedFont,
      color,
    });
  }

  function drawLine(yy: number) {
    page.drawLine({
      start: { x: 42, y: yy },
      end: { x: width - 42, y: yy },
      thickness: 0.7,
      color: lineColor,
    });
  }

  // Header
  drawText(settings?.company_name || "Helsingbuss", 42, y, 25, true, dark);

  drawRight("Sida 1 av 1", width - 42, y + 8, 8, false, muted);
  drawRight("Faktura", width - 42, y - 22, 26, true, dark);
  drawRight("Fakturanummer " + clean(invoice.invoice_number || "-"), width - 42, y - 45, 10, true, text);

  y -= 88;

  // Customer + invoice meta
  drawText("Fakturamottagare", width - 232, y, 10, true, dark);
  drawText(invoice.customer_name || "-", width - 232, y - 17, 10, true, text);

  let customerY = y - 32;
  const customerLines = [
    invoice.customer_address,
    [invoice.customer_zip, invoice.customer_city].filter(Boolean).join(" "),
    invoice.customer_country,
  ].filter(Boolean);

  for (const row of customerLines) {
    drawText(row, width - 232, customerY, 9, false, text);
    customerY -= 13;
  }

  const metaRows = [
    ["Kundnr", invoice.customer_number || "-"],
    ["Fakturadatum", fmtDate(invoice.invoice_date)],
    ["Leveransdatum", fmtDate(invoice.invoice_date)],
    ["Förfallodatum", fmtDate(invoice.due_date)],
    ["Fakturasumma", money(invoice.total_amount) + " kr"],
    ["OCR", invoice.ocr_number || invoice.invoice_number || "-"],
    ["Er referens", invoice.your_reference || "-"],
    ["Vår referens", invoice.our_reference || "-"],
    ["Orderreferens", invoice.order_reference || "-"],
  ];

  let metaY = y;

  for (const [label, value] of metaRows) {
    drawText(label, 42, metaY, 9, true, text);
    drawText(value, 145, metaY, 9, false, text);
    metaY -= 14;
  }

  y -= 148;
  drawLine(y);
  y -= 20;

  // Table header
  drawText("Beskrivning", 42, y, 9, true, text);
  drawRight("Antal", 350, y, 9, true, text);
  drawText("Enhet", 368, y, 9, true, text);
  drawRight("A-pris", 465, y, 9, true, text);
  drawRight("Summa", width - 42, y, 9, true, text);

  y -= 9;
  drawLine(y);
  y -= 17;

  for (const line of lines || []) {
    if (y < 230) break;

    drawText(line.description || "-", 42, y, 9, true, text);
    drawRight(money(line.quantity || 0), 350, y, 9, false, text);
    drawText(line.unit || "st", 368, y, 9, false, text);
    drawRight(money(line.unit_price_excl_vat || 0), 465, y, 9, false, text);
    drawRight(money(line.line_total_incl_vat || 0), width - 42, y, 9, true, text);

    y -= 14;

    if (line.extra_description) {
      const extraLines = clean(line.extra_description).split("\n").flatMap((row) => splitText(row, 80));

      for (const extra of extraLines.slice(0, 6)) {
        if (y < 230) break;
        drawText(extra, 42, y, 8, false, muted);
        y -= 11;
      }
    }

    y -= 7;
  }

  y -= 6;
  drawLine(y);

  // Bottom boxes
  const bottomY = 205;

  if (invoice.notes) {
    drawText("Meddelande", 42, bottomY + 50, 9, true, dark);

    const noteLines = splitText(invoice.notes, 75).slice(0, 4);
    let noteY = bottomY + 35;

    for (const note of noteLines) {
      drawText(note, 42, noteY, 8, false, muted);
      noteY -= 11;
    }
  }

  // Summary
  let sumY = bottomY + 75;
  const labelX = width - 235;
  const valueX = width - 42;

  drawText("Sammanställning", labelX, sumY + 22, 10, true, dark);

  drawText("Exkl. moms", labelX, sumY, 9, false, text);
  drawRight(money(invoice.subtotal_excl_vat), valueX, sumY, 9, false, text);
  sumY -= 15;

  drawText("Moms", labelX, sumY, 9, false, text);
  drawRight(money(invoice.vat_amount), valueX, sumY, 9, false, text);
  sumY -= 15;

  drawText("Avrundning", labelX, sumY, 9, false, text);
  drawRight(money(invoice.rounding_amount), valueX, sumY, 9, false, text);
  sumY -= 10;

  page.drawLine({
    start: { x: labelX, y: sumY },
    end: { x: valueX, y: sumY },
    thickness: 0.8,
    color: dark,
  });

  sumY -= 18;

  drawText("Att betala", labelX, sumY, 12, true, dark);
  drawRight(money(invoice.total_amount) + " kr", valueX, sumY, 12, true, dark);

  // Payment info
  const payY = 112;
  drawLine(payY + 62);
  drawText("Betalningsinformation", 42, payY + 43, 9, true, dark);

  const paymentLines = splitText(paymentText || invoice.payment_text || "Betalningsuppgifter saknas.", 95).slice(0, 5);
  let py = payY + 28;

  for (const row of paymentLines) {
    drawText(row, 42, py, 8, false, text);
    py -= 11;
  }

  // Footer
  drawLine(72);

  drawText(settings?.company_name || "Helsingbuss", 42, 52, 8, true, dark);
  drawText("Hofverbergsgatan 25, 254 43 Helsingborg", 42, 40, 7, false, muted);

  drawText("E-post / webb", 210, 52, 8, true, dark);
  drawText("info@helsingbuss.se / helsingbuss.se", 210, 40, 7, false, muted);

  drawText("Organisationsnr", 390, 52, 8, true, dark);
  drawText(settings?.org_number || "-", 390, 40, 7, false, muted);

  return pdfDoc.save();
}
