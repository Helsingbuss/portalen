import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import { generatePayslipPdfBytes } from "@/lib/payrollPayslipPdf";
import { createPayslipSignedUrl, uploadPayslipPdf } from "@/lib/payrollPayslipStorage";
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

function filePathForPayslip(payslip: any, id: string) {
  const runId = payslip?.payroll_run_id || "utan-lonekoring";
  return "payslips/" + runId + "/" + id + ".pdf";
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

    const token = getBearerToken(req);
    const payload = verifyPersonalToken(token);

    if (!payload) {
      return res.status(401).json({
        ok: false,
        error: "Du är inte inloggad.",
      });
    }

    const supabase = getSupabase();

    const { data: payslip, error: payslipError } = await supabase
      .from("payroll_run_rows")
      .select("*")
      .eq("id", id)
      .eq("employee_id", payload.employee_id)
      .eq("app_published", true)
      .single();

    if (payslipError) throw payslipError;

    let run = null;

    if (payslip?.payroll_run_id) {
      const { data: runData, error: runError } = await supabase
        .from("payroll_runs")
        .select("*")
        .eq("id", payslip.payroll_run_id)
        .single();

      if (runError) throw runError;
      run = runData;
    }

    let pdfPath = payslip?.payslip_pdf_path || payslip?.payslip_pdf_url;

    if (!pdfPath) {
      const pdfBytes = await generatePayslipPdfBytes({
        payslip,
        run,
      });

      pdfPath = filePathForPayslip(payslip, id);

      await uploadPayslipPdf(supabase, pdfPath, pdfBytes);

      const now = new Date().toISOString();

      const { error: updateError } = await supabase
        .from("payroll_run_rows")
        .update({
          payslip_pdf_path: pdfPath,
          payslip_pdf_url: pdfPath,
          payslip_pdf_generated_at: now,
          updated_at: now,
        })
        .eq("id", id);

      if (updateError) throw updateError;
    }

    const signedUrl = await createPayslipSignedUrl(supabase, pdfPath);

    return res.status(200).json({
      ok: true,
      signedUrl,
    });
  } catch (error: any) {
    console.error("/api/personal/lonebesked/[id]/pdf error", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte öppna PDF.",
    });
  }
}
