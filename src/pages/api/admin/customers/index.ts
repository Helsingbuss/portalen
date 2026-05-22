import type { NextApiRequest, NextApiResponse } from "next";
import * as admin from "@/lib/supabaseAdmin";

const supabase: any =
  (admin as any).supabaseAdmin ||
  (admin as any).supabase ||
  (admin as any).default;

function cleanTags(value: any) {
  if (Array.isArray(value)) {
    return value.map((v) => String(v).trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
  }

  return [];
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    if (req.method === "GET") {
      const { q, type, status } = req.query;

      let query = supabase
        .from("customers")
        .select("*")
        .order("created_at", { ascending: false });

      if (type && String(type) !== "all") {
        query = query.eq("customer_type", String(type));
      }

      if (status && String(status) !== "all") {
        query = query.eq("status", String(status));
      }

      if (q && String(q).trim()) {
        const search = `%${String(q).trim()}%`;

        query = query.or(
          [
            `name.ilike.${search}`,
            `company_name.ilike.${search}`,
            `contact_person.ilike.${search}`,
            `email.ilike.${search}`,
            `phone.ilike.${search}`,
            `org_number.ilike.${search}`,
            `city.ilike.${search}`,
          ].join(",")
        );
      }

      const { data, error } = await query;

      if (error) throw error;

      return res.status(200).json({
        ok: true,
        customers: data || [],
      });
    }

    if (req.method === "POST") {
      const body = req.body || {};

      const displayName =
        body.name ||
        body.company_name ||
        body.contact_person;

      if (!displayName?.trim()) {
        return res.status(400).json({
          ok: false,
          error: "Kundnamn saknas.",
        });
      }

      const insertData = {
        customer_type: body.customer_type || "private",
        status: body.status || "active",

        name: displayName.trim(),
        company_name: body.company_name || null,
        org_number: body.org_number || null,

        contact_person: body.contact_person || null,
        email: body.email || null,
        phone: body.phone || null,

        address: body.address || null,
        postal_code: body.postal_code || null,
        city: body.city || null,
        country: body.country || "Sverige",

        customer_source: body.customer_source || null,
        tags: cleanTags(body.tags),

        notes: body.notes || null,

        total_revenue: Number(body.total_revenue || 0),
        bookings_count: Number(body.bookings_count || 0),
        offers_count: Number(body.offers_count || 0),

        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("customers")
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;

      return res.status(201).json({
        ok: true,
        customer: data,
      });
    }

    return res.status(405).json({
      ok: false,
      error: "Method not allowed",
    });
  } catch (e: any) {
    console.error("/api/admin/customers error:", e);

    return res.status(500).json({
      ok: false,
      error: e?.message || "Kunde inte hantera kunder.",
    });
  }
}
