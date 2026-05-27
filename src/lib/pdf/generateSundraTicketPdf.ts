import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import QRCode from "qrcode";

type AnyObj = Record<string, any>;

function clean(value: any, fallback = "") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function money(value: any, currency = "SEK") {
  const amount = Number(value || 0);

  return `${amount.toLocaleString("sv-SE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currency || "SEK"}`;
}

function dateText(value: any) {
  if (!value) return "Ej angivet";

  try {
    return new Intl.DateTimeFormat("sv-SE", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(value));
  } catch {
    return String(value);
  }
}

function timeText(value: any) {
  if (!value) return "Ej angivet";
  return String(value).slice(0, 5);
}

function truncate(text: string, max = 36) {
  if (!text) return "";
  return text.length > max ? text.slice(0, max - 1) + "…" : text;
}

function getBooking(input: AnyObj) {
  return input?.booking || input || {};
}

function getTrip(input: AnyObj, booking: AnyObj) {
  return input?.trip || booking?.sundra_trips || booking?.trip || {};
}

function getDeparture(input: AnyObj, booking: AnyObj) {
  return input?.departure || booking?.sundra_departures || booking?.departure || {};
}

function getPassengers(input: AnyObj, booking: AnyObj) {
  const passengers =
    input?.passengers ||
    booking?.sundra_booking_passengers ||
    booking?.passengers_list ||
    [];

  return Array.isArray(passengers) ? passengers : [];
}

function firstPassengerName(passengers: AnyObj[], booking: AnyObj) {
  const p = passengers[0] || {};

  const name =
    clean(p.name) ||
    clean(p.passenger_name) ||
    [p.first_name, p.last_name].filter(Boolean).join(" ").trim();

  return name || clean(booking.customer_name, "Resenär");
}

function seatText(passengers: AnyObj[], booking: AnyObj) {
  const seats = passengers
    .map((p) => clean(p.seat_number || p.seat || p.seatNumber))
    .filter(Boolean);

  const bookingSeats = clean(booking.seat_numbers || booking.seat_number || booking.seat);

  if (seats.length) return seats.join(", ");
  if (bookingSeats) return bookingSeats;

  return "Automatiskt tilldelas";
}

function totalPrice(booking: AnyObj) {
  return (
    booking.ticket_total_price ||
    booking.total_price ||
    booking.total_amount ||
    booking.amount ||
    booking.price ||
    0
  );
}

function drawRoundRect(page: any, x: number, y: number, w: number, h: number, color: any, borderColor?: any) {
  page.drawRectangle({
    x,
    y,
    width: w,
    height: h,
    color,
    borderColor,
    borderWidth: borderColor ? 0.8 : 0,
  });
}

function drawLabelValue({
  page,
  font,
  bold,
  x,
  y,
  label,
  value,
  max = 34,
}: {
  page: any;
  font: any;
  bold: any;
  x: number;
  y: number;
  label: string;
  value: string;
  max?: number;
}) {
  page.drawText(label.toUpperCase(), {
    x,
    y,
    size: 6.8,
    font: bold,
    color: rgb(0.0, 0.38, 0.36),
  });

  page.drawText(truncate(value || "Ej angivet", max), {
    x,
    y: y - 12,
    size: 9.2,
    font: bold,
    color: rgb(0.05, 0.09, 0.16),
  });
}

