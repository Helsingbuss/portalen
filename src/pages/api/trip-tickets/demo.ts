// src/pages/api/trip-tickets/demo.ts
import type { NextApiRequest, NextApiResponse } from "next";
import {
  generateTicketPdf,
  TicketPdfData,
} from "@/lib/tickets/generateTicketPdf";

export default async function demoHandler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const now = new Date();
    const departureDate = now.toISOString().slice(0, 10);

    const validFrom = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString();
    const validTo = new Date(now.getTime() + 16 * 60 * 60 * 1000).toISOString();
    const createdAt = now.toISOString();

    const baseAmount = 3 * 29500;
    const smsPrice = 2000;
    const cancellationPrice = 3900;
    const totalAmount = baseAmount + smsPrice + cancellationPrice;
    const vatAmount = Math.round(totalAmount * 0.06);

    const qrPayloadObj = {
      v: 1,
      ticketId: "demo-ticket-id",
      orderId: "demo-order-id",
    };

    const data: TicketPdfData = {
      orderId: "demo-order-id",
      ticketId: "demo-ticket-id",
      ticketNumber: "HB-DEMO-000001",

      // RUBRIK + reseinfo
      tripTitle: "Malmö C – Gekås Ullared",
      lineName: "Linje 1 Helsingbuss (Demo)",
      operatorName: "Norra Skåne Buss AB",
      departureDate,
      departureTime: "06:00",
      returnTime: "18:00",
      departureStop: "Malmö C (Läge k)",

      customerName: "Test Kund",
      customerEmail: "test@helsingbuss.se",
      customerPhone: "0700000000",

      passengers: [
        {
          fullName: "Test Kund",
          seatNumber: "A1",
          category: "Vuxen",
          price: 29500,
        },
        {
          fullName: "Medresenär 1",
          seatNumber: "A2",
          category: "Vuxen",
          price: 29500,
        },
        {
          fullName: "Medresenär 2",
          seatNumber: "A3",
          category: "Vuxen",
          price: 29500,
        },
      ],

      currency: "SEK",
      baseAmount,
      smsTicket: true,
      smsPrice,
      cancellationProtection: true,
      cancellationPrice,
      totalAmount,
      vatAmount,

      createdAt,
      validFrom,
      validTo,
      ticketType: "shopping",

      qrPayload: JSON.stringify(qrPayloadObj),
    };

    const pdfBytes = await generateTicketPdf(data);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      'inline; filename="helsingbuss-demo-biljett.pdf"'
    );
    res.send(Buffer.from(pdfBytes));
  } catch (err: any) {
    console.error("demo ticket error", err);
    res.status(500).json({
      error: err?.message || "Failed to generate demo ticket",
    });
  }
}
