import { PDFDocument, PDFPage, PDFFont, RGB, rgb, StandardFonts } from "pdf-lib";
import QRCode from "qrcode";

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
    created_at?: string | null;
    purchased_at?: string | null;
    payment_method?: string | null;
    card_last4?: string | null;
    transaction_id?: string | null;
    reference_number?: string | null;
    authorization_code?: string | null;
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

const PAGE_W = 595;
const PAGE_H = 842;
const S = PAGE_W / 1024;

const C = {
  pageBg: rgb(0.965, 0.963, 0.945),
  white: rgb(1, 1, 1),
  navy: rgb(0.025, 0.105, 0.165),
  navy2: rgb(0.03, 0.13, 0.19),
  dark: rgb(0.045, 0.085, 0.14),
  muted: rgb(0.35, 0.43, 0.54),
  teal: rgb(0.02, 0.38, 0.36),
  teal2: rgb(0.02, 0.50, 0.44),
  mint: rgb(0.64, 0.90, 0.84),
  gold: rgb(1, 0.70, 0.28),
  border: rgb(0.82, 0.88, 0.92),
  softBorder: rgb(0.89, 0.93, 0.95),
  cardBg: rgb(0.965, 0.982, 0.988),
  importantBg: rgb(0.93, 0.975, 0.985),
};

function p(v: number) {
  return v * S;
}

function yBase(y: number) {
  return PAGE_H - p(y);
}

function yRect(y: number, h: number) {
  return PAGE_H - p(y + h);
}

function pt(x: number, y: number) {
  return { x: p(x), y: yBase(y) };
}

function cleanText(value?: string | number | null) {
  return String(value ?? "-")
    .replace(/\u00c3\u00a5/g, "\u00e5")
    .replace(/\u00c3\u00a4/g, "\u00e4")
    .replace(/\u00c3\u00b6/g, "\u00f6")
    .replace(/\u00c3\u0085/g, "\u00c5")
    .replace(/\u00c3\u0084/g, "\u00c4")
    .replace(/\u00c3\u0096/g, "\u00d6")
    .replace(/\u00e2\u20ac\u201c/g, "-")
    .replace(/\u00e2\u20ac\u2122/g, "'")
    .replace(/\u2013/g, "-")
    .replace(/\u2014/g, "-")
    .replace(/\u2019/g, "'")
    .replace(/\u00a0/g, " ");
}

function money(value?: number | null, currency = "SEK") {
  if (value == null) return "-";

  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value));
}

function fmtDate(date?: string | null) {
  if (!date) return "-";
  return String(date).slice(0, 10);
}

function fmtTime(time?: string | null) {
  if (!time) return "-";
  return String(time).slice(0, 5);
}

function fmtDateTime(value?: string | null) {
  if (!value) return "-";

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);

  return new Intl.DateTimeFormat("sv-SE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
    .format(d)
    .replace(",", "");
}

function paymentLabel(status?: string | null) {
  switch (status) {
    case "paid":
    case "completed":
    case "succeeded":
      return "Betalning godk\u00e4nd";
    case "pending":
    case "pending_payment":
      return "Inv\u00e4ntar betalning";
    case "unpaid":
      return "Obetald";
    case "failed":
      return "Betalning misslyckades";
    default:
      return status || "Ok\u00e4nd";
  }
}

function passengerName(passengers: Passenger[], fallback?: string | null) {
  if (!passengers.length) return cleanText(fallback || "-");

  const first = passengers[0];
  const name = cleanText(`${first.first_name || ""} ${first.last_name || ""}`.trim());

  if (!name || name === "-") return cleanText(fallback || "-");
  if (passengers.length === 1) return name;

  return `${name} + ${passengers.length - 1} till`;
}

function ticketTypeLabel(passengers: Passenger[], count?: number | null) {
  if (!passengers.length) return `${count || 1} Vuxen`;

  const grouped = passengers.reduce<Record<string, number>>((acc, passenger) => {
    const type = cleanText(passenger.passenger_type || "Vuxen");
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});

  return Object.entries(grouped)
    .map(([type, amount]) => `${amount} ${type}`)
    .join(", ");
}

