import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;

const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY;

function getSupabase() {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "Supabase env saknas. Admin kräver SUPABASE_SERVICE_ROLE_KEY eller SUPABASE_SERVICE_KEY i .env.local."
    );
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function isMissingTableError(error: any) {
  const message = String(error?.message || "").toLowerCase();
  const code = String(error?.code || "").toLowerCase();

  return (
    code === "42p01" ||
    code === "pgrst205" ||
    message.includes("does not exist") ||
    message.includes("could not find the table") ||
    (message.includes("relation") && message.includes("does not exist"))
  );
}

function cleanText(value: any) {
  const text = String(value ?? "").trim();
  return text.length ? text : null;
}

function buildInsertData(body: any) {
  return {
    partner_type: "supplier",
    name: cleanText(body.name),
    org_number: cleanText(body.org_number),
    contact_person: cleanText(body.contact_person),
    email: cleanText(body.email),
    phone: cleanText(body.phone),
    website: cleanText(body.website),
    city: cleanText(body.city),
    address: cleanText(body.address),
    status: cleanText(body.status) || "active",
    quality_level: cleanText(body.quality_level) || "normal",
    notes: cleanText(body.notes),
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const supabase = getSupabase();

    if (req.method === "POST") {
      const insertData = buildInsertData(req.body || {});

      if (!insertData.name) {
        return res.status(400).json({
          ok: false,
          error: "Namn på leverantör saknas.",
        });
      }

      const { data, error } = await supabase
        .from("app_partners")
        .insert(insertData)
        .select("*")
        .single();

      if (error) throw error;

      return res.status(201).json({
        ok: true,
        supplier: data,
      });
    }

    if (req.method !== "GET") {
      return res.status(405).json({ ok: false, error: "Method not allowed" });
    }

    const q = String(req.query.q || "").trim().toLowerCase();
    const status = String(req.query.status || "").trim();
    const quality = String(req.query.quality || "").trim();

    let query = supabase
      .from("app_partners")
      .select("*")
      .eq("partner_type", "supplier")
      .order("name", { ascending: true })
      .limit(500);

    if (status) query = query.eq("status", status);
    if (quality) query = query.eq("quality_level", quality);

    const { data, error } = await query;

    if (error) {
      if (isMissingTableError(error)) {
        return res.status(200).json({
          ok: true,
          needsSetup: true,
          suppliers: [],
          summary: {
            total: 0,
            active: 0,
            inactive: 0,
            highQuality: 0,
          },
        });
      }

      throw error;
    }

    let rows = data || [];

    if (q) {
      rows = rows.filter((row: any) => {
        const haystack = [
          row.name,
          row.org_number,
          row.contact_person,
          row.email,
          row.phone,
          row.website,
          row.city,
          row.address,
          row.status,
          row.quality_level,
          row.notes,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return haystack.includes(q);
      });
    }

    const summary = {
      total: rows.length,
      active: rows.filter((r: any) => r.status === "active").length,
      inactive: rows.filter((r: any) => r.status !== "active").length,
      highQuality: rows.filter((r: any) =>
        ["high", "premium", "approved"].includes(String(r.quality_level || ""))
      ).length,
    };

    return res.status(200).json({
      ok: true,
      needsSetup: false,
      suppliers: rows,
      summary,
    });
  } catch (error: any) {
    console.error("/api/admin/partners/leverantorer error", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte hantera leverantörer.",
    });
  }
}
