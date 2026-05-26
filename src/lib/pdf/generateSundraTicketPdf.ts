import { PDFDocument, rgb, StandardFonts, PDFPage, PDFFont, RGB } from "pdf-lib";
import QRCode from "qrcode";
import fs from "fs/promises";
import path from "path";

type Passenger = {
  first_name?: string | null;
  last_name?: string | null;
  passenger_type?: string | null;
  seat_number?: string | null;
};

type GenerateTicketInput = {
  booking: {
    id: string;
    booking_number?: string | null;
    customer_name?: string | null;
    passengers_count?: number | null;
    total_amount?: number | null;
    currency?: string | null;
    payment_status?: string | null;
    ticket_hash?: string | null;

    payment_method?: string | null;
    card_last4?: string | null;
    transaction_id?: string | null;
    reference_number?: string | null;
    authorization_code?: string | null;
    purchased_at?: string | null;
    created_at?: string | null;
  };

  trip?: {
    id?: string | null;
    title?: string | null;
    destination?: string | null;
  } | null;

  pickupStop?: {
    id?: string | null;
    stop_name?: string | null;
    stop_city?: string | null;
    departure_time?: string | null;
  } | null;

  departure?: {
    id?: string | null;
    departure_date?: string | null;
    departure_time?: string | null;
    return_date?: string | null;
    return_time?: string | null;
  } | null;

  passengers?: Passenger[];
};

const COLORS = {
  navy: rgb(0.025, 0.105, 0.165),
  navy2: rgb(0.035, 0.16, 0.23),
  teal: rgb(0.02, 0.38, 0.36),
  tealDark: rgb(0.015, 0.29, 0.28),
  mint: rgb(0.63, 0.9, 0.84),
  gold: rgb(1, 0.69, 0.28),
  dark: rgb(0.045, 0.085, 0.14),
  muted: rgb(0.35, 0.43, 0.54),
  softText: rgb(0.52, 0.59, 0.68),
  border: rgb(0.82, 0.88, 0.92),
  softBorder: rgb(0.88, 0.92, 0.95),
  lightBg: rgb(0.965, 0.982, 0.988),
  paleBlue: rgb(0.94, 0.975, 0.985),
  white: rgb(1, 1, 1),
  pageBg: rgb(0.985, 0.985, 0.975),
};

function money(value?: number | null, currency = "SEK") {
  if (value == null) return "-";

  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value));
}

function fmtDateShort(date?: string | null) {
  if (!date) return "-";
  return String(date).slice(0, 10);
}

