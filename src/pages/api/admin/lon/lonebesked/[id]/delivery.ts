import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import { requirePayrollAccess } from "@/lib/payrollAccess";

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

function cleanText(value: any) {
  const text = String(value ?? "").trim();
  return text.length ? text : null;
}

function cleanBoolean(value: any) {
  return value === true || value === "true" || value === "1" || value === 1;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!requirePayrollAccess(req, res)) return;

  const id = String(req.query.id || "").trim();

  if (!id) {
    return res.status(400).json({ ok: false, error: "Lönebesked-ID saknas." });
  }

  try {
    const supabase = getSupabase();

    if (req.method !== "PUT") {
      return res.status(405).json({ ok: false, error: "Method not allowed" });
    }

    const now = new Date().toISOString();

    const appPublished = cleanBoolean(req.body?.app_published);
    const emailStatus = cleanText(req.body?.email_status) || "not_sent";
    const kivraStatus = cleanText(req.body?.kivra_status) || "not_active";

    const updateData: any = {
      app_published: appPublished,
      email_status: emailStatus,
      kivra_status: kivraStatus,
      delivery_notes: cleanText(req.body?.delivery_notes),
      updated_at: now,
    };

    if (appPublished) updateData.app_published_at = now;
    if (emailStatus === "sent") updateData.email_sent_at = now;
    if (kivraStatus === "sent") updateData.kivra_sent_at = now;

    const { data, error } = await supabase
      .from("payroll_run_rows")
      .update(updateData)
      .eq("id", id)
      .select("*")
      .single();

    if (error) throw error;

    return res.status(200).json({
      ok: true,
      payslip: data,
    });
  } catch (error: any) {
    console.error("/api/admin/lon/lonebesked/[id]/delivery error", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte uppdatera leveransstatus.",
    });
  }
}
