import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import { getBearerToken, verifyPersonalToken } from "@/lib/personalAuth";

const supabaseUrl =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;

const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY;

function getSupabase() {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase env saknas.");
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({
        ok: false,
        error: "Method not allowed",
      });
    }

    const token = getBearerToken(req);
    const payload = verifyPersonalToken(token);

    if (!payload) {
      return res.status(401).json({
        ok: false,
        error: "Du är inte inloggad.",
      });
    }

    const supabase = getSupabase();

    const { data: employee, error } = await supabase
      .from("staff_employees")
      .select("*")
      .eq("id", payload.employee_id)
      .maybeSingle();

    if (error) throw error;

    if (!employee) {
      return res.status(401).json({
        ok: false,
        error: "Kunde inte hitta personalprofil.",
      });
    }

    return res.status(200).json({
      ok: true,
      employee: {
        id: employee.id,
        first_name: employee.first_name,
        last_name: employee.last_name,
        email: employee.email,
        role: employee.role,
      },
    });
  } catch (error: any) {
    console.error("/api/personal/me error", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte hämta inloggad användare.",
    });
  }
}
