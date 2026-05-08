import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
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
  };

  trip?: {
    id?: string | null;
    title?: string | null;
    destination?: string | null;
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

function money(value?: number | null, currency = "SEK") {
  if (value == null) return "—";
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function fmtDate(date?: string | null) {
  if (!date) return "—";
  try {
    return new Intl.DateTimeFormat("sv-SE", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date(`${date}T00:00:00`));
  } catch {
    return date;
  }
}

function fmtTime(time?: string | null) {
  if (!time) return "—";
  return String(time).slice(0, 5);
}

function paymentLabel(status?: string | null) {
  switch (status) {
    case "paid":
      return "BETALD";
    case "pending":
    case "pending_payment":
      return "INVÄNTAR BETALNING";
    case "unpaid":
      return "OBETALD";
    default:
      return status || "OKÄND";
  }
}

async function tryReadPublicFile(filePath: string) {
  try {
    return await fs.readFile(path.join(process.cwd(), "public", filePath));
  } catch {
    return null;
  }
}

export async function generateSundraTicketPdf(input: GenerateTicketInput) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([842, 595]);
  const { width, height } = page.getSize();

  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const navy = rgb(0.098, 0.298, 0.4);
  const dark = rgb(0.05, 0.09, 0.16);
  const muted = rgb(0.38, 0.45, 0.55);
  const lightBg = rgb(0.965, 0.975, 0.985);
  const pageBg = rgb(0.96, 0.955, 0.94);
  const white = rgb(1, 1, 1);

  page.drawRectangle({ x: 0, y: 0, width, height, color: pageBg });

  page.drawRectangle({
    x: 28,
    y: 28,
    width: width - 56,
    height: height - 56,
    color: white,
  });

  page.drawRectangle({
    x: 28,
    y: height - 138,
    width: width - 56,
    height: 110,
    color: navy,
  });

  const helsingLogoBytes =
    (await tryReadPublicFile("branding/helsingbuss-logo.png")) ||
    (await tryReadPublicFile("mork_logo.png"));

  const sundraLogoBytes = await tryReadPublicFile(
    "branding/sundra-logo.png"
  );

  if (helsingLogoBytes) {
    const logo = await pdf.embedPng(helsingLogoBytes);
    page.drawImage(logo, {
      x: 52,
      y: height - 92,
      width: 160,
      height: 42,
    });
  } else {
    page.drawText("HELSINGBUSS", {
      x: 52,
      y: height - 76,
      size: 22,
      font: bold,
      color: white,
    });
  }

  if (sundraLogoBytes) {
    const logo = await pdf.embedPng(sundraLogoBytes);
    page.drawImage(logo, {
      x: width - 210,
      y: height - 96,
      width: 150,
      height: 48,
    });
  } else {
    page.drawText("SUNDRA", {
      x: width - 180,
      y: height - 76,
      size: 22,
      font: bold,
      color: white,
    });
  }

  page.drawText("RESEBILJETT", {
    x: 52,
    y: height - 118,
    size: 12,
    font,
    color: rgb(0.88, 0.94, 1),
  });

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
    width: 300,
  });

  const qrImage = await pdf.embedPng(
    Buffer.from(qrDataUrl.split(",")[1], "base64")
  );

  page.drawRectangle({
    x: width - 188,
    y: height - 248,
    width: 126,
    height: 126,
    color: white,
  });

  page.drawImage(qrImage, {
    x: width - 180,
    y: height - 240,
    width: 110,
    height: 110,
  });

  page.drawText("Skanna vid ombordstigning", {
    x: width - 195,
    y: height - 260,
    size: 9,
    font,
    color: muted,
  });

  page.drawText(input.trip?.title || "Sundra-resa", {
    x: 52,
    y: height - 180,
    size: 28,
    font: bold,
    color: dark,
  });

  page.drawText(input.trip?.destination || "—", {
    x: 52,
    y: height - 208,
    size: 14,
    font,
    color: muted,
  });

  const status = paymentLabel(input.booking.payment_status);

  page.drawRectangle({
    x: 52,
    y: height - 255,
    width: 180,
    height: 34,
    color:
      input.booking.payment_status === "paid"
        ? rgb(0.86, 0.96, 0.9)
        : rgb(1, 0.94, 0.82),
  });

  page.drawText(status, {
    x: 66,
    y: height - 244,
    size: 12,
    font: bold,
    color:
      input.booking.payment_status === "paid"
        ? rgb(0.05, 0.45, 0.2)
        : rgb(0.75, 0.42, 0.05),
  });

  page.drawRectangle({
    x: 52,
    y: height - 392,
    width: width - 104,
    height: 112,
    color: lightBg,
  });

  const yTop = height - 313;
  const col1 = 72;
  const col2 = 300;
  const col3 = 535;

  drawInfo(page, "Bokningsnummer", input.booking.booking_number || "—", col1, yTop, font, bold);
  drawInfo(page, "Beställare", input.booking.customer_name || "—", col1, yTop - 54, font, bold);

  drawInfo(
    page,
    "Avresa",
    `${fmtDate(input.departure?.departure_date)} kl. ${fmtTime(
      input.departure?.departure_time
    )}`,
    col2,
    yTop,
    font,
    bold
  );

  drawInfo(
    page,
    "Retur",
    `${fmtDate(input.departure?.return_date)} kl. ${fmtTime(
      input.departure?.return_time
    )}`,
    col2,
    yTop - 54,
    font,
    bold
  );

  drawInfo(
    page,
    "Resenärer",
    `${input.booking.passengers_count || input.passengers?.length || 0} st`,
    col3,
    yTop,
    font,
    bold
  );

  drawInfo(
    page,
    "Totalbelopp",
    money(input.booking.total_amount, input.booking.currency || "SEK"),
    col3,
    yTop - 54,
    font,
    bold
  );

  let currentY = height - 430;

  page.drawText("RESENÄRER", {
    x: 52,
    y: currentY,
    size: 15,
    font: bold,
    color: navy,
  });

  currentY -= 25;

  if (!input.passengers?.length) {
    page.drawText("Inga resenärer registrerade ännu.", {
      x: 52,
      y: currentY,
      size: 12,
      font,
      color: muted,
    });
    currentY -= 22;
  } else {
    input.passengers.slice(0, 8).forEach((p, index) => {
      const name =
        `${p.first_name || ""} ${p.last_name || ""}`.trim() || "—";

      const seatText = p.seat_number ? ` • Plats ${p.seat_number}` : "";

      page.drawText(
        `${index + 1}. ${name} (${p.passenger_type || "Vuxen"})${seatText}`,
        {
          x: 52,
          y: currentY,
          size: 12,
          font,
          color: dark,
        }
      );

      currentY -= 20;
    });

    if (input.passengers.length > 8) {
      page.drawText(`+ ${input.passengers.length - 8} fler resenärer`, {
        x: 52,
        y: currentY,
        size: 11,
        font,
        color: muted,
      });
    }
  }

  page.drawRectangle({
    x: width - 284,
    y: 70,
    width: 220,
    height: 80,
    color: navy,
  });

  page.drawText("VIKTIGT", {
    x: width - 260,
    y: 125,
    size: 11,
    font: bold,
    color: rgb(0.85, 0.92, 1),
  });

  page.drawText("Visa denna biljett vid ombordstigning.", {
    x: width - 260,
    y: 104,
    size: 10,
    font,
    color: white,
  });

  page.drawText("QR-koden kontrolleras mot rätt resa och avgång.", {
    x: width - 260,
    y: 88,
    size: 9,
    font,
    color: rgb(0.9, 0.95, 1),
  });

  page.drawText(
    "Sundra by Helsingbuss • helsingbuss.se • info@helsingbuss.se • 010–405 38 38",
    {
      x: 52,
      y: 46,
      size: 10,
      font,
      color: muted,
    }
  );

  const pdfBytes = await pdf.save();
  return Buffer.from(pdfBytes);
}

function drawInfo(
  page: any,
  label: string,
  value: string,
  x: number,
  y: number,
  font: any,
  bold: any
) {
  page.drawText(label.toUpperCase(), {
    x,
    y,
    size: 9,
    font,
    color: rgb(0.38, 0.45, 0.55),
  });

  page.drawText(value, {
    x,
    y: y - 18,
    size: 12,
    font: bold,
    color: rgb(0.05, 0.09, 0.16),
  });
}
