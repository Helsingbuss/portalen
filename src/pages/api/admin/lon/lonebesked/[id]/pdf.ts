import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import { createPayslipSignedUrl } from "@/lib/payrollPayslipStorage";

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
  const id = String(req.query.id || "").trim();

  if (!id) {
    return res.status(400).json({
      ok: false,
      error: "Lönebesked-ID saknas.",
    });
  }

  try {
    if (req.method !== "GET") {
      return res.status(405).json({
        ok: false,
        error: "Method not allowed",
      });
    }

    const supabase = getSupabase();

    const { data: payslip, error } = await supabase
      .from("payroll_run_rows")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;

    const pdfPath = payslip?.payslip_pdf_path || payslip?.payslip_pdf_url;

    if (!pdfPath) {
      return res.status(404).json({
        ok: false,
        error: "PDF saknas. Skapa PDF först.",
      });
    }

    const signedUrl = await createPayslipSignedUrl(supabase, pdfPath);

    return res.redirect(signedUrl);
  } catch (error: any) {
    console.error("/api/admin/lon/lonebesked/[id]/pdf error", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte öppna PDF.",
    });
  }
}