function seatSummary(passengers: Passenger[]) {
  const seats = passengers
    .map((passenger) => cleanText(passenger.seat_number || ""))
    .filter(Boolean)
    .map((seat) => {
      const lower = seat.toLowerCase();

      if (lower.includes("automat")) return "Ej valt";
      if (lower.includes("till")) return "Ej valt";
      if (seat.length > 8) return "Ej valt";

      return seat;
    });

  if (!seats.length) return "Ej valt";

  const unique = Array.from(new Set(seats));

  if (unique.length === 1) return unique[0];
  if (unique.length > 2) return `${unique.length} s\u00e4ten`;

  return unique.join(", ");
}

function vatIncluded(total?: number | null) {
  if (total == null) return null;
  const value = Number(total);
  return value - value / 1.06;
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

function roundRect(
  page: PDFPage,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  options: {
    color?: RGB;
    borderColor?: RGB;
    borderWidth?: number;
  }
) {
  page.drawSvgPath(roundedRectPath(p(w), p(h), p(r)), {
    x: p(x),
    y: yRect(y, h),
    color: options.color,
    borderColor: options.borderColor,
    borderWidth: options.borderWidth ? p(options.borderWidth) : undefined,
  });
}

function card(page: PDFPage, x: number, y: number, w: number, h: number, fill = C.white) {
  roundRect(page, x, y, w, h, 12, {
    color: fill,
    borderColor: C.border,
    borderWidth: 1.5,
  });
}

function fitText(text: string, font: PDFFont, sizePx: number, maxWidthPx: number) {
  const size = p(sizePx);
  const maxWidth = p(maxWidthPx);
  const value = cleanText(text);

  if (font.widthOfTextAtSize(value, size) <= maxWidth) return value;

  let out = value;

  while (out.length > 3 && font.widthOfTextAtSize(`${out}...`, size) > maxWidth) {
    out = out.slice(0, -1);
  }

  return `${out}...`;
}

function fitFontSize(text: string, font: PDFFont, startPx: number, minPx: number, maxWidthPx: number) {
  let sizePx = startPx;
  const value = cleanText(text);

  while (sizePx > minPx && font.widthOfTextAtSize(value, p(sizePx)) > p(maxWidthPx)) {
    sizePx -= 1;
  }

  return sizePx;
}

function text(
  page: PDFPage,
  value: string,
  x: number,
  y: number,
  sizePx: number,
  font: PDFFont,
  color: RGB,
  maxWidthPx?: number
) {
  const finalValue =
    maxWidthPx != null ? fitText(value, font, sizePx, maxWidthPx) : cleanText(value);

  page.drawText(finalValue, {
    x: p(x),
    y: yBase(y),
    size: p(sizePx),
    font,
    color,
  });
}

function centerText(
  page: PDFPage,
  value: string,
  x: number,
  y: number,
  w: number,
  sizePx: number,
  font: PDFFont,
  color: RGB
) {
  const finalValue = cleanText(value);
  const size = p(sizePx);
  const width = font.widthOfTextAtSize(finalValue, size);

  page.drawText(finalValue, {
    x: p(x) + (p(w) - width) / 2,
    y: yBase(y),
    size,
    font,
    color,
  });
}

function rightText(
  page: PDFPage,
  value: string,
  rightX: number,
  y: number,
  sizePx: number,
  font: PDFFont,
  color: RGB
) {
  const finalValue = cleanText(value);
  const size = p(sizePx);
  const width = font.widthOfTextAtSize(finalValue, size);

  page.drawText(finalValue, {
    x: p(rightX) - width,
    y: yBase(y),
    size,
    font,
    color,
  });
}

function line(page: PDFPage, x1: number, y1: number, x2: number, y2: number, color: RGB, width = 1) {
  page.drawLine({
    start: pt(x1, y1),
    end: pt(x2, y2),
    thickness: p(width),
    color,
  });
}

function circle(page: PDFPage, x: number, y: number, size: number, color?: RGB, borderColor?: RGB, borderWidth = 1) {
  page.drawCircle({
    x: p(x),
    y: yBase(y),
    size: p(size),
    color,
    borderColor,
    borderWidth: borderColor ? p(borderWidth) : undefined,
  });
}

function icon(page: PDFPage, x: number, y: number, type: string) {
  const stroke = C.teal;
  const sw = 1.7;

  if (type === "calendar") {
    line(page, x + 4, y + 7, x + 20, y + 7, stroke, sw);
    line(page, x + 4, y + 7, x + 4, y + 21, stroke, sw);
    line(page, x + 20, y + 7, x + 20, y + 21, stroke, sw);
    line(page, x + 4, y + 21, x + 20, y + 21, stroke, sw);
    line(page, x + 8, y + 4, x + 8, y + 9, stroke, sw);
    line(page, x + 16, y + 4, x + 16, y + 9, stroke, sw);
    return;
  }

  if (type === "id") {
    line(page, x + 4, y + 5, x + 20, y + 5, stroke, sw);
    line(page, x + 4, y + 5, x + 4, y + 21, stroke, sw);
    line(page, x + 20, y + 5, x + 20, y + 21, stroke, sw);
    line(page, x + 4, y + 21, x + 20, y + 21, stroke, sw);
    circle(page, x + 9, y + 11, 2.2, undefined, stroke, sw);
    line(page, x + 13, y + 11, x + 18, y + 11, stroke, sw);
    line(page, x + 8, y + 16, x + 18, y + 16, stroke, sw);
    return;
  }

  if (type === "clock") {
    circle(page, x + 12, y + 13, 8.5, undefined, stroke, sw);
    line(page, x + 12, y + 13, x + 12, y + 8, stroke, sw);
    line(page, x + 12, y + 13, x + 17, y + 13, stroke, sw);
    return;
  }

  if (type === "bus") {
    line(page, x + 5, y + 7, x + 19, y + 7, stroke, sw);
    line(page, x + 5, y + 7, x + 5, y + 18, stroke, sw);
    line(page, x + 19, y + 7, x + 19, y + 18, stroke, sw);
    line(page, x + 5, y + 18, x + 19, y + 18, stroke, sw);
    line(page, x + 8, y + 11, x + 16, y + 11, stroke, sw);
    circle(page, x + 8, y + 20, 1.8, stroke);
    circle(page, x + 16, y + 20, 1.8, stroke);
    return;
  }

  if (type === "ticket") {
    line(page, x + 5, y + 8, x + 19, y + 8, stroke, sw);
    line(page, x + 5, y + 8, x + 5, y + 18, stroke, sw);
    line(page, x + 19, y + 8, x + 19, y + 18, stroke, sw);
    line(page, x + 5, y + 18, x + 19, y + 18, stroke, sw);
    line(page, x + 10, y + 8, x + 10, y + 18, stroke, 1.2);
    return;
  }

  if (type === "person") {
    circle(page, x + 12, y + 8, 4, undefined, stroke, sw);
    line(page, x + 5, y + 22, x + 8, y + 16, stroke, sw);
    line(page, x + 8, y + 16, x + 16, y + 16, stroke, sw);
    line(page, x + 16, y + 16, x + 19, y + 22, stroke, sw);
    return;
  }

  if (type === "seat") {
    line(page, x + 8, y + 6, x + 8, y + 18, stroke, sw);
    line(page, x + 8, y + 14, x + 17, y + 14, stroke, sw);
    line(page, x + 17, y + 14, x + 19, y + 20, stroke, sw);
    line(page, x + 8, y + 20, x + 20, y + 20, stroke, sw);
    return;
  }

  if (type === "card") {
    line(page, x + 4, y + 8, x + 20, y + 8, stroke, sw);
    line(page, x + 4, y + 8, x + 4, y + 19, stroke, sw);
    line(page, x + 20, y + 8, x + 20, y + 19, stroke, sw);
    line(page, x + 4, y + 19, x + 20, y + 19, stroke, sw);
    line(page, x + 4, y + 12, x + 20, y + 12, stroke, sw);
    return;
  }

  if (type === "receipt") {
    line(page, x + 7, y + 5, x + 17, y + 5, stroke, sw);
    line(page, x + 7, y + 5, x + 7, y + 21, stroke, sw);
    line(page, x + 17, y + 5, x + 17, y + 21, stroke, sw);
    line(page, x + 7, y + 21, x + 17, y + 21, stroke, sw);
    line(page, x + 9, y + 10, x + 15, y + 10, stroke, 1.2);
    line(page, x + 9, y + 14, x + 15, y + 14, stroke, 1.2);
    line(page, x + 9, y + 18, x + 13, y + 18, stroke, 1.2);
    return;
  }

  if (type === "check") {
    circle(page, x + 12, y + 13, 8.5, undefined, stroke, sw);
    line(page, x + 8, y + 13, x + 11, y + 16, stroke, sw);
    line(page, x + 11, y + 16, x + 17, y + 9, stroke, sw);
    return;
  }

  circle(page, x + 12, y + 13, 8.5, undefined, stroke, sw);
}

function field(
  page: PDFPage,
  label: string,
  value: string,
  iconType: string,
  iconX: number,
  textX: number,
  labelY: number,
  font: PDFFont,
  bold: PDFFont,
  maxW = 190
) {
  icon(page, iconX, labelY - 18, iconType);
  text(page, label, textX, labelY, 13, font, C.muted);
  text(page, value, textX, labelY + 24, 16, bold, C.dark, maxW);
}

function sectionTitle(page: PDFPage, title: string, x: number, y: number, bold: PDFFont) {
  text(page, title.toUpperCase(), x, y, 15, bold, C.teal);
}

function wave(page: PDFPage, y: number, color: RGB, width: number, offset = 0) {
  page.drawSvgPath(
    `M 0 0 C ${p(170)} ${p(26 + offset)} ${p(265)} ${p(15 - offset)} ${p(390)} ${p(0)}
     C ${p(560)} ${p(-22)} ${p(735)} ${p(20 + offset)} ${p(1010)} ${p(-55)}`,
    {
      x: p(42),
      y: yBase(y),
      borderColor: color,
      borderWidth: p(width),
    }
  );
}

export async function generateSundraTicketPdf(input: GenerateTicketInput) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([PAGE_W, PAGE_H]);

  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const passengers = input.passengers || [];
  const seats = seatSummary(passengers);

  const bookingNumber =
    input.booking.booking_number ||
    `SUN-${String(input.booking.id).slice(0, 8).toUpperCase()}`;

  const bookingId = String(input.booking.id || "-").slice(0, 8).toUpperCase();

  const tripTitle = cleanText(input.trip?.title || "Sundra resa");
  const destination = cleanText(input.trip?.destination || "Destination ej angiven");

  const pickupName = cleanText(input.pickupStop?.stop_name || "Vald h\u00e5llplats");
  const pickupSub = cleanText(input.pickupStop?.stop_city || "Upph\u00e4mtningsplats");

  const departureTime =
    input.pickupStop?.departure_time ||
    input.departure?.departure_time ||
    null;

  const ticketHash =
    input.booking.ticket_hash ||
    `${input.booking.id}-${input.departure?.id || ""}`;

  const qrPayload = JSON.stringify({
    type: "sundra_ticket",
    booking_id: input.booking.id,
    booking_number: input.booking.booking_number,
    trip_id: input.trip?.id || null,
    departure_id: input.departure?.id || null,
    pickup_stop: pickupName,
    passengers_count: input.booking.passengers_count || passengers.length || 0,
    ticket_hash: ticketHash,
  });

  const qrDataUrl = await QRCode.toDataURL(qrPayload, {
    margin: 1,
    width: 360,
  });

  const qrImage = await pdf.embedPng(Buffer.from(qrDataUrl.split(",")[1], "base64"));

  page.drawRectangle({
    x: 0,
    y: 0,
    width: PAGE_W,
    height: PAGE_H,
    color: C.pageBg,
  });

  roundRect(page, 24, 20, 976, 1400, 14, {
    color: C.white,
  });

  // TOPPBANNER
  roundRect(page, 42, 40, 940, 221, 16, {
    color: C.navy,
  });

  wave(page, 186, C.gold, 4, 0);
  wave(page, 203, C.mint, 3, 4);
  wave(page, 222, C.teal2, 4, -2);

  text(page, "Helsingbuss", 99, 126, 61, bold, C.white);
  text(page, "Sundra resor", 100, 161, 27, font, C.mint);

  // SÄTESRUTA
  roundRect(page, 729, 89, 193, 140, 18, {
    color: C.teal,
    borderColor: C.gold,
    borderWidth: 4,
  });

  centerText(page, "S\u00c4TE / SEAT", 729, 128, 193, 19, bold, C.white);

  const seatSize = fitFontSize(seats, bold, 56, 26, 160);
  centerText(page, seats, 729, 196, 193, seatSize, bold, C.white);

  // RUBRIK + QR
  text(page, "Kvitto", 100, 343, 61, bold, C.dark);
  text(page, "Bokningsbekr\u00e4ftelse", 101, 385, 27, bold, C.teal);
  text(page, "Tack f\u00f6r din bokning med Sundra resor.", 101, 420, 16, font, C.muted);
  text(page, "Detta kvitto g\u00e4ller som bekr\u00e4ftelse f\u00f6r din resa.", 101, 443, 16, font, C.muted);

  card(page, 674, 285, 247, 195, C.white);
  centerText(page, "Visa biljett (QR-kod)", 674, 315, 247, 16, font, C.muted);

  page.drawImage(qrImage, {
    x: p(731),
    y: yRect(331, 128),
    width: p(128),
    height: p(128),
  });

  for (let x = 101; x < 922; x += 12) {
    line(page, x, 502, x + 5, 502, C.border, 1);
  }

  // BOKNINGSINFO
  card(page, 102, 520, 819, 203, C.cardBg);

  field(page, "Bokningsnummer", bookingNumber, "calendar", 132, 185, 554, font, bold, 180);
  field(page, "Boknings-ID", bookingId, "id", 132, 185, 617, font, bold, 180);
  field(
    page,
    "K\u00f6pt datum",
    fmtDateTime(input.booking.purchased_at || input.booking.created_at),
    "calendar",
    132,
    185,
    681,
    font,
    bold,
    180
  );

  field(page, "Giltig f\u00f6r resa", fmtDate(input.departure?.departure_date), "clock", 525, 578, 554, font, bold, 190);
  field(page, "Resa", tripTitle, "bus", 525, 578, 617, font, bold, 280);
  field(page, "Biljettyp", ticketTypeLabel(passengers, input.booking.passengers_count), "ticket", 525, 578, 681, font, bold, 220);

  // DIN RESA
  card(page, 102, 737, 819, 124, C.white);
  sectionTitle(page, "Din resa", 128, 765, bold);

  circle(page, 152, 791, 5, C.teal);
  line(page, 152, 797, 152, 832, C.teal, 3);
  circle(page, 152, 838, 5, C.teal);

  text(page, "Upph\u00e4mtning", 187, 792, 14, font, C.muted);
  text(page, pickupName, 187, 823, 18, bold, C.dark, 210);
  text(page, pickupSub, 187, 848, 16, font, C.teal, 210);

  text(page, "\u2192", 420, 825, 30, bold, C.dark);

  text(page, "Till", 509, 792, 14, font, C.muted);
  text(page, destination, 509, 823, 18, bold, C.dark, 190);
  text(page, "Sundra resor", 509, 848, 16, font, C.teal);

  line(page, 708, 766, 708, 840, C.border, 1.5);

  text(page, "Avg\u00e5ngstid", 759, 792, 14, font, C.muted);
  text(page, fmtTime(departureTime), 759, 829, 32, bold, C.dark);

  if (input.departure?.return_time) {
    text(page, `Retur ${fmtTime(input.departure.return_time)}`, 759, 852, 14, font, C.teal);
  }

  // RESENÄR
  card(page, 102, 877, 819, 90, C.white);
  sectionTitle(page, "Resen\u00e4r", 128, 907, bold);

  icon(page, 133, 922, "person");
  text(page, "Namn", 185, 925, 14, font, C.muted);
  text(page, passengerName(passengers, input.booking.customer_name), 185, 948, 17, bold, C.dark, 200);

  icon(page, 419, 922, "person");
  text(page, "Resen\u00e4r", 472, 925, 14, font, C.muted);
  text(page, ticketTypeLabel(passengers, input.booking.passengers_count), 472, 948, 17, bold, C.dark, 190);

  icon(page, 711, 922, "seat");
  text(page, "S\u00e4te", 766, 925, 14, font, C.muted);
  text(page, seats, 766, 948, 17, bold, C.dark, 120);

  // BETALNING
  card(page, 102, 983, 819, 145, C.white);
  sectionTitle(page, "Betalning", 128, 1014, bold);

  const paymentMethod =
    input.booking.payment_method ||
    (input.booking.card_last4 ? `Kort **** ${input.booking.card_last4}` : "Kort / online");

  const transactionId =
    input.booking.transaction_id ||
    input.booking.ticket_hash ||
    `TXN-${String(input.booking.id).slice(0, 8).toUpperCase()}`;

  const referenceNumber = input.booking.reference_number || bookingNumber;
  const authorizationCode = input.booking.authorization_code || "Godk\u00e4nd";
  const paymentStatus = paymentLabel(input.booking.payment_status);

  icon(page, 133, 1034, "card");
  text(page, "Betals\u00e4tt", 185, 1035, 14, font, C.muted);
  text(page, paymentMethod, 185, 1058, 17, bold, C.dark, 200);

  icon(page, 419, 1034, "receipt");
  text(page, "Referensnummer", 472, 1035, 14, font, C.muted);
  text(page, referenceNumber, 472, 1058, 17, bold, C.dark, 200);

  icon(page, 711, 1034, "receipt");
  text(page, "Transaktions-ID", 766, 1035, 14, font, C.muted);
  text(page, transactionId, 766, 1058, 17, bold, C.dark, 145);

  icon(page, 133, 1091, "check");
  text(page, "Kontroll", 185, 1092, 14, font, C.muted);
  text(page, authorizationCode, 185, 1115, 17, bold, C.dark, 200);

  icon(page, 419, 1091, "check");
  text(page, "Godk\u00e4nnandekod", 472, 1092, 14, font, C.muted);
  text(page, authorizationCode, 472, 1115, 17, bold, C.dark, 200);

  icon(page, 711, 1091, "clock");
  text(page, "Status", 766, 1092, 14, font, C.muted);
  text(page, paymentStatus, 766, 1115, 17, bold, C.dark, 145);

  // PRIS
  const totalAmount = input.booking.total_amount ?? null;
  const currency = input.booking.currency || "SEK";
  const vat = vatIncluded(totalAmount);

  card(page, 102, 1144, 819, 133, C.white);
  sectionTitle(page, "Prisspecifikation", 128, 1173, bold);

  text(page, "Pris", 128, 1205, 17, font, C.dark);
  rightText(page, money(totalAmount, currency), 854, 1205, 17, font, C.dark);

  text(page, "Varav moms (6,00%)", 128, 1232, 17, font, C.dark);
  rightText(page, vat == null ? "-" : money(vat, currency), 854, 1232, 17, font, C.dark);

  line(page, 128, 1248, 854, 1248, C.softBorder, 1.5);

  text(page, "SUMMA", 128, 1272, 25, bold, C.dark);
  rightText(page, money(totalAmount, currency), 854, 1272, 25, bold, C.dark);

  // VIKTIGT
  roundRect(page, 102, 1294, 819, 54, 10, {
    color: C.importantBg,
    borderColor: C.border,
    borderWidth: 1.5,
  });

  icon(page, 128, 1308, "check");
  text(page, "Viktigt:", 177, 1324, 17, bold, C.teal);
  text(page, "Detta kvitto g\u00e4ller f\u00f6r den bokade resan. Visa QR-koden vid p\u00e5stigning.", 240, 1324, 15, font, C.muted, 620);

  // FOOTER
  line(page, 66, 1370, 970, 1370, C.border, 1.5);

  text(page, "Helsingbuss AB  \u2022  info@helsingbuss.se  \u2022  helsingbuss.se", 66, 1404, 16, font, C.muted);
  rightText(page, "Res tillsammans. Upplev mer. Vi k\u00f6r.", 970, 1404, 16, bold, C.teal);

  const pdfBytes = await pdf.save();
  return Buffer.from(pdfBytes);
}