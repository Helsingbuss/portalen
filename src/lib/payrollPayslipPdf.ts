import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

function clean(value: any) {
  return String(value ?? "—")
    .replace(/–/g, "-")
    .replace(/—/g, "-")
    .replace(/•/g, "-")
    .replace(/[\u0100-\uFFFF]/g, "")
    .trim() || "—";
}

function money(value: any) {
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: "SEK",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function number(value: any) {
  return new Intl.NumberFormat("sv-SE", {
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function date(value: any) {
  if (!value) return "—";

  try {
    return new Intl.DateTimeFormat("sv-SE", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(new Date(value));
  } catch {
    return clean(value);
  }
}

function payTypeLabel(value: any) {
  if (value === "monthly") return "Månadslön";
  return "Timlön";
}

function statusLabel(value: any) {
  switch (value) {
    case "draft":
      return "Utkast";
    case "approved":
      return "Godkänd";
    case "exported":
      return "Exporterad";
    case "bank_sent":
      return "Skickad till bank";
    case "paid":
      return "Betald";
    case "cancelled":
      return "Avbruten";
    default:
      return clean(value || "Status");
  }
}

function drawText(page: any, text: string, x: number, y: number, size: number, font: any, color = rgb(0.1, 0.18, 0.25)) {
  page.drawText(clean(text), {
    x,
    y,
    size,
    font,
    color,
  });
}

function drawRow(page: any, label: string, value: string, x: number, y: number, width: number, font: any, bold: any, strong = false) {
  const size = strong ? 11 : 10;
  const usedFont = strong ? bold : font;

  page.drawLine({
    start: { x, y: y - 6 },
    end: { x: x + width, y: y - 6 },
    thickness: 0.5,
    color: rgb(0.9, 0.92, 0.94),
  });

  drawText(page, label, x, y, size, font, rgb(0.35, 0.42, 0.5));

  const valueText = clean(value);
  const valueWidth = usedFont.widthOfTextAtSize(valueText, size);

  drawText(page, valueText, x + width - valueWidth, y, size, usedFont, strong ? rgb(0.1, 0.3, 0.42) : rgb(0.1, 0.18, 0.25));
}

function drawBox(page: any, label: string, value: string, x: number, y: number, width: number, height: number, font: any, bold: any) {
  page.drawRectangle({
    x,
    y,
    width,
    height,
    borderColor: rgb(0.86, 0.88, 0.9),
    borderWidth: 1,
    color: rgb(1, 1, 1),
  });

  drawText(page, label.toUpperCase(), x + 12, y + height - 18, 8, bold, rgb(0.48, 0.55, 0.63));
  drawText(page, value, x + 12, y + 14, 11, bold, rgb(0.1, 0.18, 0.25));
}

function wrapText(text: string, font: any, size: number, maxWidth: number) {
  const words = clean(text).split(/\s+/);
  const lines: string[] = [];
  let line = "";

  for (const word of words) {
    const testLine = line ? line + " " + word : word;
    const width = font.widthOfTextAtSize(testLine, size);

    if (width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = testLine;
    }
  }

  if (line) lines.push(line);

  return lines;
}

function drawWrappedText(page: any, text: string, x: number, y: number, maxWidth: number, size: number, font: any) {
  const lines = wrapText(text, font, size, maxWidth);
  let currentY = y;

  for (const line of lines.slice(0, 8)) {
    drawText(page, line, x, currentY, size, font, rgb(0.35, 0.42, 0.5));
    currentY -= size + 5;
  }

  return currentY;
}

export async function generatePayslipPdfBytes({
  payslip,
  run,
}: {
  payslip: any;
  run: any;
}) {
  const pdfDoc = await PDFDocument.create();

  const page = pdfDoc.addPage([595.28, 841.89]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const width = page.getWidth();
  const margin = 44;
  const contentWidth = width - margin * 2;

  page.drawRectangle({
    x: 0,
    y: 760,
    width,
    height: 82,
    color: rgb(0.1, 0.3, 0.4),
  });

  drawText(page, "HELSINGBUSS", margin, 806, 10, bold, rgb(0.7, 0.9, 0.88));
  drawText(page, "Lönebesked", margin, 782, 26, bold, rgb(1, 1, 1));

  const generatedText = "Skapad " + date(new Date().toISOString());
  const generatedWidth = bold.widthOfTextAtSize(generatedText, 9);
  drawText(page, generatedText, width - margin - generatedWidth, 806, 9, bold, rgb(0.85, 0.92, 0.95));

  let y = 720;

  drawBox(page, "Anställd", payslip.employee_name_snapshot || "—", margin, y, 245, 55, font, bold);
  drawBox(page, "Lönetyp", payTypeLabel(payslip.pay_type), margin + 265, y, 245, 55, font, bold);

  y -= 70;

  drawBox(page, "Period", date(run?.period_start) + " - " + date(run?.period_end), margin, y, 245, 55, font, bold);
  drawBox(page, "Utbetalningsdatum", date(run?.payout_date), margin + 265, y, 245, 55, font, bold);

  y -= 84;

  drawText(page, "Lön", margin, y, 16, bold, rgb(0.1, 0.3, 0.42));
  y -= 24;

  const rowX = margin;
  const rowWidth = contentWidth;

  drawRow(page, "Timmar", number(payslip.hours) + " h", rowX, y, rowWidth, font, bold);
  y -= 24;
  drawRow(page, "Timlön", money(payslip.hourly_rate), rowX, y, rowWidth, font, bold);
  y -= 24;
  drawRow(page, "Månadslön", money(payslip.monthly_salary), rowX, y, rowWidth, font, bold);
  y -= 24;
  drawRow(page, "Grundlön", money(payslip.gross_base), rowX, y, rowWidth, font, bold);
  y -= 24;
  drawRow(page, "Semesterersättning", money(payslip.vacation_pay) + " (" + number(payslip.vacation_percent) + " %)", rowX, y, rowWidth, font, bold);
  y -= 28;
  drawRow(page, "Bruttolön", money(payslip.gross_total), rowX, y, rowWidth, font, bold, true);
  y -= 28;
  drawRow(page, "Preliminär skatt", "-" + money(payslip.preliminary_tax_amount) + " (" + number(payslip.preliminary_tax_percent) + " %)", rowX, y, rowWidth, font, bold);
  y -= 28;
  drawRow(page, "Nettolön", money(payslip.net_pay), rowX, y, rowWidth, font, bold, true);
  y -= 28;
  drawRow(page, "Utbetalningsbelopp", money(payslip.payout_amount || payslip.net_pay), rowX, y, rowWidth, font, bold, true);

  y -= 60;

  page.drawRectangle({
    x: margin,
    y: y - 70,
    width: contentWidth,
    height: 86,
    color: rgb(0.96, 0.98, 0.98),
    borderColor: rgb(0.88, 0.91, 0.93),
    borderWidth: 1,
  });

  drawText(page, "Status och leverans", margin + 14, y - 6, 13, bold, rgb(0.1, 0.3, 0.42));
  drawText(page, "Status: " + statusLabel(payslip.status), margin + 14, y - 28, 10, font, rgb(0.35, 0.42, 0.5));
  drawText(page, "Publicerad i app: " + date(payslip.app_published_at), margin + 14, y - 46, 10, font, rgb(0.35, 0.42, 0.5));
  drawText(page, "E-post skickad: " + date(payslip.email_sent_at), margin + 14, y - 64, 10, font, rgb(0.35, 0.42, 0.5));

  y -= 120;

  if (payslip.tax_notes) {
    drawText(page, "Skatteanteckning", margin, y, 13, bold, rgb(0.1, 0.3, 0.42));
    y -= 20;
    y = drawWrappedText(page, payslip.tax_notes, margin, y, contentWidth, 9, font);
    y -= 18;
  }

  if (payslip.notes) {
    drawText(page, "Anteckning", margin, y, 13, bold, rgb(0.1, 0.3, 0.42));
    y -= 20;
    y = drawWrappedText(page, payslip.notes, margin, y, contentWidth, 9, font);
  }

  page.drawLine({
    start: { x: margin, y: 54 },
    end: { x: width - margin, y: 54 },
    thickness: 0.5,
    color: rgb(0.86, 0.88, 0.9),
  });

  drawText(
    page,
    "Detta lönebesked är genererat i Helsingbuss personal- och löneportal.",
    margin,
    34,
    8,
    font,
    rgb(0.45, 0.5, 0.56)
  );

  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}
