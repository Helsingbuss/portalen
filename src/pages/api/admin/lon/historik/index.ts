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
  return text.length ? text : "";
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

function dateForRun(run: any) {
  return run.payout_date || run.period_end || run.period_start || run.created_at || null;
}

function matchesYearMonth(run: any, year: string, month: string) {
  const value = dateForRun(run);
  if (!value) return true;

  const d = new Date(value);

  if (Number.isNaN(d.getTime())) return true;

  if (year && String(d.getFullYear()) !== year) return false;

  if (month) {
    const m = String(d.getMonth() + 1).padStart(2, "0");
    if (m !== month) return false;
  }

  return true;
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
    archived: runs.filter((run) => Boolean(run.archived_at)).length,
    totalGross: Number(runs.reduce((sum, run) => sum + Number(run.total_gross || 0), 0).toFixed(2)),
    totalTax: Number(runs.reduce((sum, run) => sum + Number(run.total_preliminary_tax || 0), 0).toFixed(2)),
    totalNet: Number(runs.reduce((sum, run) => sum + Number(run.total_net_pay || run.total_payout_amount || 0), 0).toFixed(2)),
    totalCost: Number(runs.reduce((sum, run) => sum + Number(run.total_cost || 0), 0).toFixed(2)),
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!requirePayrollAccess(req, res)) return;

  try {
    const supabase = getSupabase();

    if (req.method !== "GET") {
      return res.status(405).json({
        ok: false,
        error: "Method not allowed",
      });
    }

    const q = cleanText(req.query.q).toLowerCase();
    const status = cleanText(req.query.status);
    const year = cleanText(req.query.year);
    const month = cleanText(req.query.month);
    const archived = cleanText(req.query.archived);

    const { data, error } = await supabase
      .from("payroll_runs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1000);

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

    if (status) {
      runs = runs.filter((run) => run.status === status);
    }

    if (year || month) {
      runs = runs.filter((run) => matchesYearMonth(run, year, month));
    }

    if (archived === "true") {
      runs = runs.filter((run) => Boolean(run.archived_at));
    }

    if (archived === "false") {
      runs = runs.filter((run) => !run.archived_at);
    }

    if (q) {
      runs = runs.filter((run) => {
        const haystack = [
          run.title,
          run.status,
          run.period_start,
          run.period_end,
          run.payout_date,
          run.notes,
          run.payment_status_notes,
          run.bank_export_reference,
          run.archive_notes,
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
    console.error("/api/admin/lon/historik error", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte hämta historik.",
    });
  }
}
