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

function cleanTags(value: any) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildInsertData(body: any) {
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
  try {
    const supabase = getSupabase();

    if (req.method === "POST") {
      const insertData = buildInsertData(req.body || {});

      const { data, error } = await supabase
        .from("crm_kontakter")
        .insert(insertData)
        .select("*")
        .single();

      if (error) throw error;

      return res.status(201).json({
        ok: true,
        contact: data,
      });
    }

    if (req.method !== "GET") {
      return res.status(405).json({ ok: false, error: "Method not allowed" });
    }

    const q = String(req.query.q || "").trim().toLowerCase();
    const status = String(req.query.status || "").trim();
    const type = String(req.query.type || "").trim();

    let query = supabase
      .from("crm_kontakter")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);

    if (status) query = query.eq("status", status);
    if (type) query = query.eq("contact_type", type);

    const { data, error } = await query;

    if (error) {
      if (isMissingTableError(error)) {
        return res.status(200).json({
          ok: true,
          needsSetup: true,
          contacts: [],
          summary: {
            total: 0,
            active: 0,
            leads: 0,
            companies: 0,
          },
        });
      }

      throw error;
    }

    let rows = data || [];

    if (q) {
      rows = rows.filter((row: any) => {
        const haystack = [
          row.contact_number,
          row.first_name,
          row.last_name,
          row.full_name,
          row.company_name,
          row.org_number,
          row.role_title,
          row.email,
          row.phone,
          row.mobile,
          row.city,
          row.contact_type,
          row.status,
          row.source,
          Array.isArray(row.tags) ? row.tags.join(" ") : "",
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
      leads: rows.filter((r: any) => r.status === "lead").length,
      companies: rows.filter((r: any) => Boolean(r.company_name)).length,
    };

    return res.status(200).json({
      ok: true,
      needsSetup: false,
      contacts: rows,
      summary,
    });
  } catch (error: any) {
    console.error("/api/admin/crm/kontakter error", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte hantera kontakter.",
    });
  }
}
