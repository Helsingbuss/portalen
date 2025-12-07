// src/lib/tickets/generateTicketPdf.ts
import fs from "fs";
import path from "path";
import { PDFDocument, StandardFonts, rgb, PDFFont } from "pdf-lib";
import QRCode from "qrcode";

export type PassengerInfo = {
  fullName?: string | null;
  seatNumber?: string | null;
  category?: string | null;
  price: number; // per person
};

export type TicketPdfData = {
  orderId: string;
  ticketId: string;
  ticketNumber: string;

  // Resa / avgång
  tripTitle: string;       // t.ex. "Malmö C – Gekås Ullared"
  lineName: string;        // t.ex. "Linje 1 Helsingbuss"
  operatorName: string;    // t.ex. "Norra Skåne Buss AB / Bergkvara"
  departureDate: string;   // YYYY-MM-DD
  departureTime: string;   // HH:MM
  returnTime?: string | null;
  departureStop: string;   // t.ex. "Malmö C (Läge k)"

  // Kund
  customerName: string;
  customerEmail: string;
  customerPhone: string;

  // Passagerare
  passengers: PassengerInfo[];

  // Pris
  currency: "SEK";
  baseAmount: number;
  smsTicket: boolean;
  smsPrice: number;
  cancellationProtection: boolean;
  cancellationPrice: number;
  totalAmount: number;
  vatAmount: number;

  // Övrigt
  createdAt: string;       // ISO-sträng
  validFrom: string;
  validTo: string;
  ticketType: "shopping" | "multiday";

  // QR
  qrPayload: string;
};

// Datumrad under rubriken
function formatTripHeaderDateLine(
  dateStr: string,
  departureTime: string,
  returnTime?: string | null
): string {
  const d = new Date(dateStr + "T12:00:00");
  const months = [
    "januari",
    "februari",
    "mars",
    "april",
    "maj",
    "juni",
    "juli",
    "augusti",
    "september",
    "oktober",
    "november",
    "december",
  ];
  const day = d.getDate();
  const month = months[d.getMonth()];

  let line = `${day} ${month}, ${departureTime}`;
  if (returnTime) {
    line += `, retur ${day} ${month}, ${returnTime}`;
  }
  return line;
}

// Prisformat i stil med "295 ,-"
function formatTicketPrice(amountSek: number): string {
  const rounded = Math.round(amountSek);
  return `${rounded} ,-`;
}

// För returtexten: plocka ut destinationen från "Malmö C – Gekås Ullared"
function getReturnLocationFromTitle(title: string): string {
  const enDashIndex = title.indexOf("–");
  if (enDashIndex >= 0) {
    return title.slice(enDashIndex + 1).trim();
  }
  const minusIndex = title.indexOf("-");
  if (minusIndex >= 0) {
    return title.slice(minusIndex + 1).trim();
  }
  return title.trim();
}

// Format "Biljett köpt: DD.MM.ÅÅÅÅ, HH:MM"
function formatPurchaseDateTime(createdAt: string): string {
  const d = new Date(createdAt);
  if (Number.isNaN(d.getTime())) return "";

  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);

  const day = pad(d.getDate());
  const month = pad(d.getMonth() + 1);
  const year = d.getFullYear();
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());

  return `Biljett köpt: ${day}.${month}.${year}, ${hours}:${minutes}`;
}

