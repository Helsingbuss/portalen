import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function time(value?: string | null) {
  if (!value) return null;
  return String(value).slice(0, 5);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({
        ok: false,
        error: "Method not allowed",
      });
    }

    const body = req.body || {};
    const scanCode = String(body.scan_code || body.qr_code || body.code || "").trim();

    if (!scanCode) {
      return res.status(400).json({
        ok: false,
        error: "QR-kod saknas.",
      });
    }

    const { data: ticket, error: ticketError } = await supabaseAdmin
      .from("shuttle_tickets")
      .select(`
        *,
        shuttle_routes (
          id,
          name,
          route_code
        ),
        shuttle_departures (
          id,
          departure_date,
          departure_time
        )
      `)
      .eq("qr_code", scanCode)
      .maybeSingle();

    if (ticketError) throw ticketError;

    if (!ticket) {
      await supabaseAdmin.from("shuttle_scan_logs").insert({
        scan_code: scanCode,
        scan_result: "invalid",
        scan_message: "Biljetten hittades inte.",
        scanned_by: body.scanned_by || "Admin",
      });

      return res.status(404).json({
        ok: false,
        result: "invalid",
        error: "Biljetten hittades inte.",
      });
    }

    const route: any = Array.isArray(ticket.shuttle_routes)
      ? ticket.shuttle_routes[0]
      : ticket.shuttle_routes;

    const departure: any = Array.isArray(ticket.shuttle_departures)
      ? ticket.shuttle_departures[0]
      : ticket.shuttle_departures;

    if (ticket.payment_status !== "paid") {
      await supabaseAdmin.from("shuttle_scan_logs").insert({
        ticket_id: ticket.id,
        booking_id: ticket.booking_id,
        departure_id: ticket.departure_id,
        ticket_number: ticket.ticket_number,
        customer_name: ticket.customer_name,
        route_name: route?.name || null,
        departure_date: departure?.departure_date || null,
        departure_time: departure?.departure_time || null,
        scan_code: scanCode,
        scan_result: "unpaid",
        scan_message: "Biljetten är inte betald.",
        scanned_by: body.scanned_by || "Admin",
      });

      return res.status(400).json({
        ok: false,
        result: "unpaid",
        error: "Biljetten är inte betald.",
        ticket,
      });
    }

    if (ticket.ticket_status === "cancelled") {
      await supabaseAdmin.from("shuttle_scan_logs").insert({
        ticket_id: ticket.id,
        booking_id: ticket.booking_id,
        departure_id: ticket.departure_id,
        ticket_number: ticket.ticket_number,
        customer_name: ticket.customer_name,
        route_name: route?.name || null,
        departure_date: departure?.departure_date || null,
        departure_time: departure?.departure_time || null,
        scan_code: scanCode,
        scan_result: "cancelled",
        scan_message: "Biljetten är avbokad.",
        scanned_by: body.scanned_by || "Admin",
      });

      return res.status(400).json({
        ok: false,
        result: "cancelled",
        error: "Biljetten är avbokad.",
        ticket,
      });
    }

    if (ticket.checked_in) {
      await supabaseAdmin.from("shuttle_scan_logs").insert({
        ticket_id: ticket.id,
        booking_id: ticket.booking_id,
        departure_id: ticket.departure_id,
        ticket_number: ticket.ticket_number,
        customer_name: ticket.customer_name,
        route_name: route?.name || null,
        departure_date: departure?.departure_date || null,
        departure_time: departure?.departure_time || null,
        scan_code: scanCode,
        scan_result: "already_checked_in",
        scan_message: "Biljetten är redan incheckad.",
        scanned_by: body.scanned_by || "Admin",
      });

      return res.status(409).json({
        ok: false,
        result: "already_checked_in",
        error: "Biljetten är redan incheckad.",
        ticket,
      });
    }

    const checkedInAt = new Date().toISOString();

    const { data: updatedTicket, error: updateError } = await supabaseAdmin
      .from("shuttle_tickets")
      .update({
        checked_in: true,
        checked_in_at: checkedInAt,
        updated_at: checkedInAt,
      })
      .eq("id", ticket.id)
      .select(`
        *,
        shuttle_routes (
          id,
          name,
          route_code
        ),
        shuttle_departures (
          id,
          departure_date,
          departure_time
        )
      `)
      .single();

    if (updateError) throw updateError;

    await supabaseAdmin.from("shuttle_scan_logs").insert({
      ticket_id: ticket.id,
      booking_id: ticket.booking_id,
      departure_id: ticket.departure_id,
      ticket_number: ticket.ticket_number,
      customer_name: ticket.customer_name,
      route_name: route?.name || null,
      departure_date: departure?.departure_date || null,
      departure_time: departure?.departure_time || null,
      scan_code: scanCode,
      scan_result: "approved",
      scan_message: "Biljetten är godkänd och incheckad.",
      scanned_by: body.scanned_by || "Admin",
    });

    return res.status(200).json({
      ok: true,
      result: "approved",
      message: "Biljetten är godkänd och incheckad.",
      ticket: updatedTicket,
      summary: {
        ticket_number: ticket.ticket_number,
        customer_name: ticket.customer_name,
        route_name: route?.name || "—",
        departure_date: departure?.departure_date || "—",
        departure_time: time(departure?.departure_time) || "—",
        passengers_count: ticket.passengers_count || 1,
      },
    });
  } catch (e: any) {
    console.error("/api/admin/shuttle/scan-ticket error:", e);

    return res.status(500).json({
      ok: false,
      error: e?.message || "Kunde inte scanna biljett.",
    });
  }
}