export async function generateSundraTicketPdf(input: AnyObj): Promise<Uint8Array> {
  const booking = getBooking(input);
  const trip = getTrip(input, booking);
  const departure = getDeparture(input, booking);
  const passengers = getPassengers(input, booking);

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]);

  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const dark = rgb(0.04, 0.14, 0.20);
  const teal = rgb(0.0, 0.38, 0.36);
  const soft = rgb(0.95, 0.98, 0.98);
  const border = rgb(0.77, 0.88, 0.90);
  const orange = rgb(0.96, 0.59, 0.11);

  const margin = 42;
  const pageW = 595.28;

  const bookingNumber = clean(booking.booking_number || booking.bookingNumber, clean(booking.id, "Saknas"));
  const bookingId = clean(booking.id || booking.booking_id, "");
  const currency = clean(booking.currency, "SEK");
  const price = totalPrice(booking);
  const paid = clean(booking.payment_status).toLowerCase() === "paid";
  const status = paid ? "Betalning godkänd" : clean(booking.payment_status || booking.status, "Ej betald");

  const tripTitle = clean(trip.title || booking.trip_title, "Sundra resa");
  const destination = clean(trip.destination || booking.destination || departure.destination, "Destination ej angiven");
  const pickup = clean(
    booking.pickup_place ||
      booking.departure_place ||
      departure.pickup_place ||
      departure.departure_location,
    "Vald hållplats"
  );

  const travelDate = dateText(departure.departure_date || booking.travel_date || booking.departure_date);
  const travelTime = timeText(departure.departure_time || booking.travel_time || booking.departure_time);

  const passengerName = firstPassengerName(passengers, booking);
  const seats = seatText(passengers, booking);
  const passengerCount =
    Number(booking.passengers_count || booking.passenger_count || booking.passengers || passengers.length || 1) || 1;

  const qrData = bookingNumber || bookingId;
  const qrPng = await QRCode.toDataURL(qrData, {
    margin: 1,
    width: 260,
    errorCorrectionLevel: "M",
  });

  const qrBytes = Buffer.from(qrPng.split(",")[1], "base64");
  const qrImage = await pdf.embedPng(qrBytes);

  // Background
  page.drawRectangle({
    x: 0,
    y: 0,
    width: 595.28,
    height: 841.89,
    color: rgb(0.965, 0.965, 0.94),
  });

  // Header
  page.drawRectangle({
    x: margin,
    y: 700,
    width: pageW - margin * 2,
    height: 100,
    color: dark,
  });

  page.drawText("Helsingbuss", {
    x: margin + 24,
    y: 758,
    size: 25,
    font: bold,
    color: rgb(0.92, 0.97, 1),
  });

  page.drawText("Sundra resor", {
    x: margin + 26,
    y: 735,
    size: 10,
    font: regular,
    color: rgb(0.82, 0.96, 0.92),
  });

  page.drawLine({
    start: { x: margin, y: 720 },
    end: { x: pageW - margin, y: 736 },
    thickness: 1.4,
    color: orange,
  });

  page.drawLine({
    start: { x: margin, y: 708 },
    end: { x: pageW - margin, y: 724 },
    thickness: 1,
    color: rgb(0.45, 0.9, 0.83),
  });

  page.drawText("SÄTE / SEAT", {
    x: 443,
    y: 764,
    size: 8,
    font: bold,
    color: rgb(1, 1, 1),
  });

  page.drawText(truncate(seats, 15), {
    x: 443,
    y: 742,
    size: 19,
    font: bold,
    color: rgb(1, 1, 1),
  });

  // Intro card
  page.drawRectangle({
    x: margin,
    y: 660,
    width: pageW - margin * 2,
    height: 70,
    color: rgb(0.035, 0.13, 0.18),
  });

  page.drawText("Biljett", {
    x: margin + 24,
    y: 695,
    size: 24,
    font: bold,
    color: rgb(1, 1, 1),
  });

  page.drawText("Bokningsbekräftelse", {
    x: margin + 24,
    y: 675,
    size: 12,
    font: bold,
    color: rgb(0.55, 0.95, 0.90),
  });

  page.drawText("Tack för din bokning med Sundra resor. Visa QR-koden vid påstigning.", {
    x: margin + 24,
    y: 660,
    size: 8,
    font: regular,
    color: rgb(0.84, 0.9, 0.92),
  });

  // QR box
  page.drawRectangle({
    x: 418,
    y: 637,
    width: 94,
    height: 94,
    color: rgb(1, 1, 1),
    borderColor: orange,
    borderWidth: 1.2,
  });

  page.drawImage(qrImage, {
    x: 428,
    y: 647,
    width: 74,
    height: 74,
  });

  // Info rows
  drawRoundRect(page, margin + 24, 580, pageW - margin * 2 - 48, 55, rgb(1, 1, 1), border);

  drawLabelValue({
    page,
    font: regular,
    bold,
    x: margin + 42,
    y: 615,
    label: "Bokningsnummer",
    value: bookingNumber,
  });

  drawLabelValue({
    page,
    font: regular,
    bold,
    x: margin + 190,
    y: 615,
    label: "Giltig för resa",
    value: travelDate,
  });

  drawLabelValue({
    page,
    font: regular,
    bold,
    x: margin + 335,
    y: 615,
    label: "Resa",
    value: tripTitle,
    max: 28,
  });

  drawLabelValue({
    page,
    font: regular,
    bold,
    x: margin + 42,
    y: 590,
    label: "Boknings-ID",
    value: bookingId || bookingNumber,
    max: 18,
  });

  drawLabelValue({
    page,
    font: regular,
    bold,
    x: margin + 190,
    y: 590,
    label: "Biljettyp",
    value: `${passengerCount} Vuxen`,
  });

  drawLabelValue({
    page,
    font: regular,
    bold,
    x: margin + 335,
    y: 590,
    label: "Status",
    value: status,
  });

  // DIN RESA
  drawRoundRect(page, margin + 24, 482, pageW - margin * 2 - 48, 78, soft, border);

  page.drawText("DIN RESA", {
    x: margin + 40,
    y: 538,
    size: 8,
    font: bold,
    color: teal,
  });

  drawLabelValue({
    page,
    font: regular,
    bold,
    x: margin + 40,
    y: 515,
    label: "Från",
    value: pickup,
    max: 28,
  });

  drawLabelValue({
    page,
    font: regular,
    bold,
    x: margin + 220,
    y: 515,
    label: "Till",
    value: destination,
    max: 30,
  });

  drawLabelValue({
    page,
    font: regular,
    bold,
    x: margin + 405,
    y: 515,
    label: "Avgångstid",
    value: travelTime,
  });

  page.drawText(`Retur: ${timeText(departure.return_time || booking.return_time)}`, {
    x: margin + 405,
    y: 490,
    size: 7.5,
    font: regular,
    color: teal,
  });

  // RESENÄR
  drawRoundRect(page, margin + 24, 405, pageW - margin * 2 - 48, 58, rgb(1, 1, 1), border);

  page.drawText("RESENÄR", {
    x: margin + 40,
    y: 443,
    size: 8,
    font: bold,
    color: teal,
  });

  drawLabelValue({
    page,
    font: regular,
    bold,
    x: margin + 40,
    y: 424,
    label: "Namn",
    value: passengerName,
    max: 30,
  });

  drawLabelValue({
    page,
    font: regular,
    bold,
    x: margin + 235,
    y: 424,
    label: "Resenär",
    value: `${passengerCount} Vuxen`,
  });

  drawLabelValue({
    page,
    font: regular,
    bold,
    x: margin + 405,
    y: 424,
    label: "Säte",
    value: seats,
    max: 16,
  });

  // BETALNING
  drawRoundRect(page, margin + 24, 310, pageW - margin * 2 - 48, 78, rgb(1, 1, 1), border);

  page.drawText("BETALNING", {
    x: margin + 40,
    y: 366,
    size: 8,
    font: bold,
    color: teal,
  });

  drawLabelValue({
    page,
    font: regular,
    bold,
    x: margin + 40,
    y: 344,
    label: "Betalsätt",
    value: clean(booking.payment_provider, "Kort / online"),
  });

  drawLabelValue({
    page,
    font: regular,
    bold,
    x: margin + 210,
    y: 344,
    label: "Referensnummer",
    value: clean(booking.payment_reference, bookingNumber),
  });

  drawLabelValue({
    page,
    font: regular,
    bold,
    x: margin + 385,
    y: 344,
    label: "Transaktions-ID",
    value: clean(booking.transaction_id || booking.payment_transaction_id, "TXN-" + bookingNumber),
    max: 18,
  });

  drawLabelValue({
    page,
    font: regular,
    bold,
    x: margin + 40,
    y: 318,
    label: "Kontroll",
    value: paid ? "Godkänd" : "Ej godkänd",
  });

  drawLabelValue({
    page,
    font: regular,
    bold,
    x: margin + 210,
    y: 318,
    label: "Godkännandekod",
    value: paid ? "Godkänd" : "Saknas",
  });

  drawLabelValue({
    page,
    font: regular,
    bold,
    x: margin + 385,
    y: 318,
    label: "Status",
    value: status,
  });

  // PRIS
  drawRoundRect(page, margin + 24, 230, pageW - margin * 2 - 48, 58, rgb(1, 1, 1), border);

  page.drawText("PRISSPECIFIKATION", {
    x: margin + 40,
    y: 268,
    size: 8,
    font: bold,
    color: teal,
  });

  page.drawText("Pris", {
    x: margin + 40,
    y: 248,
    size: 8.2,
    font: regular,
    color: rgb(0.05, 0.09, 0.16),
  });

  page.drawText(money(price, currency), {
    x: 420,
    y: 248,
    size: 9,
    font: bold,
    color: rgb(0.05, 0.09, 0.16),
  });

  page.drawText("Varav moms (6,00%)", {
    x: margin + 40,
    y: 235,
    size: 7.6,
    font: regular,
    color: rgb(0.27, 0.35, 0.45),
  });

  page.drawText(money(Number(price || 0) * 0.0566, currency), {
    x: 420,
    y: 235,
    size: 8,
    font: regular,
    color: rgb(0.27, 0.35, 0.45),
  });

  drawRoundRect(page, margin + 24, 185, pageW - margin * 2 - 48, 34, rgb(0.98, 1, 1), border);

  page.drawText("SUMMA", {
    x: margin + 40,
    y: 202,
    size: 11,
    font: bold,
    color: rgb(0.05, 0.09, 0.16),
  });

  page.drawText(money(price, currency), {
    x: 407,
    y: 202,
    size: 12,
    font: bold,
    color: rgb(0.05, 0.09, 0.16),
  });

  // Footer
  page.drawRectangle({
    x: margin,
    y: 55,
    width: pageW - margin * 2,
    height: 26,
    color: rgb(1, 1, 1),
  });

  page.drawText("Helsingbuss AB  ·  info@helsingbuss.se  ·  helsingbuss.se", {
    x: margin + 12,
    y: 65,
    size: 7,
    font: regular,
    color: rgb(0.42, 0.51, 0.62),
  });

  page.drawText("Res tillsammans. Upplev mer. Vi kör.", {
    x: 382,
    y: 65,
    size: 7,
    font: bold,
    color: teal,
  });

  return await pdf.save();
}

export default generateSundraTicketPdf;
