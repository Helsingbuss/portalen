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

function isMissingTableOrColumnError(error: any) {
  const message = String(error?.message || "").toLowerCase();
  const code = String(error?.code || "").toLowerCase();

  return (
    code === "42p01" ||
    code === "42703" ||
    code === "pgrst204" ||
    code === "pgrst205" ||
    message.includes("does not exist") ||
    message.includes("could not find") ||
    message.includes("schema cache")
  );
}

function buildRowSummary(rows: any[]) {
  return {
    rows: rows.length,
    gross: Number(rows.reduce((sum, row) => sum + Number(row.gross_total || 0), 0).toFixed(2)),
    tax: Number(rows.reduce((sum, row) => sum + Number(row.preliminary_tax_amount || 0), 0).toFixed(2)),
    net: Number(rows.reduce((sum, row) => sum + Number(row.net_pay || row.payout_amount || 0), 0).toFixed(2)),
    employerFee: Number(rows.reduce((sum, row) => sum + Number(row.employer_fee || 0), 0).toFixed(2)),
    totalCost: Number(rows.reduce((sum, row) => sum + Number(row.total_cost || 0), 0).toFixed(2)),
    published: rows.filter((row) => row.app_published).length,
    emailSent: rows.filter((row) => row.email_status === "sent").length,
  };
}

async function loadRunAndRows(supabase: any, id: string) {
  const { data: run, error: runError } = await supabase
    .from("payroll_runs")
    .select("*")
    .eq("id", id)
    .single();

  if (runError) throw runError;

  const { data: rowsData, error: rowsError } = await supabase
    .from("payroll_run_rows")
    .select("*")
    .eq("payroll_run_id", id)
    .order("employee_name_snapshot", { ascending: true });

  if (rowsError) throw rowsError;

  const rows = rowsData || [];

  return {
    run,
    rows,
    summary: buildRowSummary(rows),
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!requirePayrollAccess(req, res)) return;

  const id = String(req.query.id || "").trim();

  if (!id) {
    return res.status(400).json({
      ok: false,
      error: "Lönekörnings-ID saknas.",
    });
  }

  try {
    const supabase = getSupabase();

    if (req.method === "GET") {
      try {
        const data = await loadRunAndRows(supabase, id);

        return res.status(200).json({
          ok: true,
          needsSetup: false,
          ...data,
        });
      } catch (error: any) {
        if (isMissingTableOrColumnError(error)) {
          return res.status(200).json({
            ok: true,
            needsSetup: true,
            run: null,
            rows: [],
            summary: buildRowSummary([]),
          });
        }

        throw error;
      }
    }

    if (req.method === "POST") {
      const action = cleanText(req.body?.action);
      const archiveNotes = cleanText(req.body?.archive_notes);

      if (!action) {
        return res.status(400).json({
          ok: false,
          error: "Åtgärd saknas.",
        });
      }

      const now = new Date().toISOString();

      let updateData: any = {
        updated_at: now,
      };

      if (action === "archive") {
        updateData = {
          ...updateData,
          archived_at: now,
          archive_notes: archiveNotes,
        };
      } else if (action === "unarchive") {
        updateData = {
          ...updateData,
          archived_at: null,
          archive_notes: archiveNotes,
        };
      } else if (action === "notes") {
        updateData = {
          ...updateData,
          archive_notes: archiveNotes,
        };
      } else {
        return res.status(400).json({
          ok: false,
          error: "Ogiltig åtgärd.",
        });
      }

      const { error: updateError } = await supabase
        .from("payroll_runs")
        .update(updateData)
        .eq("id", id);

      if (updateError) throw updateError;

      const data = await loadRunAndRows(supabase, id);

      return res.status(200).json({
        ok: true,
        ...data,
      });
    }

    return res.status(405).json({
      ok: false,
      error: "Method not allowed",
    });
  } catch (error: any) {
    console.error("/api/admin/lon/historik/[id] error", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte hantera arkivet.",
    });
  }
}
