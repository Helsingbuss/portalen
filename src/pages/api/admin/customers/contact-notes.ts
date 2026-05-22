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
      const { customer_id, follow_up } = req.query;

      let query = supabase
        .from("customer_contact_notes")
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
        query = query.eq("customer_id", String(customer_id));
      }

      if (follow_up === "open") {
        query = query
          .eq("follow_up_done", false)
          .not("follow_up_date", "is", null);
      }

      const { data, error } = await query;

      if (error) throw error;

      return res.status(200).json({
        ok: true,
        notes: data || [],
      });
    }

    if (req.method === "POST") {
      const body = req.body || {};

      if (!body.customer_id) {
        return res.status(400).json({
          ok: false,
          error: "customer_id saknas.",
        });
      }

      if (!body.content?.trim()) {
        return res.status(400).json({
          ok: false,
          error: "Notering saknar innehåll.",
        });
      }

      const { data, error } = await supabase
        .from("customer_contact_notes")
        .insert({
          customer_id: body.customer_id,

          note_type: body.note_type || "note",
          title: body.title || null,
          content: body.content,

          contact_channel: body.contact_channel || null,
          contact_person: body.contact_person || null,

          follow_up_date: body.follow_up_date || null,
          follow_up_time: body.follow_up_time || null,
          follow_up_done: body.follow_up_done === true,

          priority: body.priority || "normal",
          created_by: body.created_by || null,

          updated_at: new Date().toISOString(),
        })
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
        note: data,
      });
    }

    if (req.method === "PATCH") {
      const body = req.body || {};

      if (!body.id) {
        return res.status(400).json({
          ok: false,
          error: "Noterings-ID saknas.",
        });
      }

      const { data, error } = await supabase
        .from("customer_contact_notes")
        .update({
          follow_up_done: body.follow_up_done === true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", body.id)
        .select()
        .single();

      if (error) throw error;

      return res.status(200).json({
        ok: true,
        note: data,
      });
    }

    return res.status(405).json({
      ok: false,
      error: "Method not allowed",
    });
  } catch (e: any) {
    console.error("/api/admin/customers/contact-notes error:", e);

    return res.status(500).json({
      ok: false,
      error: e?.message || "Kunde inte hantera kundnoteringar.",
    });
  }
}
