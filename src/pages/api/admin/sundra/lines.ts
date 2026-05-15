import type { NextApiRequest, NextApiResponse } from "next";
import * as admin from "@/lib/supabaseAdmin";

const supabase: any =
  (admin as any).supabaseAdmin ||
  (admin as any).supabase ||
  (admin as any).default;

function cleanStops(stops: any[] = [], lineId: string) {
  return stops
    .filter((s) => String(s.stop_name || "").trim())
    .map((s, index) => ({
      line_id: lineId,
      stop_name: String(s.stop_name || "").trim(),
      stop_city: s.stop_city || null,
      departure_time: s.departure_time || null,
      price:
        s.price === "" || s.price === null || s.price === undefined
          ? 0
          : Number(s.price),
      order_index: Number(s.order_index ?? index + 1),
      is_active: s.is_active !== false,
      updated_at: new Date().toISOString(),
    }));
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === "GET") {
      const { data, error } = await supabase
        .from("sundra_lines")
        .select(`
          *,
          sundra_trips (
            id,
            title,
            destination
          ),
          sundra_line_stops (
            id,
            line_id,
            stop_name,
            stop_city,
            departure_time,
            price,
            order_index,
            is_active,
            created_at,
            updated_at
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const lines = (data || []).map((line: any) => ({
        ...line,
        sundra_line_stops: [...(line.sundra_line_stops || [])].sort(
          (a: any, b: any) => Number(a.order_index || 0) - Number(b.order_index || 0)
        ),
      }));

      return res.status(200).json({
        ok: true,
        lines,
      });
    }

    if (req.method === "POST") {
      const body = req.body || {};

      if (!body.name) {
        return res.status(400).json({
          ok: false,
          error: "Linjenamn saknas.",
        });
      }

      const { data: line, error } = await supabase
        .from("sundra_lines")
        .insert({
          trip_id: body.trip_id || null,
          name: body.name,
          code: body.code || null,
          description: body.description || null,
          start_city: body.start_city || null,
          end_city: body.end_city || null,
          color: body.color || "#194C66",
          status: body.status || "active",
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      const stops = cleanStops(body.stops || [], line.id);

      if (stops.length > 0) {
        const { error: stopsError } = await supabase
          .from("sundra_line_stops")
          .insert(stops);

        if (stopsError) throw stopsError;
      }

      return res.status(201).json({
        ok: true,
        line,
      });
    }

    if (req.method === "PUT" || req.method === "PATCH") {
      const body = req.body || {};

      if (!body.id) {
        return res.status(400).json({
          ok: false,
          error: "Linje-ID saknas.",
        });
      }

      if (!body.name) {
        return res.status(400).json({
          ok: false,
          error: "Linjenamn saknas.",
        });
      }

      const { data: line, error } = await supabase
        .from("sundra_lines")
        .update({
          trip_id: body.trip_id || null,
          name: body.name,
          code: body.code || null,
          description: body.description || null,
          start_city: body.start_city || null,
          end_city: body.end_city || null,
          color: body.color || "#194C66",
          status: body.status || "active",
          updated_at: new Date().toISOString(),
        })
        .eq("id", body.id)
        .select()
        .single();

      if (error) throw error;

      const { error: deleteStopsError } = await supabase
        .from("sundra_line_stops")
        .delete()
        .eq("line_id", body.id);

      if (deleteStopsError) throw deleteStopsError;

      const stops = cleanStops(body.stops || [], body.id);

      if (stops.length > 0) {
        const { error: stopsError } = await supabase
          .from("sundra_line_stops")
          .insert(stops);

        if (stopsError) throw stopsError;
      }

      return res.status(200).json({
        ok: true,
        line,
      });
    }

    return res.status(405).json({
      ok: false,
      error: "Method not allowed",
    });
  } catch (e: any) {
    console.error("/api/admin/sundra/lines error:", e);

    return res.status(500).json({
      ok: false,
      error: e?.message || "Kunde inte hantera linjer.",
    });
  }
}
