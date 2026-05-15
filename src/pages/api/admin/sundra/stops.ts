import type { NextApiRequest, NextApiResponse } from "next";
import * as admin from "@/lib/supabaseAdmin";

const supabase: any =
  (admin as any).supabaseAdmin ||
  (admin as any).supabase ||
  (admin as any).default;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === "GET") {
      const { data: stops, error: stopsError } = await supabase
        .from("sundra_stops")
        .select("*")
        .order("sort_order", { ascending: true });

      if (stopsError) throw stopsError;

      const { data: lines, error: linesError } = await supabase
        .from("sundra_lines")
        .select(`
          id,
          name,
          code,
          color,
          status,
          sundra_line_stops (
            id,
            line_id,
            stop_id,
            stop_order,
            default_departure_time,
            price,
            active,
            sundra_stops (
              id,
              name,
              city,
              address
            )
          )
        `)
        .order("created_at", { ascending: false });

      if (linesError) throw linesError;

      return res.status(200).json({
        ok: true,
        stops: stops || [],
        lines: (lines || []).map((line: any) => ({
          ...line,
          sundra_line_stops: [...(line.sundra_line_stops || [])].sort(
            (a: any, b: any) => Number(a.stop_order || 0) - Number(b.stop_order || 0)
          ),
        })),
      });
    }

    if (req.method === "POST") {
      const body = req.body || {};

      if (!body.name?.trim()) {
        return res.status(400).json({ ok: false, error: "Hållplatsnamn saknas." });
      }

      const { data, error } = await supabase
        .from("sundra_stops")
        .insert({
          name: body.name.trim(),
          city: body.city || null,
          address: body.address || null,
          sort_order: Number(body.sort_order || 0),
          active: body.active !== false,
          stop_code: body.stop_code || null,
          latitude: body.latitude === "" ? null : body.latitude ? Number(body.latitude) : null,
          longitude: body.longitude === "" ? null : body.longitude ? Number(body.longitude) : null,
          description: body.description || null,
          status: body.status || "active",
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      return res.status(201).json({ ok: true, stop: data });
    }

    if (req.method === "PUT" || req.method === "PATCH") {
      const body = req.body || {};

      if (body.action === "link_stop_to_line") {
        if (!body.line_id || !body.stop_id) {
          return res.status(400).json({
            ok: false,
            error: "Linje och hållplats måste väljas.",
          });
        }

        const { data, error } = await supabase
          .from("sundra_line_stops")
          .insert({
            line_id: body.line_id,
            stop_id: body.stop_id,
            stop_order: Number(body.stop_order || 0),
            default_departure_time: body.default_departure_time || null,
            price: Number(body.price || 0),
            active: body.active !== false,
          })
          .select()
          .single();

        if (error) throw error;

        return res.status(200).json({ ok: true, line_stop: data });
      }

      if (body.action === "update_line_stop") {
        if (!body.id) {
          return res.status(400).json({ ok: false, error: "Kopplings-ID saknas." });
        }

        const { data, error } = await supabase
          .from("sundra_line_stops")
          .update({
            stop_order: Number(body.stop_order || 0),
            default_departure_time: body.default_departure_time || null,
            price: Number(body.price || 0),
            active: body.active !== false,
          })
          .eq("id", body.id)
          .select()
          .single();

        if (error) throw error;

        return res.status(200).json({ ok: true, line_stop: data });
      }

      return res.status(400).json({ ok: false, error: "Okänd åtgärd." });
    }

    if (req.method === "DELETE") {
      const id = String(req.query.id || "");

      if (!id) {
        return res.status(400).json({ ok: false, error: "ID saknas." });
      }

      const { error } = await supabase
        .from("sundra_line_stops")
        .delete()
        .eq("id", id);

      if (error) throw error;

      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ ok: false, error: "Method not allowed" });
  } catch (e: any) {
    console.error("/api/admin/sundra/stops error:", e);

    return res.status(500).json({
      ok: false,
      error: e?.message || "Kunde inte hantera hållplatser.",
    });
  }
}
