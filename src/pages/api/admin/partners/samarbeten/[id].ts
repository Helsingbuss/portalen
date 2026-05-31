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

function cleanText(value: any) {
  const text = String(value ?? "").trim();
  return text.length ? text : null;
}

function buildUpdateData(body: any) {
  return {
    partner_type: "partnership",
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
  const id = String(req.query.id || "").trim();

  if (!id) {
    return res.status(400).json({ ok: false, error: "Samarbete / partner-ID saknas." });
  }

  try {
    const supabase = getSupabase();

    if (req.method === "GET") {
      const { data, error } = await supabase
        .from("app_partners")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;

      return res.status(200).json({
        ok: true,
        partnership: data,
      });
    }

    if (req.method === "PUT") {
      const updateData = buildUpdateData(req.body || {});

      if (!updateData.name) {
        return res.status(400).json({
          ok: false,
          error: "Namn på samarbete/partner saknas.",
        });
      }

      const { data, error } = await supabase
        .from("app_partners")
        .update(updateData)
        .eq("id", id)
        .select("*")
        .single();

      if (error) throw error;

      return res.status(200).json({
        ok: true,
        partnership: data,
      });
    }

    return res.status(405).json({ ok: false, error: "Method not allowed" });
  } catch (error: any) {
    console.error("/api/admin/partners/samarbeten/[id] error", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte hantera samarbete/partner.",
    });
  }
}
