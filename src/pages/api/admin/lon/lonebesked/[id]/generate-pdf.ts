import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import { generatePayslipPdfBytes } from "@/lib/payrollPayslipPdf";
import { createPayslipSignedUrl, uploadPayslipPdf } from "@/lib/payrollPayslipStorage";
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

function filePathForPayslip(payslip: any, id: string) {
  const runId = payslip?.payroll_run_id || "utan-lonekoring";
  return "payslips/" + runId + "/" + id + ".pdf";
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!requirePayrollAccess(req, res)) return;

  const id = String(req.query.id || "").trim();

  if (!id) {
    return res.status(400).json({
      ok: false,
      error: "Lönebesked-ID saknas.",
    });
  }

  try {
    if (req.method !== "POST") {
      return res.status(405).json({
        ok: false,
        error: "Method not allowed",
      });
    }

    const supabase = getSupabase();

    const { data: payslip, error: payslipError } = await supabase
      .from("payroll_run_rows")
      .select("*")
      .eq("id", id)
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

    const pdfBytes = await generatePayslipPdfBytes({
      payslip,
      run,
    });

    const pdfPath = filePathForPayslip(payslip, id);

    await uploadPayslipPdf(supabase, pdfPath, pdfBytes);

    const now = new Date().toISOString();

    const { data: updatedPayslip, error: updateError } = await supabase
      .from("payroll_run_rows")
      .update({
        payslip_pdf_path: pdfPath,
        payslip_pdf_url: pdfPath,
        payslip_pdf_generated_at: now,
        updated_at: now,
      })
      .eq("id", id)
      .select("*")
      .single();

    if (updateError) throw updateError;

    const signedUrl = await createPayslipSignedUrl(supabase, pdfPath);

    return res.status(200).json({
      ok: true,
      payslip: updatedPayslip,
      pdfPath,
      signedUrl,
    });
  } catch (error: any) {
    console.error("/api/admin/lon/lonebesked/[id]/generate-pdf error", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte skapa PDF.",
    });
  }
}
