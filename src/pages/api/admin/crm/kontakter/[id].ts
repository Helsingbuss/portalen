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
      "Supabase env saknas. CRM admin kräver SUPABASE_SERVICE_ROLE_KEY eller SUPABASE_SERVICE_KEY i .env.local."
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

function cleanTags(value: any) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildUpdateData(body: any) {
  return {
    first_name: cleanText(body.first_name),
    last_name: cleanText(body.last_name),
    company_name: cleanText(body.company_name),
    org_number: cleanText(body.org_number),
    role_title: cleanText(body.role_title),

    email: cleanText(body.email),
    phone: cleanText(body.phone),
    mobile: cleanText(body.mobile),

    address: cleanText(body.address),
    postal_code: cleanText(body.postal_code),
    city: cleanText(body.city),
    country: cleanText(body.country) || "Sverige",

    contact_type: cleanText(body.contact_type) || "customer",
    status: cleanText(body.status) || "active",
    source: cleanText(body.source),

    notes: cleanText(body.notes),
    tags: cleanTags(body.tags),
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const id = String(req.query.id || "").trim();

  if (!id) {
    return res.status(400).json({ ok: false, error: "Kontakt-ID saknas." });
  }

  try {
    const supabase = getSupabase();

    if (req.method === "GET") {
      const { data, error } = await supabase
        .from("crm_kontakter")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;

      return res.status(200).json({
        ok: true,
        contact: data,
      });
    }

    if (req.method === "PUT") {
      const updateData = buildUpdateData(req.body || {});

      const { data, error } = await supabase
        .from("crm_kontakter")
        .update(updateData)
        .eq("id", id)
        .select("*")
        .single();

      if (error) throw error;

      return res.status(200).json({
        ok: true,
        contact: data,
      });
    }

    return res.status(405).json({ ok: false, error: "Method not allowed" });
  } catch (error: any) {
    console.error("/api/admin/crm/kontakter/[id] error", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte hantera kontakten.",
    });
  }
}
