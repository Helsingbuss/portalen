import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

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

function cleanText(value: any) {
  const text = String(value ?? "").trim();
  return text.length ? text : null;
}

function cleanBoolean(value: any, fallback = true) {
  if (value === true || value === "true" || value === "1" || value === 1) return true;
  if (value === false || value === "false" || value === "0" || value === 0) return false;
  return fallback;
}

function actionToStatus(action: string) {
  switch (action) {
    case "approve":
      return {
        status: "approved",
        dateField: "approved_at",
      };
    case "export":
      return {
        status: "exported",
        dateField: "exported_at",
      };
    case "bank_sent":
      return {
        status: "bank_sent",
        dateField: "bank_sent_at",
      };
    case "paid":
      return {
        status: "paid",
        dateField: "paid_at",
      };
    case "cancel":
      return {
        status: "cancelled",
        dateField: "cancelled_at",
      };
    case "draft":
      return {
        status: "draft",
        dateField: null,
      };
    default:
      return null;
  }
}

function buildSummary(runs: any[]) {
  return {
    total: runs.length,
    draft: runs.filter((run) => run.status === "draft").length,
    approved: runs.filter((run) => run.status === "approved").length,
    exported: runs.filter((run) => run.status === "exported").length,
    bankSent: runs.filter((run) => run.status === "bank_sent").length,
    paid: runs.filter((run) => run.status === "paid").length,
    cancelled: runs.filter((run) => run.status === "cancelled").length,
    totalPayout: Number(
      runs.reduce((sum, run) => sum + Number(run.total_payout_amount || run.total_net_pay || run.total_gross || 0), 0).toFixed(2)
    ),
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const supabase = getSupabase();

    if (req.method === "POST") {
      const payrollRunId = cleanText(req.body?.payroll_run_id);
      const action = cleanText(req.body?.action);
      const statusInfo = actionToStatus(String(action || ""));
      const note = cleanText(req.body?.payment_status_notes);
      const reference = cleanText(req.body?.bank_export_reference);
      const updateRows = cleanBoolean(req.body?.update_rows, true);

      if (!payrollRunId) {
        return res.status(400).json({
          ok: false,
          error: "Lönekörning saknas.",
        });
      }

      if (!statusInfo) {
        return res.status(400).json({
          ok: false,
          error: "Ogiltig statusåtgärd.",
        });
      }

      const now = new Date().toISOString();

      const updateData: any = {
        status: statusInfo.status,
        payment_status_notes: note,
        bank_export_reference: reference,
        updated_at: now,
      };

      if (statusInfo.dateField) {
        updateData[statusInfo.dateField] = now;
      }

      const { data: run, error: runError } = await supabase
        .from("payroll_runs")
        .update(updateData)
        .eq("id", payrollRunId)
        .select("*")
        .single();

      if (runError) throw runError;

      if (updateRows) {
        const rowStatus =
          statusInfo.status === "bank_sent"
            ? "exported"
            : statusInfo.status;

        const { error: rowsError } = await supabase
          .from("payroll_run_rows")
          .update({
            status: rowStatus,
            updated_at: now,
          })
          .eq("payroll_run_id", payrollRunId);

        if (rowsError) throw rowsError;
      }

      return res.status(200).json({
        ok: true,
        run,
      });
    }

    if (req.method !== "GET") {
      return res.status(405).json({
        ok: false,
        error: "Method not allowed",
      });
    }

    const q = String(req.query.q || "").trim().toLowerCase();
    const status = String(req.query.status || "").trim();

    let query = supabase
      .from("payroll_runs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;

    if (error) {
      if (isMissingTableOrColumnError(error)) {
        return res.status(200).json({
          ok: true,
          needsSetup: true,
          runs: [],
          summary: buildSummary([]),
        });
      }

      throw error;
    }

    let runs = (data || []) as any[];

    if (q) {
      runs = runs.filter((run) => {
        const haystack = [
          run.title,
          run.status,
          run.period_start,
          run.period_end,
          run.payout_date,
          run.payment_status_notes,
          run.bank_export_reference,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return haystack.includes(q);
      });
    }

    return res.status(200).json({
      ok: true,
      needsSetup: false,
      runs,
      summary: buildSummary(runs),
    });
  } catch (error: any) {
    console.error("/api/admin/lon/status error", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte hantera exportstatus/betalstatus.",
    });
  }
}
