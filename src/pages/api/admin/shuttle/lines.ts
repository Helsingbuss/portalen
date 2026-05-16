import type { NextApiRequest, NextApiResponse } from "next";
import * as admin from "@/lib/supabaseAdmin";

const supabase: any =
  (admin as any).supabaseAdmin ||
  (admin as any).supabase ||
  (admin as any).default;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === "GET") {
      const { data, error } = await supabase
        .from("shuttle_lines")
        .select(`
          *,
          shuttle_routes (
            id,
            name,
            route_code,
            airport_name,
            start_city,
            end_city
          ),
          shuttle_line_stops (
            id,
            line_id,
            stop_id,
            stop_order,
            departure_time,
            arrival_time,
            price,
            is_active,
            shuttle_stops (
              id,
              name,
              city,
              address,
              stop_code
            )
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const lines = (data || []).map((line: any) => ({
        ...line,
        shuttle_line_stops: [...(line.shuttle_line_stops || [])].sort(
          (a: any, b: any) => Number(a.stop_order || 0) - Number(b.stop_order || 0)
        ),
      }));

      return res.status(200).json({
        ok: true,
        lines,
      });
    }

    if (req.method === "POST") {
      const body = req.body || {};

      if (!body.name?.trim()) {
        return res.status(400).json({
          ok: false,
          error: "Linjenamn saknas.",
        });
      }

      const { data, error } = await supabase
        .from("shuttle_lines")
        .insert({
          route_id: body.route_id || null,

          name: body.name.trim(),
          code: body.code || null,

          start_city: body.start_city || null,
          end_city: body.end_city || null,

          color: body.color || "#194C66",
          description: body.description || null,

          status: body.status || "active",
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      return res.status(201).json({
        ok: true,
        line: data,
      });
    }

    if (req.method === "PATCH" || req.method === "PUT") {
      const body = req.body || {};

      if (body.action === "link_stop_to_line") {
        if (!body.line_id || !body.stop_id) {
          return res.status(400).json({
            ok: false,
            error: "Linje och hållplats måste väljas.",
          });
        }

        const { data, error } = await supabase
          .from("shuttle_line_stops")
          .insert({
            line_id: body.line_id,
            stop_id: body.stop_id,

            stop_order: Number(body.stop_order || 0),

            departure_time: body.departure_time || null,
            arrival_time: body.arrival_time || null,

            price: Number(body.price || 0),

            is_active: body.is_active !== false,
            updated_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (error) throw error;

        return res.status(200).json({
          ok: true,
          line_stop: data,
        });
      }

      if (body.action === "update_line_stop") {
        if (!body.id) {
          return res.status(400).json({
            ok: false,
            error: "Kopplings-ID saknas.",
          });
        }

        const { data, error } = await supabase
          .from("shuttle_line_stops")
          .update({
            stop_order: Number(body.stop_order || 0),
            departure_time: body.departure_time || null,
            arrival_time: body.arrival_time || null,
            price: Number(body.price || 0),
            is_active: body.is_active !== false,
            updated_at: new Date().toISOString(),
          })
          .eq("id", body.id)
          .select()
          .single();

        if (error) throw error;

        return res.status(200).json({
          ok: true,
          line_stop: data,
        });
      }

      return res.status(400).json({
        ok: false,
        error: "Okänd åtgärd.",
      });
    }

    if (req.method === "DELETE") {
      const id = String(req.query.id || "");

      if (!id) {
        return res.status(400).json({
          ok: false,
          error: "ID saknas.",
        });
      }

      const { error } = await supabase
        .from("shuttle_line_stops")
        .delete()
        .eq("id", id);

      if (error) throw error;

      return res.status(200).json({
        ok: true,
      });
    }

    return res.status(405).json({
      ok: false,
      error: "Method not allowed",
    });
  } catch (e: any) {
    console.error("/api/admin/shuttle/lines error:", e);

    return res.status(500).json({
      ok: false,
      error: e?.message || "Kunde inte hantera linjer.",
    });
  }
}
