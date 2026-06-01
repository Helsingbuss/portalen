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

function buildEmployeeData(body: any) {
  return {
    first_name: cleanText(body.first_name),
    last_name: cleanText(body.last_name),
    email: cleanText(body.email),
    phone: cleanText(body.phone),
    role: cleanText(body.role) || "employee",
    employment_type: cleanText(body.employment_type) || "hourly",
    status: cleanText(body.status) || "active",
    city: cleanText(body.city),
    address: cleanText(body.address),
    personal_number: cleanText(body.personal_number),
    emergency_contact: cleanText(body.emergency_contact),
    emergency_phone: cleanText(body.emergency_phone),
    driver_license: cleanText(body.driver_license),
    driver_card_number: cleanText(body.driver_card_number),
    ykb_expiry_date: cleanText(body.ykb_expiry_date),
    driver_card_expiry_date: cleanText(body.driver_card_expiry_date),
    medical_certificate_expiry_date: cleanText(body.medical_certificate_expiry_date),
    notes: cleanText(body.notes),
    updated_at: new Date().toISOString(),
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const id = String(req.query.id || "").trim();

  if (!id) {
    return res.status(400).json({ ok: false, error: "Anställd-ID saknas." });
  }

  try {
    const supabase = getSupabase();

    if (req.method === "GET") {
      const { data: employee, error } = await supabase
        .from("staff_employees")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;

      return res.status(200).json({
        ok: true,
        employee,
      });
    }

    if (req.method === "PUT") {
      const updateData = buildEmployeeData(req.body || {});

      if (!updateData.first_name || !updateData.last_name) {
        return res.status(400).json({
          ok: false,
          error: "Förnamn och efternamn krävs.",
        });
      }

      const { data, error } = await supabase
        .from("staff_employees")
        .update(updateData)
        .eq("id", id)
        .select("*")
        .single();

      if (error) throw error;

      return res.status(200).json({
        ok: true,
        employee: data,
      });
    }

    return res.status(405).json({ ok: false, error: "Method not allowed" });
  } catch (error: any) {
    console.error("/api/admin/personal/anstallda/[id] error", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte hantera anställd.",
    });
  }
}