export async function generateTicketPdf(
  data: TicketPdfData
): Promise<Uint8Array> {
  const templatePathEnv = process.env.TICKET_TEMPLATE_PATH;
  const templatePath = templatePathEnv
    ? templatePathEnv
    : path.join(
        process.cwd(),
        "public",
        "tickets",
        "helsingbuss-e-biljett-mall.pdf"
      );

  if (!fs.existsSync(templatePath)) {
    throw new Error(
      `Ticket template not found at path: ${templatePath}. ` +
        `Kontrollera att filen finns där och heter "helsingbuss-e-biljett-mall.pdf".`
    );
  }

  const templateBytes = fs.readFileSync(templatePath);
  const pdfDoc = await PDFDocument.load(templateBytes);

  const [page] = pdfDoc.getPages();
  const { width, height } = page.getSize(); // <-- nu har vi även width

  // ---- Typsnitt (Open Sans om filerna finns, annars Helvetica) ----
  let headerFont: PDFFont = await pdfDoc.embedFont(
    StandardFonts.HelveticaBold
  );
  let subFont: PDFFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  let lightFont: PDFFont = subFont;
  let italicFont: PDFFont = subFont;

  try {
    const fontDir = path.join(process.cwd(), "public", "fonts");
    const semiPath = path.join(fontDir, "OpenSans-SemiBold.ttf");
    const regPath = path.join(fontDir, "OpenSans-Regular.ttf");
    const lightPath = path.join(fontDir, "OpenSans-Light.ttf");
    const lightItalicPath = path.join(fontDir, "OpenSans-LightItalic.ttf");
    const italicPath = path.join(fontDir, "OpenSans-Italic.ttf");

    if (fs.existsSync(semiPath)) {
      const semiBytes = fs.readFileSync(semiPath);
      headerFont = await pdfDoc.embedFont(semiBytes);
    }
    if (fs.existsSync(regPath)) {
      const regBytes = fs.readFileSync(regPath);
      subFont = await pdfDoc.embedFont(regBytes);
      lightFont = subFont;
      italicFont = subFont;
    }
    if (fs.existsSync(lightPath)) {
      const lightBytes = fs.readFileSync(lightPath);
      lightFont = await pdfDoc.embedFont(lightBytes);
    }
    if (fs.existsSync(lightItalicPath)) {
      const liBytes = fs.readFileSync(lightItalicPath);
      italicFont = await pdfDoc.embedFont(liBytes);
    } else if (fs.existsSync(italicPath)) {
      const itBytes = fs.readFileSync(italicPath);
      italicFont = await pdfDoc.embedFont(itBytes);
    }
  } catch (e) {
    console.warn("[ticketPdf] Failed to load Open Sans fonts, using fallback.", e);
  }

  // ---- Färg #1d2937 ----
  const headerColor = rgb(29 / 255, 41 / 255, 55 / 255);
  const bodyColor = headerColor;

  const headerTitle = data.tripTitle;
  const headerDateLine = formatTripHeaderDateLine(
    data.departureDate,
    data.departureTime,
    data.returnTime
  );

  // =========================
  // RUBRIK
  // =========================
  const HEADER_TITLE_X = 40;
  const HEADER_TITLE_Y = height - 115;
  const HEADER_DATE_GAP = 16;

  const headerTitleX = HEADER_TITLE_X;
  const headerTitleY = HEADER_TITLE_Y;
  const headerDateY = headerTitleY - HEADER_DATE_GAP;

  page.drawText(headerTitle, {
    x: headerTitleX,
    y: headerTitleY,
    size: 16,
    font: headerFont,
    color: headerColor,
  });

  page.drawText(headerDateLine, {
    x: headerTitleX,
    y: headerDateY,
    size: 12,
    font: subFont,
    color: headerColor,
  });

  // ==========================================
  // BOKNINGSNUMMER – under "Bokningsnummer:"
  // ==========================================
  const bookingNumberText = data.ticketNumber || data.orderId || "";

  if (bookingNumberText) {
    const BOOKING_NUMBER_X = 363;
    const BOOKING_NUMBER_Y = headerTitleY - 12;

    page.drawText(bookingNumberText, {
      x: BOOKING_NUMBER_X,
      y: BOOKING_NUMBER_Y,
      size: 10,
      font: headerFont,
      color: bodyColor,
    });
  }

  // ==========================================
  // QR-KOD + Namn / Telefon
  // ==========================================
  const qrValue =
    data.qrPayload || data.ticketId || data.ticketNumber || data.orderId;

  if (qrValue) {
    const qrDataUrl = await QRCode.toDataURL(qrValue, {
      errorCorrectionLevel: "M",
      margin: 1,
      scale: 8,
    });

    const base64 = qrDataUrl.split(",")[1];
    const qrBytes = Buffer.from(base64, "base64");
    const qrImage = await pdfDoc.embedPng(qrBytes);

    // ===== HÄR JUSTERAR DU QR-POSITION OCH STORLEK =====
    const QR_SIZE = 100;             // bredd/höjd i px
    const QR_X = 360;                // vänster/höger
    const QR_Y = headerTitleY - 120; // upp/ner

    page.drawImage(qrImage, {
      x: QR_X,
      y: QR_Y,
      width: QR_SIZE,
      height: QR_SIZE,
    });

    // Text under QR – Namn / Telefon
    const NAME_LABEL_X = QR_X;
    const NAME_LABEL_Y = QR_Y - 18;

    const PHONE_LABEL_X = QR_X;
    const PHONE_LABEL_Y = NAME_LABEL_Y - 12;

    const nameLine = `Namn: ${data.customerName || ""}`;
    const phoneLine = `Telefon: ${data.customerPhone || ""}`;

    page.drawText(nameLine, {
      x: NAME_LABEL_X,
      y: NAME_LABEL_Y,
      size: 8,
      font: subFont,
      color: bodyColor,
    });

    page.drawText(phoneLine, {
      x: PHONE_LABEL_X,
      y: PHONE_LABEL_Y,
      size: 8,
      font: subFont,
      color: bodyColor,
    });
  }

  // ==========================================
  // FÖRSTA RADEN – "06:00 Malmö C (Läge k)"
  // ==========================================
  const firstDepartureLine = `${data.departureTime} ${data.departureStop}`;

  const DEPART_LINE_X = 68;
  const DEPART_LINE_Y = headerDateY - 35;

  page.drawText(firstDepartureLine, {
    x: DEPART_LINE_X,
    y: DEPART_LINE_Y,
    size: 10,
    font: subFont,
    color: bodyColor,
  });

  // ==========================================
  // "Linje X Helsingbuss"
  // ==========================================
  const lineLabel = data.lineName;

  const LINE_LABEL_X = 95;
  const LINE_LABEL_Y = DEPART_LINE_Y - 22;

  page.drawText(lineLabel, {
    x: LINE_LABEL_X,
    y: LINE_LABEL_Y,
    size: 11,
    font: headerFont,
    color: bodyColor,
  });

  // ==========================================
  // "Linjen körs av operatör: ..."
  // ==========================================
  const operatorLine = `Linjen körs av operatör: ${data.operatorName}`;

  const OPERATOR_LINE_X = LINE_LABEL_X;
  const OPERATOR_LINE_Y = LINE_LABEL_Y - 10;

  page.drawText(operatorLine, {
    x: OPERATOR_LINE_X,
    y: OPERATOR_LINE_Y,
    size: 8,
    font: lightFont,
    color: bodyColor,
  });

  // ==========================================
  // "På uppdrag av Helsingbuss."
  // ==========================================
  const byOrderLine = "På uppdrag av Helsingbuss.";

  const BY_ORDER_LINE_X = OPERATOR_LINE_X;
  const BY_ORDER_LINE_Y = OPERATOR_LINE_Y - 10;

  page.drawText(byOrderLine, {
    x: BY_ORDER_LINE_X,
    y: BY_ORDER_LINE_Y,
    size: 7,
    font: italicFont,
    color: bodyColor,
  });

  // ==========================================
  // PRISRUTA – "<N> x Bussbiljett"
  // ==========================================
  const passengerCount = data.passengers?.length ?? 1;
  const ticketLineLabel = `${passengerCount} x Bussbiljett`;

  const TICKET_LINE_X = 78;
  const TICKET_LINE_Y = BY_ORDER_LINE_Y - 20;

  page.drawText(ticketLineLabel, {
    x: TICKET_LINE_X,
    y: TICKET_LINE_Y,
    size: 8,
    font: headerFont,
    color: bodyColor,
  });

  // Pris bussbiljetter – totalt
  const baseAmountRaw = data.baseAmount ?? 0;
  const baseAmountSek =
    baseAmountRaw > 1000 ? baseAmountRaw / 100 : baseAmountRaw;
  const ticketPriceText = formatTicketPrice(baseAmountSek);

  const BUS_TICKET_PRICE_X = 280;
  const BUS_TICKET_PRICE_Y = TICKET_LINE_Y;

  page.drawText(ticketPriceText, {
    x: BUS_TICKET_PRICE_X,
    y: BUS_TICKET_PRICE_Y,
    size: 8,
    font: headerFont,
    color: bodyColor,
  });

  // ==========================================
  // PLATS-RAD – "N x Plats A1, A2, A3"
  // ==========================================
  const seatNumbers = (data.passengers ?? [])
    .map((p) => p.seatNumber)
    .filter((s): s is string => !!s && s.trim().length > 0);

  const seatCount = seatNumbers.length;
  let seatLineYForPrice: number | null = null;

  if (seatCount > 0) {
    const seatList = seatNumbers.join(", ");
    const seatLabel = `${seatCount} x Plats ${seatList}`;

    const SEAT_LINE_X = TICKET_LINE_X;
    const SEAT_LINE_Y = TICKET_LINE_Y - 12;

    seatLineYForPrice = SEAT_LINE_Y;

    page.drawText(seatLabel, {
      x: SEAT_LINE_X,
      y: SEAT_LINE_Y,
      size: 8,
      font: subFont,
      color: bodyColor,
    });

    const seatPriceText = "XX ,-";

    const SEAT_PRICE_X = BUS_TICKET_PRICE_X;
    const SEAT_PRICE_Y = SEAT_LINE_Y;

    page.drawText(seatPriceText, {
      x: SEAT_PRICE_X,
      y: SEAT_PRICE_Y,
      size: 8,
      font: subFont,
      color: bodyColor,
    });
  }

  // ==========================================
  // RETURRAD
  // ==========================================
  let returnLineY: number | null = null;

  if (data.returnTime) {
    const returnLocation = getReturnLocationFromTitle(headerTitle);
    const returnText = `Avgår retur från ${returnLocation}, ${data.returnTime}`;

    const RETURN_LINE_X = DEPART_LINE_X;
    const RETURN_LINE_Y =
      seatLineYForPrice !== null ? seatLineYForPrice - 40 : TICKET_LINE_Y - 55;

    returnLineY = RETURN_LINE_Y;

    page.drawText(returnText, {
      x: RETURN_LINE_X,
      y: RETURN_LINE_Y,
      size: 10,
      font: subFont,
      color: bodyColor,
    });
  }

  // ==========================================
  // EXTRARADER – Avbeställningsskydd & SMS-biljett
  // ==========================================
  const EXTRA_LINE_X = TICKET_LINE_X;

  const extraStartBaseY =
    returnLineY !== null
      ? returnLineY
      : seatLineYForPrice !== null
      ? seatLineYForPrice
      : TICKET_LINE_Y;

  let extraY = extraStartBaseY - 35;

  // 1 x Avbeställningsskydd
  if (data.cancellationProtection && data.cancellationPrice > 0) {
    const cancelLabel = "1 x Avbeställningsskydd";

    page.drawText(cancelLabel, {
      x: EXTRA_LINE_X,
      y: extraY,
      size: 8,
      font: headerFont,
      color: bodyColor,
    });

    const cancelRaw = data.cancellationPrice;
    const cancelSek = cancelRaw > 1000 ? cancelRaw / 100 : cancelRaw;
    const cancelPriceText = formatTicketPrice(cancelSek);

    page.drawText(cancelPriceText, {
      x: BUS_TICKET_PRICE_X,
      y: extraY,
      size: 8,
      font: headerFont,
      color: bodyColor,
    });

    extraY -= 12;
  }

  // 1 x SMS biljett
  if (data.smsTicket && data.smsPrice > 0) {
    const smsLabel = "1 x SMS biljett";

    page.drawText(smsLabel, {
      x: EXTRA_LINE_X,
      y: extraY,
      size: 8,
      font: headerFont,
      color: bodyColor,
    });

    const smsRaw = data.smsPrice;
    const smsSek = smsRaw > 1000 ? smsRaw / 100 : smsRaw;
    const smsPriceText = formatTicketPrice(smsSek);

    page.drawText(smsPriceText, {
      x: BUS_TICKET_PRICE_X,
      y: extraY,
      size: 8,
      font: headerFont,
      color: bodyColor,
    });

    extraY -= 12;
  }

  // ==========================================
  // TOTALT
  // ==========================================
  if (data.totalAmount && data.totalAmount > 0) {
    const totalLabel = "Totalt";

    const totalRaw = data.totalAmount;
    const totalSek = totalRaw > 1000 ? totalRaw / 100 : totalRaw;
    const totalPriceText = formatTicketPrice(totalSek);

    const TOTAL_LINE_X = EXTRA_LINE_X;
    const TOTAL_LINE_Y = extraY - 6;
    extraY = TOTAL_LINE_Y;

    page.drawText(totalLabel, {
      x: TOTAL_LINE_X,
      y: TOTAL_LINE_Y,
      size: 11,
      font: headerFont,
      color: bodyColor,
    });

    page.drawText(totalPriceText, {
      x: BUS_TICKET_PRICE_X,
      y: TOTAL_LINE_Y,
      size: 11,
      font: headerFont,
      color: bodyColor,
    });

    extraY = TOTAL_LINE_Y - 10;
  }

  // ==========================================
  // MOMS – "varv Moms (6 %)"
  // ==========================================
  if (data.vatAmount && data.vatAmount > 0) {
    const vatLabel = "varv Moms (6 %)";

    const VAT_LINE_X = EXTRA_LINE_X;
    const VAT_LINE_Y = extraY - 4;
    extraY = VAT_LINE_Y;

    page.drawText(vatLabel, {
      x: VAT_LINE_X,
      y: VAT_LINE_Y,
      size: 8,
      font: headerFont,
      color: bodyColor,
    });

    const vatRaw = data.vatAmount;
    const vatSek = vatRaw > 1000 ? vatRaw / 100 : vatRaw;

    const vatNumber = Math.round(vatSek * 100) / 100;
    const vatPriceText = vatNumber.toFixed(2).replace(".", ",");

    page.drawText(vatPriceText, {
      x: BUS_TICKET_PRICE_X,
      y: VAT_LINE_Y,
      size: 8,
      font: headerFont,
      color: bodyColor,
    });

    extraY = VAT_LINE_Y - 10;
  }

  // ==========================================
  // MEDDELANDE FRÅN HELSINGBUSS
  // ==========================================
  const MSG_TITLE_X = EXTRA_LINE_X;
  const MSG_TITLE_Y = extraY - 12;

  const messageTitle = "Meddelande från Helsingbuss";
  const messageBody =
    "Vi ber våra resenärer att vänligen respektera bussens avgångstid för hemresan. " +
    "Ibland kan det förekomma långa köer i varuhusets kassor. Vänligen ta med det i er " +
    "planering för att kunna vara tillbaka vid bussen på av vår chaufför utsatt tid. " +
    "Vi önskar er en trevlig shoppingdag i Ullared.";

  page.drawText(messageTitle, {
    x: MSG_TITLE_X,
    y: MSG_TITLE_Y,
    size: 8,
    font: headerFont,
    color: bodyColor,
  });

  const MSG_BODY_X = MSG_TITLE_X;
  const MSG_BODY_Y = MSG_TITLE_Y - 12;

  page.drawText(messageBody, {
    x: MSG_BODY_X,
    y: MSG_BODY_Y,
    size: 8,
    font: lightFont,
    color: bodyColor,
    maxWidth: 420,
    lineHeight: 10,
  });

  // ==========================================
  // FOOTER – "Biljett köpt: DD.MM.ÅÅÅÅ, HH:MM" (högerställd)
  // ==========================================
  const purchaseText = formatPurchaseDateTime(data.createdAt);

  if (purchaseText) {
    const FOOTER_FONT_SIZE = 7;
    const RIGHT_MARGIN = 50; // avstånd från högra kanten

    const textWidth = lightFont.widthOfTextAtSize(
      purchaseText,
      FOOTER_FONT_SIZE
    );

    const FOOTER_PURCHASE_X = width - RIGHT_MARGIN - textWidth;
    const FOOTER_PURCHASE_Y = 62; // höjd från nederkant

    page.drawText(purchaseText, {
      x: FOOTER_PURCHASE_X,
      y: FOOTER_PURCHASE_Y,
      size: FOOTER_FONT_SIZE,
      font: lightFont,
      color: bodyColor,
    });
  }

  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}
