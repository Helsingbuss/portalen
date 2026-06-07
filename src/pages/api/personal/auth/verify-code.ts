import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import { createPersonalToken, hashLoginCode } from "@/lib/personalAuth";

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

function cleanEmail(value: any) {
  return String(value || "").trim().toLowerCase();
}

function cleanCode(value: any) {
  return String(value || "").trim().replace(/\D/g, "");
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({
        ok: false,
        error: "Method not allowed",
      });
    }

    const email = cleanEmail(req.body?.email);
    const code = cleanCode(req.body?.code);

    if (!email || !code || code.length !== 6) {
      return res.status(400).json({
        ok: false,
        error: "E-post eller kod saknas.",
      });
    }

    const supabase = getSupabase();
    const codeHash = hashLoginCode(email, code);

    const { data: codeRows, error: codeError } = await supabase
      .from("personal_login_codes")
      .select("*")
      .eq("email", email)
      .eq("code_hash", codeHash)
      .is("used_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1);

    if (codeError) throw codeError;

    const codeRow = codeRows?.[0];

    if (!codeRow) {
      return res.status(400).json({
        ok: false,
        error: "Koden är fel eller har gått ut.",
      });
    }

    const { data: employee, error: employeeError } = await supabase
      .from("staff_employees")
      .select("*")
      .eq("id", codeRow.employee_id)
      .maybeSingle();

    if (employeeError) throw employeeError;

    if (!employee) {
      return res.status(400).json({
        ok: false,
        error: "Kunde inte hitta personalprofil.",
      });
    }

    const { error: usedError } = await supabase
      .from("personal_login_codes")
      .update({
        used_at: new Date().toISOString(),
      })
      .eq("id", codeRow.id);

    if (usedError) throw usedError;

    const token = createPersonalToken(employee.id, email);

    return res.status(200).json({
      ok: true,
      token,
      employee: {
        id: employee.id,
        first_name: employee.first_name,
        last_name: employee.last_name,
        email: employee.email,
        role: employee.role,
      },
    });
  } catch (error: any) {
    console.error("/api/personal/auth/verify-code error", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte verifiera kod.",
    });
  }
}
