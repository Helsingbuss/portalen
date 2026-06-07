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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const supabase = getSupabase();

    if (req.method !== "GET") {
      return res.status(405).json({ ok: false, error: "Method not allowed" });
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
      if (isMissingTableError(error)) {
        return res.status(200).json({
          ok: true,
          needsSetup: true,
          runs: [],
          summary: {
            total: 0,
            draft: 0,
            approved: 0,
            exported: 0,
            paid: 0,
            totalCost: 0,
          },
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
          run.notes,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return haystack.includes(q);
      });
    }

    const summary = {
      total: runs.length,
      draft: runs.filter((run) => run.status === "draft").length,
      approved: runs.filter((run) => run.status === "approved").length,
      exported: runs.filter((run) => run.status === "exported").length,
      paid: runs.filter((run) => run.status === "paid").length,
      totalCost: Number(
        runs.reduce((sum, run) => sum + Number(run.total_cost || 0), 0).toFixed(2)
      ),
    };

    return res.status(200).json({
      ok: true,
      needsSetup: false,
      runs,
      summary,
    });
  } catch (error: any) {
    console.error("/api/admin/lon/lonekoring error", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte hämta lönekörningar.",
    });
  }
}
