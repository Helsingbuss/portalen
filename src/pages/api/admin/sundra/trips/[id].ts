import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/å/g, "a")
    .replace(/ä/g, "a")
    .replace(/ö/g, "o")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { id } = req.query;

    if (!id || typeof id !== "string") {
      return res.status(400).json({
        ok: false,
        error: "ID saknas.",
      });
    }

    if (req.method === "GET") {
      const { data, error } = await supabaseAdmin
        .from("sundra_trips")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;

      return res.status(200).json({
        ok: true,
        trip: data,
      });
    }

    if (req.method === "PUT" || req.method === "PATCH") {
      const body = req.body || {};

      if (!body.title || !String(body.title).trim()) {
        return res.status(400).json({
          ok: false,
          error: "Titel saknas.",
        });
      }

      const title = String(body.title).trim();
      const slug = body.slug?.trim() || slugify(title);

      const updateData = {
        title,
        slug,
        category: body.category || null,
        destination: body.destination || null,

        short_description: body.short_description || null,
        description: body.description || null,
        program: body.program || null,
        included: body.included || null,
        not_included: body.not_included || null,
        terms: body.terms || null,

        image_url: body.image_url || null,
        gallery: Array.isArray(body.gallery) ? body.gallery : [],

        price_from:
          body.price_from === "" || body.price_from == null
            ? 0
            : Number(body.price_from),

        currency: body.currency || "SEK",
        status: body.status || "draft",
        is_featured: Boolean(body.is_featured),

        seo_title: body.seo_title || null,
        seo_description: body.seo_description || null,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabaseAdmin
        .from("sundra_trips")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      return res.status(200).json({
        ok: true,
        trip: data,
      });
    }

    if (req.method === "DELETE") {
      const { error } = await supabaseAdmin
        .from("sundra_trips")
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
    console.error("/api/admin/sundra/trips/[id] error:", e?.message || e);

    return res.status(500).json({
      ok: false,
      error: e?.message || "Kunde inte hantera resan.",
    });
  }
}
