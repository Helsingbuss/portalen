import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

type AnyRow = Record<string, any>;

function clean(value: any) {
  return String(value ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/[→←–—]/g, "-")
    .replace(/€/g, "EUR")
    .replace(/\s+/g, " ")
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
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return clean(value);

    return new Intl.DateTimeFormat("sv-SE", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  } catch {
    return clean(value);
  }
}

function statusLabel(status?: string | null) {
  switch (status) {
    case "paid": return "Betald";
    case "received": return "Mottagen";
    case "approved": return "Godkänd";
    case "unpaid": return "Obetald";
    case "overdue": return "Förfallen";
    case "archived": return "Arkiverad";
    default: return status || "-";
  }
}

function splitText(value: any, maxLength: number) {
  const words = clean(value).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = (current + " " + word).trim();

    if (next.length > maxLength) {
      if (current) lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }

  if (current) lines.push(current);

  return lines.length ? lines : ["-"];
}

export async function generateSupplierInvoicePdf({
  invoice,
  lines,
}: {
  invoice: AnyRow;
  lines: AnyRow[];
}) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]);

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const { width, height } = page.getSize();

  const dark = rgb(0.10, 0.30, 0.40);
  const text = rgb(0.10, 0.12, 0.16);
  const muted = rgb(0.38, 0.42, 0.48);
  const border = rgb(0.82, 0.85, 0.88);
  const light = rgb(0.95, 0.97, 0.98);
  const white = rgb(1, 1, 1);

  const left = 42;
  const right = width - 42;

  function draw(value: any, x: number, y: number, size = 9, isBold = false, color = text) {
    page.drawText(clean(value), {
      x,
      y,
      size,
      font: isBold ? bold : font,
      color,
    });
  }

  function drawRight(value: any, xRight: number, y: number, size = 9, isBold = false, color = text) {
    const safe = clean(value);
    const usedFont = isBold ? bold : font;
    const textWidth = usedFont.widthOfTextAtSize(safe, size);

    page.drawText(safe, {
      x: xRight - textWidth,
      y,
      size,
      font: usedFont,
      color,
    });
  }

  function line(y: number, x1 = left, x2 = right, color = border, thickness = 0.7) {
    page.drawLine({
      start: { x: x1, y },
      end: { x: x2, y },
      thickness,
      color,
    });
  }

  function box(x: number, y: number, w: number, h: number, fill = white, stroke = border) {
    page.drawRectangle({
      x,
      y,
      width: w,
      height: h,
      color: fill,
      borderColor: stroke,
      borderWidth: 0.8,
    });
  }

  draw("Helsingbuss", left, height - 64, 25, true, dark);
  drawRight("Internt underlag", right, height - 64, 24, true, dark);
  drawRight("Leverantörs-/samarbetsfaktura", right, height - 88, 10, true, muted);

  line(height - 112, left, right, dark, 1.2);

  const topBoxY = height - 240;
  box(left, topBoxY, right - left, 104, light, border);

  draw("Leverantör", left + 14, topBoxY + 78, 9, true, dark);
  draw(invoice.supplier_name || "-", left + 14, topBoxY + 61, 12, true, text);
  draw(invoice.supplier_email || "", left + 14, topBoxY + 45, 8, false, muted);
  draw(invoice.supplier_org_number ? "Org.nr: " + invoice.supplier_org_number : "", left + 14, topBoxY + 31, 8, false, muted);

  draw("Fakturanummer", 330, topBoxY + 78, 8, true, muted);
  draw(invoice.supplier_invoice_number || "-", 430, topBoxY + 78, 9, true, text);

  draw("OCR / referens", 330, topBoxY + 61, 8, true, muted);
  draw(invoice.ocr_number || invoice.payment_reference || "-", 430, topBoxY + 61, 9, false, text);

  draw("Fakturadatum", 330, topBoxY + 44, 8, true, muted);
  draw(fmtDate(invoice.invoice_date), 430, topBoxY + 44, 9, false, text);

  draw("Förfallodatum", 330, topBoxY + 27, 8, true, muted);
  draw(fmtDate(invoice.due_date), 430, topBoxY + 27, 9, false, text);

  draw("Status", 330, topBoxY + 10, 8, true, muted);
  draw(statusLabel(invoice.status), 430, topBoxY + 10, 9, true, text);

  let y = topBoxY - 32;

  const infoRows = [
    ["Typ", invoice.invoice_origin === "historical" ? "Gammal faktura" : "Aktuell faktura"],
    ["Kategori", invoice.category || "-"],
    ["Koppling", invoice.linked_order_reference || invoice.linked_customer_invoice_id || "-"],
    ["Betaldatum", fmtDate(invoice.paid_date)],
    ["Betalningssätt", invoice.payment_method || "-"],
  ];

  for (const [label, value] of infoRows) {
    draw(label, left, y, 8, true, muted);
    draw(value, left + 120, y, 8.5, false, text);
    y -= 13;
  }

  y -= 14;

  page.drawRectangle({
    x: left,
    y: y - 10,
    width: right - left,
    height: 24,
    color: dark,
  });

  draw("Beskrivning", left + 8, y, 8.5, true, white);
  drawRight("Antal", 338, y, 8.5, true, white);
  drawRight("A-pris", 420, y, 8.5, true, white);
  drawRight("Moms", 480, y, 8.5, true, white);
  drawRight("Summa", right - 8, y, 8.5, true, white);

  y -= 29;

  for (const row of lines || []) {
    if (y < 230) break;

    const description = row.description || row.title || "-";
    const quantity = row.quantity || 1;
    const unitPrice = row.unit_price_excl_vat || row.unit_price || 0;
    const vat = row.vat_amount || 0;
    const total = row.line_total_incl_vat || row.total_amount || row.line_total_excl_vat || 0;

    const descLines = splitText(description, 54).slice(0, 3);

    draw(descLines[0], left + 8, y, 8.8, true, text);
    drawRight(money(quantity), 338, y, 8.5, false, text);
    drawRight(money(unitPrice), 420, y, 8.5, false, text);
    drawRight(money(vat), 480, y, 8.5, false, text);
    drawRight(money(total), right - 8, y, 8.8, true, text);

    y -= 12;

    for (const extraLine of descLines.slice(1)) {
      draw(extraLine, left + 8, y, 8, false, muted);
      y -= 10;
    }

    if (row.cost_account || row.vat_account) {
      draw(
        "Konto: " + clean(row.cost_account || invoice.default_cost_account || "4010") +
          (row.vat_account ? " · Moms: " + clean(row.vat_account) : ""),
        left + 8,
        y,
        7.5,
        false,
        muted
      );
      y -= 10;
    }

    line(y, left, right);
    y -= 14;
  }

  const noteY = 142;
  box(left, noteY, 270, 58, light, border);
  draw("Anteckning / bilaga", left + 12, noteY + 40, 9, true, dark);

  const noteLines = splitText(
    [
      invoice.notes,
      invoice.attachment_filename ? "Bilaga: " + invoice.attachment_filename : "Ingen bilaga registrerad.",
    ].filter(Boolean).join(" · "),
    70
  ).slice(0, 3);

  let noteLineY = noteY + 25;

  for (const noteLine of noteLines) {
    draw(noteLine, left + 12, noteLineY, 7.8, false, text);
    noteLineY -= 10;
  }

  const summaryX = width - 235;
  const summaryY = 116;
  const summaryW = 193;
  const summaryH = 100;

  box(summaryX, summaryY, summaryW, summaryH, white, border);
  draw("Sammanställning", summaryX + 12, summaryY + summaryH - 20, 10, true, dark);

  let sy = summaryY + summaryH - 40;

  draw("Exkl. moms", summaryX + 12, sy, 9, false, text);
  drawRight(money(invoice.subtotal_excl_vat), summaryX + summaryW - 12, sy, 9, false, text);
  sy -= 15;

  draw("Moms", summaryX + 12, sy, 9, false, text);
  drawRight(money(invoice.vat_amount), summaryX + summaryW - 12, sy, 9, false, text);
  sy -= 15;

  draw("Avrundning", summaryX + 12, sy, 9, false, text);
  drawRight(money(invoice.rounding_amount), summaryX + summaryW - 12, sy, 9, false, text);
  sy -= 10;

  line(sy, summaryX + 12, summaryX + summaryW - 12, dark, 0.9);
  sy -= 18;

  draw("Totalt", summaryX + 12, sy, 12, true, dark);
  drawRight(money(invoice.total_amount) + " kr", summaryX + summaryW - 12, sy, 12, true, dark);

  line(76, left, right, dark, 1.1);
  draw("Betalningsuppgifter", left, 57, 8, true, dark);
  draw(
    [
      invoice.bankgiro ? "Bankgiro: " + invoice.bankgiro : "",
      invoice.swish_number ? "Swish: " + invoice.swish_number : "",
      invoice.iban ? "IBAN: " + invoice.iban : "",
      invoice.bic ? "BIC: " + invoice.bic : "",
    ].filter(Boolean).join(" · ") || "Inga betalningsuppgifter registrerade.",
    left,
    43,
    7,
    false,
    muted
  );

  drawRight("Skapad internt i Helsingbuss Portal", right, 43, 7, false, muted);

  return pdfDoc.save();
}
