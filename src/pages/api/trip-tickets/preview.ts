// src/pages/api/trip-tickets/preview.ts
import type { NextApiRequest, NextApiResponse } from "next";
import * as admin from "@/lib/supabaseAdmin";
import {
  generateTicketPdf,
  TicketPdfData,
} from "@/lib/tickets/generateTicketPdf";

const supabase: any =
  (admin as any).supabaseAdmin ||
  (admin as any).supabase ||
  (admin as any).default;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const { orderId } = req.query;

    if (!orderId || typeof orderId !== "string") {
      return res.status(400).json({ error: "Missing orderId" });
    }

    // 1) Hämta order
    const { data: order, error: orderErr } = await supabase
      .from("trip_orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (orderErr || !order) {
      console.error("orderErr", orderErr);
      return res.status(404).json({ error: "Order not found" });
    }

    // 2) Hämta avgång
    const { data: departure, error: depErr } = await supabase
      .from("trip_departures")
      .select("*")
      .eq("id", order.trip_departure_id)
      .single();

    if (depErr || !departure) {
      console.error("depErr", depErr);
      return res.status(404).json({ error: "Departure not found" });
    }

    // 3) Hämta resa
    const { data: trip, error: tripErr } = await supabase
      .from("trips")
      .select("*")
      .eq("id", departure.trip_id)
      .single();

    if (tripErr || !trip) {
      console.error("tripErr", tripErr);
      return res.status(404).json({ error: "Trip not found" });
    }

    // 4) Hämta passagerare
    const { data: passengers, error: paxErr } = await supabase
      .from("trip_order_passengers")
      .select("*")
      .eq("trip_order_id", order.id);

    if (paxErr) {
      console.error("paxErr", paxErr);
      return res.status(500).json({ error: "Could not load passengers" });
    }

    const paxList = passengers || [];
    const baseAmount = paxList.reduce(
      (sum: number, p: any) => sum + (p.price || 0),
      0
    );

    // Tillval – bara testvärden här
    const smsPrice = order.sms_ticket ? 2000 : 0;
    const cancellationPrice = order.cancellation_protection ? 3900 : 0;
    const totalAmount = baseAmount + smsPrice + cancellationPrice;
    const vatAmount = Math.round(totalAmount * 0.06); // ex 6%

    // Giltighet – för preview: idag 05:00–23:59
    const today = new Date();
    const validFrom = new Date(
      `${departure.departure_date}T${departure.departure_time || "05:00"}:00`
    );
    const validTo = new Date(
      `${departure.departure_date}T23:59:59`
    );

    const qrPayloadObj = {
      v: 1,
      ticketId: "preview-ticket",
      orderId: order.id,
    };

    const pdfData: TicketPdfData = {
      orderId: order.id,
      ticketId: "preview-ticket",
      ticketNumber: `PREVIEW-${order.id.slice(0, 8)}`,

      tripTitle: trip.title,
      lineName: departure.line_name,
      operatorName: departure.operator_name,
      departureDate: departure.departure_date,
      departureTime: departure.departure_time,
      returnTime: departure.return_time,
      departureStop: departure.departure_stop,

      customerName: order.customer_name,
      customerEmail: order.customer_email,
      customerPhone: order.customer_phone,

      passengers: paxList.map((p: any) => ({
        fullName: p.full_name,
        seatNumber: p.seat_number,
        category: p.category,
        price: p.price,
      })),

      currency: (order.currency || "SEK") as "SEK",
      baseAmount,
      smsTicket: order.sms_ticket,
      smsPrice,
      cancellationProtection: order.cancellation_protection,
      cancellationPrice,
      totalAmount,
      vatAmount,

      createdAt: order.paid_at || today.toISOString(),
      validFrom: validFrom.toISOString(),
      validTo: validTo.toISOString(),
      ticketType: trip.kind === "multiday" ? "multiday" : "shopping",

      qrPayload: JSON.stringify(qrPayloadObj),
    };

    const pdfBuffer = await generateTicketPdf(pdfData);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      'inline; filename="helsingbuss-biljett-preview.pdf"'
    );
    res.send(pdfBuffer);
  } catch (err) {
    console.error("preview error", err);
    res.status(500).json({ error: "Internal error" });
  }
}