function fmtDateTime(dateTime?: string | null) {
  if (!dateTime) return "-";

  try {
    const d = new Date(dateTime);
    if (Number.isNaN(d.getTime())) return String(dateTime);

    return new Intl.DateTimeFormat("sv-SE", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
      .format(d)
      .replace(",", "");
  } catch {
    return String(dateTime);
  }
}

function fmtTime(time?: string | null) {
  if (!time) return "-";
  return String(time).slice(0, 5);
}

function paymentLabel(status?: string | null) {
  switch (status) {
    case "paid":
    case "completed":
    case "succeeded":
      return "Betalning godkänd";
    case "pending":
    case "pending_payment":
      return "Inväntar betalning";
    case "unpaid":
      return "Obetald";
    case "failed":
      return "Betalning misslyckades";
    default:
      return status || "Okänd";
  }
}

function ticketTypeLabel(passengers: Passenger[] = [], count?: number | null) {
  const total = count || passengers.length || 0;

  if (!passengers.length) {
    return `${total || 1} Resenär`;
  }

  const counts = passengers.reduce<Record<string, number>>((acc, p) => {
    const type = p.passenger_type || "Vuxen";
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});

  return Object.entries(counts)
    .map(([type, amount]) => `${amount} ${type}`)
    .join(", ");
}

function passengerName(passengers: Passenger[] = [], customerName?: string | null) {
  if (!passengers.length) return customerName || "-";

  const first = passengers[0];
  const name = `${first.first_name || ""} ${first.last_name || ""}`.trim();

  if (!name) return customerName || "-";
  if (passengers.length === 1) return name;

  return `${name} + ${passengers.length - 1} till`;
}

function seatSummary(passengers: Passenger[] = []) {
  const seats = passengers
    .map((p) => p.seat_number)
    .filter(Boolean)
    .map((s) => String(s));

  if (!seats.length) return "Ej valt";

  if (seats.length === 1) return seats[0];

  const joined = seats.join(", ");
  return joined.length > 14 ? `${seats.length} säten` : joined;
}

function vatIncluded(total?: number | null) {
  if (total == null) return null;
  return Number(total) - Number(total) / 1.06;
}

async function tryReadPublicFile(filePath: string) {
  try {
    return await fs.readFile(path.join(process.cwd(), "public", filePath));
  } catch {
    return null;
  }
}

async function embedPublicImage(pdf: PDFDocument, possiblePaths: string[]) {
  for (const filePath of possiblePaths) {
    const bytes = await tryReadPublicFile(filePath);
    if (!bytes) continue;

    try {
      const isPng =
        bytes[0] === 0x89 &&
        bytes[1] === 0x50 &&
        bytes[2] === 0x4e &&
        bytes[3] === 0x47;

      const isJpg = bytes[0] === 0xff && bytes[1] === 0xd8;

      if (isPng) return await pdf.embedPng(bytes);
      if (isJpg) return await pdf.embedJpg(bytes);
    } catch {
      continue;
    }
  }

  return null;
}

function fitText(text: string, font: PDFFont, size: number, maxWidth: number) {
  const value = text || "-";

  if (font.widthOfTextAtSize(value, size) <= maxWidth) return value;

  let out = value;
  while (out.length > 3 && font.widthOfTextAtSize(`${out}...`, size) > maxWidth) {
    out = out.slice(0, -1);
  }

  return `${out}...`;
}

function fitFontSize(text: string, font: PDFFont, startSize: number, minSize: number, maxWidth: number) {
  let size = startSize;

  while (size > minSize && font.widthOfTextAtSize(text, size) > maxWidth) {
    size -= 1;
  }

  return size;
}

function drawCenteredText(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  width: number,
  size: number,
  font: PDFFont,
  color: RGB
) {
  const textWidth = font.widthOfTextAtSize(text, size);

  page.drawText(text, {
    x: x + (width - textWidth) / 2,
    y,
    size,
    font,
    color,
  });
}

function roundedRectPath(width: number, height: number, radius: number) {
  const r = Math.min(radius, width / 2, height / 2);
  const c = r * 0.5522847498;

  return [
    `M ${r} 0`,
    `L ${width - r} 0`,
    `C ${width - r + c} 0 ${width} ${r - c} ${width} ${r}`,
    `L ${width} ${height - r}`,
    `C ${width} ${height - r + c} ${width - r + c} ${height} ${width - r} ${height}`,
    `L ${r} ${height}`,
    `C ${r - c} ${height} 0 ${height - r + c} 0 ${height - r}`,
    `L 0 ${r}`,
    `C 0 ${r - c} ${r - c} 0 ${r} 0`,
    "Z",
  ].join(" ");
}

function drawRoundedRect(
  page: PDFPage,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  options: {
    color?: RGB;
    borderColor?: RGB;
    borderWidth?: number;
  }
) {
  page.drawSvgPath(roundedRectPath(width, height, radius), {
    x,
    y,
    color: options.color,
    borderColor: options.borderColor,
    borderWidth: options.borderWidth,
  });
}

function drawCard(
  page: PDFPage,
  x: number,
  y: number,
  width: number,
  height: number,
  fill = COLORS.white
) {
  drawRoundedRect(page, x, y, width, height, 8, {
    color: fill,
    borderColor: COLORS.border,
    borderWidth: 1,
  });
}

function drawLabelValue(
  page: PDFPage,
  label: string,
  value: string,
  x: number,
  y: number,
  font: PDFFont,
  bold: PDFFont,
  maxWidth = 120
) {
  page.drawText(label, {
    x,
    y,
    size: 8.5,
    font,
    color: COLORS.muted,
  });

  page.drawText(fitText(value || "-", bold, 9.6, maxWidth), {
    x,
    y: y - 15,
    size: 9.6,
    font: bold,
    color: COLORS.dark,
  });
}

function drawMiniIcon(page: PDFPage, x: number, y: number, label: string, font: PDFFont) {
  page.drawCircle({
    x: x + 6,
    y: y + 6,
    size: 7,
    borderColor: COLORS.teal,
    borderWidth: 1.2,
  });

  page.drawText(label.slice(0, 1).toUpperCase(), {
    x: x + 3.8,
    y: y + 2.5,
    size: 6,
    font,
    color: COLORS.teal,
  });
}

function drawSectionTitle(page: PDFPage, title: string, x: number, y: number, bold: PDFFont) {
  page.drawText(title.toUpperCase(), {
    x,
    y,
    size: 9.5,
    font: bold,
    color: COLORS.teal,
  });
}

export async function generateSundraTicketPdf(input: GenerateTicketInput) {
  const pdf = await PDFDocument.create();

  // A4 portrait
  const page = pdf.addPage([595, 842]);
  const { width, height } = page.getSize();

  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const passengers = input.passengers || [];
  const seats = seatSummary(passengers);

  const bookingNumber = input.booking.booking_number || `SUN-${String(input.booking.id).slice(0, 8).toUpperCase()}`;
  const bookingId = String(input.booking.id || "-").slice(0, 12).toUpperCase();

  const tripTitle = input.trip?.title || "Sundra resa";
  const destination = input.trip?.destination || "Destination ej angiven";

  const fromStop = input.pickupStop?.stop_name || "Upphämtning ej angiven";
  const fromCity = input.pickupStop?.stop_city || "";
  const fromSub = fromCity ? fromCity : "Vald hållplats";

  const departureTime =
    input.pickupStop?.departure_time ||
    input.departure?.departure_time ||
    null;

  const purchasedAt =
    input.booking.purchased_at ||
    input.booking.created_at ||
    null;

  const totalAmount = input.booking.total_amount ?? null;
  const currency = input.booking.currency || "SEK";
  const vat = vatIncluded(totalAmount);

  const paymentStatus = paymentLabel(input.booking.payment_status);
  const isPaid =
    input.booking.payment_status === "paid" ||
    input.booking.payment_status === "completed" ||
    input.booking.payment_status === "succeeded";

  const ticketHash =
    input.booking.ticket_hash ||
    `${input.booking.id}-${input.departure?.id || ""}`;

  const qrPayload = JSON.stringify({
    type: "sundra_ticket",
    booking_id: input.booking.id,
    booking_number: input.booking.booking_number,
    trip_id: input.trip?.id || null,
    departure_id: input.departure?.id || null,
    passengers_count:
      input.booking.passengers_count || input.passengers?.length || 0,
    ticket_hash: ticketHash,
  });

  const qrDataUrl = await QRCode.toDataURL(qrPayload, {
    margin: 1,
    width: 360,
  });

  const qrImage = await pdf.embedPng(
    Buffer.from(qrDataUrl.split(",")[1], "base64")
  );

  page.drawRectangle({
    x: 0,
    y: 0,
    width,
    height,
    color: COLORS.pageBg,
  });

  // Main white paper
  drawRoundedRect(page, 24, 22, width - 48, height - 44, 10, {
    color: COLORS.white,
  });

  // Top banner
  const bannerX = 36;
  const bannerY = height - 153;
  const bannerW = width - 72;
  const bannerH = 118;

  drawRoundedRect(page, bannerX, bannerY, bannerW, bannerH, 10, {
    color: COLORS.navy,
  });

  // Banner depth
  page.drawRectangle({
    x: bannerX,
    y: bannerY,
    width: bannerW,
    height: bannerH,
    color: COLORS.navy,
    opacity: 0.96,
  });

  // Decorative waves
  const waveBase = bannerY + 36;
  const wavePath1 = `M 0 0 C 130 -18 210 -8 320 0 C 430 8 510 -12 610 28`;
  const wavePath2 = `M 0 0 C 140 -14 230 -4 330 4 C 430 12 515 -8 610 25`;
  const wavePath3 = `M 0 0 C 135 -11 240 -7 340 1 C 445 9 515 -5 610 20`;

  page.drawSvgPath(wavePath1, {
    x: bannerX - 5,
    y: waveBase + 14,
    borderColor: COLORS.gold,
    borderWidth: 2,
  });

  page.drawSvgPath(wavePath2, {
    x: bannerX - 5,
    y: waveBase + 3,
    borderColor: COLORS.mint,
    borderWidth: 1.7,
  });

  page.drawSvgPath(wavePath3, {
    x: bannerX - 5,
    y: waveBase - 9,
    borderColor: COLORS.teal,
    borderWidth: 2,
  });

  const logo = await embedPublicImage(pdf, [
    "branding/helsingbuss-logo-white.png",
    "branding/helsingbuss-logo-vit.png",
    "branding/helsingbuss-logo.png",
    "mork_logo.png",
  ]);

  if (logo) {
    page.drawImage(logo, {
      x: bannerX + 32,
      y: bannerY + 66,
      width: 150,
      height: 38,
    });
  } else {
    page.drawText("Helsingbuss", {
      x: bannerX + 32,
      y: bannerY + 72,
      size: 32,
      font: bold,
      color: COLORS.white,
    });
  }

  page.drawText("Sundra resor", {
    x: bannerX + 34,
    y: bannerY + 52,
    size: 15,
    font,
    color: COLORS.mint,
  });

  // Seat box
  const seatBoxX = bannerX + bannerW - 138;
  const seatBoxY = bannerY + 32;
  const seatBoxW = 108;
  const seatBoxH = 72;

  drawRoundedRect(page, seatBoxX, seatBoxY, seatBoxW, seatBoxH, 10, {
    color: COLORS.teal,
    borderColor: COLORS.gold,
    borderWidth: 1.8,
  });

  drawCenteredText(page, "SÄTE / SEAT", seatBoxX, seatBoxY + 48, seatBoxW, 10, bold, COLORS.white);

  const seatText = seats || "Ej valt";
  const seatFontSize = fitFontSize(seatText, bold, 29, 13, seatBoxW - 18);

  drawCenteredText(
    page,
    seatText,
    seatBoxX,
    seatBoxY + 18,
    seatBoxW,
    seatFontSize,
    bold,
    COLORS.white
  );

  // Heading
  page.drawText("Kvitto", {
    x: 60,
    y: 629,
    size: 31,
    font: bold,
    color: COLORS.dark,
  });

  page.drawText("Bokningsbekräftelse", {
    x: 60,
    y: 604,
    size: 15,
    font: bold,
    color: COLORS.teal,
  });

  page.drawText("Tack för din bokning med Sundra resor.", {
    x: 60,
    y: 583,
    size: 9.5,
    font,
    color: COLORS.muted,
  });

  page.drawText("Detta kvitto gäller som bekräftelse för din resa.", {
    x: 60,
    y: 568,
    size: 9.5,
    font,
    color: COLORS.muted,
  });

  // QR card
  drawCard(page, 392, 556, 143, 128, COLORS.white);

  drawCenteredText(page, "Visa biljett (QR-kod)", 392, 666, 143, 9.5, font, COLORS.muted);

  page.drawImage(qrImage, {
    x: 420,
    y: 583,
    width: 88,
    height: 88,
  });

  // Dotted separator
  for (let x = 60; x < 535; x += 7) {
    page.drawLine({
      start: { x, y: 538 },
      end: { x: x + 3, y: 538 },
      thickness: 0.7,
      color: COLORS.border,
    });
  }

  // Booking info card
  drawCard(page, 60, 410, 475, 112, COLORS.lightBg);

  const leftX = 108;
  const midX = 330;
  const row1Y = 492;
  const row2Y = 457;
  const row3Y = 422;

  drawMiniIcon(page, 78, row1Y - 11, "B", bold);
  drawLabelValue(page, "Bokningsnummer", bookingNumber, leftX, row1Y, font, bold, 135);

  drawMiniIcon(page, 78, row2Y - 11, "I", bold);
  drawLabelValue(page, "Boknings-ID", bookingId, leftX, row2Y, font, bold, 135);

  drawMiniIcon(page, 78, row3Y - 11, "D", bold);
  drawLabelValue(page, "Köpt datum", fmtDateTime(purchasedAt), leftX, row3Y, font, bold, 135);

  drawMiniIcon(page, 300, row1Y - 11, "G", bold);
  drawLabelValue(
    page,
    "Giltig för resa",
    fmtDateShort(input.departure?.departure_date),
    midX,
    row1Y,
    font,
    bold,
    140
  );

  drawMiniIcon(page, 300, row2Y - 11, "R", bold);
  drawLabelValue(page, "Resa", tripTitle, midX, row2Y, font, bold, 155);

  drawMiniIcon(page, 300, row3Y - 11, "T", bold);
  drawLabelValue(
    page,
    "Biljettyp",
    ticketTypeLabel(passengers, input.booking.passengers_count),
    midX,
    row3Y,
    font,
    bold,
    155
  );

  // Trip card
  drawCard(page, 60, 316, 475, 78, COLORS.white);
  drawSectionTitle(page, "Din resa", 75, 373, bold);

  // Left stop line
  page.drawCircle({
    x: 90,
    y: 349,
    size: 4,
    color: COLORS.teal,
  });

  page.drawLine({
    start: { x: 90, y: 346 },
    end: { x: 90, y: 328 },
    thickness: 1.4,
    color: COLORS.teal,
  });

  page.drawCircle({
    x: 90,
    y: 325,
    size: 4,
    color: COLORS.teal,
  });

  page.drawText("Från", {
    x: 110,
    y: 350,
    size: 8.5,
    font,
    color: COLORS.muted,
  });

  page.drawText(fitText(fromStop, bold, 10.5, 140), {
    x: 110,
    y: 334,
    size: 10.5,
    font: bold,
    color: COLORS.dark,
  });

  page.drawText(fitText(fromSub, font, 9, 140), {
    x: 110,
    y: 319,
    size: 9,
    font,
    color: COLORS.teal,
  });

  page.drawText(">", {
    x: 250,
    y: 335,
    size: 15,
    font: bold,
    color: COLORS.dark,
  });

  page.drawText("Till", {
    x: 302,
    y: 350,
    size: 8.5,
    font,
    color: COLORS.muted,
  });

  page.drawText(fitText(destination, bold, 10.5, 118), {
    x: 302,
    y: 334,
    size: 10.5,
    font: bold,
    color: COLORS.dark,
  });

  page.drawText("Sundra resor", {
    x: 302,
    y: 319,
    size: 9,
    font,
    color: COLORS.teal,
  });

  page.drawLine({
    start: { x: 424, y: 330 },
    end: { x: 424, y: 366 },
    thickness: 1,
    color: COLORS.border,
  });

  page.drawText("Avgångstid", {
    x: 452,
    y: 351,
    size: 8.5,
    font,
    color: COLORS.muted,
  });

  page.drawText(fmtTime(departureTime), {
    x: 452,
    y: 330,
    size: 16,
    font: bold,
    color: COLORS.dark,
  });

  if (input.departure?.return_time) {
    page.drawText(`Retur ${fmtTime(input.departure.return_time)}`, {
      x: 452,
      y: 316,
      size: 8.5,
      font,
      color: COLORS.teal,
    });
  }

  // Passenger card
  drawCard(page, 60, 250, 475, 52, COLORS.white);
  drawSectionTitle(page, "Resenär", 75, 282, bold);

  drawMiniIcon(page, 78, 255, "N", bold);
  drawLabelValue(
    page,
    "Namn",
    passengerName(passengers, input.booking.customer_name),
    108,
    273,
    font,
    bold,
    140
  );

  drawMiniIcon(page, 252, 255, "R", bold);
  drawLabelValue(
    page,
    "Resenär",
    ticketTypeLabel(passengers, input.booking.passengers_count),
    282,
    273,
    font,
    bold,
    120
  );

  drawMiniIcon(page, 424, 255, "S", bold);
  drawLabelValue(page, "Säte", seats, 454, 273, font, bold, 65);

  // Payment card
  drawCard(page, 60, 145, 475, 88, COLORS.white);
  drawSectionTitle(page, "Betalning", 75, 213, bold);

  const paymentMethod =
    input.booking.payment_method ||
    (input.booking.card_last4 ? `Visa **** ${input.booking.card_last4}` : "Kort / online");

  const transactionId =
    input.booking.transaction_id ||
    input.booking.ticket_hash ||
    `TXN-${String(input.booking.id).slice(0, 10).toUpperCase()}`;

  const referenceNumber =
    input.booking.reference_number ||
    bookingNumber;

  const authorizationCode =
    input.booking.authorization_code ||
    (isPaid ? "Godkänd" : "-");

  drawMiniIcon(page, 78, 171, "B", bold);
  drawLabelValue(page, "Betalsätt", paymentMethod, 108, 196, font, bold, 125);

  drawMiniIcon(page, 252, 171, "R", bold);
  drawLabelValue(page, "Referensnummer", referenceNumber, 282, 196, font, bold, 120);

  drawMiniIcon(page, 424, 171, "T", bold);
  drawLabelValue(page, "Transaktions-ID", transactionId, 454, 196, font, bold, 65);

  drawMiniIcon(page, 78, 148, "K", bold);
  drawLabelValue(page, "Kortnummer", paymentMethod, 108, 166, font, bold, 125);

  drawMiniIcon(page, 252, 148, "G", bold);
  drawLabelValue(page, "Godkännandekod", authorizationCode, 282, 166, font, bold, 120);

  drawMiniIcon(page, 424, 148, "S", bold);
  drawLabelValue(page, "Status", paymentStatus, 454, 166, font, bold, 75);

  // Price card
  drawCard(page, 60, 73, 475, 60, COLORS.white);
  drawSectionTitle(page, "Prisspecifikation", 75, 114, bold);

  page.drawText("Pris", {
    x: 75,
    y: 96,
    size: 9,
    font,
    color: COLORS.dark,
  });

  page.drawText(money(totalAmount, currency), {
    x: 446,
    y: 96,
    size: 9,
    font,
    color: COLORS.dark,
  });

  page.drawText("Varav moms (6,00%)", {
    x: 75,
    y: 81,
    size: 9,
    font,
    color: COLORS.dark,
  });

  page.drawText(vat == null ? "-" : money(vat, currency), {
    x: 456,
    y: 81,
    size: 9,
    font,
    color: COLORS.dark,
  });

  page.drawLine({
    start: { x: 75, y: 69 },
    end: { x: 520, y: 69 },
    thickness: 0.8,
    color: COLORS.softBorder,
  });

  page.drawText("SUMMA", {
    x: 75,
    y: 54,
    size: 12,
    font: bold,
    color: COLORS.dark,
  });

  page.drawText(money(totalAmount, currency), {
    x: 445,
    y: 54,
    size: 12,
    font: bold,
    color: COLORS.dark,
  });

  // Important box
  drawRoundedRect(page, 60, 30, 475, 27, 7, {
    color: COLORS.paleBlue,
    borderColor: COLORS.border,
    borderWidth: 1,
  });

  page.drawCircle({
    x: 84,
    y: 43.5,
    size: 7,
    borderColor: COLORS.teal,
    borderWidth: 1.4,
  });

  page.drawText("Viktigt:", {
    x: 106,
    y: 39,
    size: 9,
    font: bold,
    color: COLORS.teal,
  });

  page.drawText("Detta kvitto gäller för den bokade resan. Visa QR-koden vid påstigning.", {
    x: 144,
    y: 39,
    size: 8.5,
    font,
    color: COLORS.muted,
  });

  // Footer
  page.drawLine({
    start: { x: 40, y: 22 },
    end: { x: 555, y: 22 },
    thickness: 0.8,
    color: COLORS.border,
  });

  page.drawText("Helsingbuss AB  -  info@helsingbuss.se  -  helsingbuss.se", {
    x: 40,
    y: 10,
    size: 8.5,
    font,
    color: COLORS.muted,
  });

  page.drawText("Res tillsammans. Upplev mer. Vi kör.", {
    x: 378,
    y: 10,
    size: 8.5,
    font: bold,
    color: COLORS.teal,
  });

  const pdfBytes = await pdf.save();
  return Buffer.from(pdfBytes);
}
