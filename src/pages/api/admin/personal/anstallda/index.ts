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
  try {
    const supabase = getSupabase();

    if (req.method === "POST") {
      const insertData = buildEmployeeData(req.body || {});

      if (!insertData.first_name || !insertData.last_name) {
        return res.status(400).json({
          ok: false,
          error: "Förnamn och efternamn krävs.",
        });
      }

      const { data, error } = await supabase
        .from("staff_employees")
        .insert(insertData)
        .select("*")
        .single();

      if (error) throw error;

      return res.status(201).json({
        ok: true,
        employee: data,
      });
    }

    if (req.method !== "GET") {
      return res.status(405).json({ ok: false, error: "Method not allowed" });
    }

    const q = String(req.query.q || "").trim().toLowerCase();
    const status = String(req.query.status || "").trim();
    const role = String(req.query.role || "").trim();

    let query = supabase
      .from("staff_employees")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);

    if (status) query = query.eq("status", status);
    if (role) query = query.eq("role", role);

    const { data, error } = await query;

    if (error) {
      if (isMissingTableError(error)) {
        return res.status(200).json({
          ok: true,
          needsSetup: true,
          employees: [],
          summary: {
            total: 0,
            active: 0,
            drivers: 0,
            hourly: 0,
            inactive: 0,
          },
        });
      }

      throw error;
    }

    let employees = data || [];

    if (q) {
      employees = employees.filter((row: any) => {
        const haystack = [
          row.first_name,
          row.last_name,
          row.email,
          row.phone,
          row.role,
          row.employment_type,
          row.status,
          row.city,
          row.driver_license,
          row.notes,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return haystack.includes(q);
      });
    }

    const summary = {
      total: employees.length,
      active: employees.filter((row: any) => row.status === "active").length,
      drivers: employees.filter((row: any) => row.role === "driver").length,
      hourly: employees.filter((row: any) => row.employment_type === "hourly").length,
      inactive: employees.filter((row: any) => row.status === "inactive").length,
    };

    return res.status(200).json({
      ok: true,
      needsSetup: false,
      employees,
      summary,
    });
  } catch (error: any) {
    console.error("/api/admin/personal/anstallda error", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte hantera anställda.",
    });
  }
}
