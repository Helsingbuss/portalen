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
        .from("sundra_lines")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      return res.status(200).json({
        ok: true,
        lines: data || [],
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

      const { data, error } = await supabase
        .from("sundra_lines")
        .insert({
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

      return res.status(201).json({
        ok: true,
        line: data,
      });
    }

    return res.status(405).json({
      ok: false,
      error: "Method not allowed",
    });
  } catch (e: any) {
    console.error("/api/sundra/admin/lines error:", e);

    return res.status(500).json({
      ok: false,
      error: e?.message || "Kunde inte hantera linjer.",
    });
  }
}
