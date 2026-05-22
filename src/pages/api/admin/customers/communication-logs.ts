import type { NextApiRequest, NextApiResponse } from "next";
import * as admin from "@/lib/supabaseAdmin";

const supabase: any =
  (admin as any).supabaseAdmin ||
  (admin as any).supabase ||
  (admin as any).default;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    if (req.method === "GET") {
      const { customer_id, channel, status } = req.query;

      let query = supabase
        .from("customer_communication_logs")
        .select(`
          *,
          customers (
            id,
            name,
            company_name,
            email,
            phone
          )
        `)
        .order("created_at", {
          ascending: false,
        });

      if (customer_id) {
        query = query.eq(
          "customer_id",
          String(customer_id)
        );
      }

      if (channel && String(channel) !== "all") {
        query = query.eq(
          "channel",
          String(channel)
        );
      }

      if (status && String(status) !== "all") {
        query = query.eq(
          "status",
          String(status)
        );
      }

      const { data, error } = await query;

      if (error) throw error;

      return res.status(200).json({
        ok: true,
        logs: data || [],
      });
    }

    if (req.method === "POST") {
      const body = req.body || {};

      if (!body.channel) {
        return res.status(400).json({
          ok: false,
          error: "Kanal saknas.",
        });
      }

      const insertData = {
        customer_id: body.customer_id || null,

        related_type: body.related_type || null,
        related_id: body.related_id || null,

        channel: body.channel,
        direction: body.direction || "outbound",

        subject: body.subject || null,
        message: body.message || null,

        recipient_name: body.recipient_name || null,
        recipient_email: body.recipient_email || null,
        recipient_phone: body.recipient_phone || null,

        sender_name: body.sender_name || null,
        sender_email: body.sender_email || null,

        provider: body.provider || null,
        provider_message_id: body.provider_message_id || null,

        status: body.status || "sent",
        error_message: body.error_message || null,

        sent_at: body.sent_at || new Date().toISOString(),
        delivered_at: body.delivered_at || null,
        opened_at: body.opened_at || null,

        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("customer_communication_logs")
        .insert(insertData)
        .select(`
          *,
          customers (
            id,
            name,
            company_name
          )
        `)
        .single();

      if (error) throw error;

      return res.status(201).json({
        ok: true,
        log: data,
      });
    }

    return res.status(405).json({
      ok: false,
      error: "Method not allowed",
    });
  } catch (e: any) {
    console.error(
      "/api/admin/customers/communication-logs error:",
      e
    );

    return res.status(500).json({
      ok: false,
      error:
        e?.message ||
        "Kunde inte hantera kommunikationsloggar.",
    });
  }
}
