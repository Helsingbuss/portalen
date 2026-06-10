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

function cleanText(value: any) {
  const text = String(value ?? "").trim();
  return text.length ? text : null;
}

function isMissingTableError(error: any) {
  const message = String(error?.message || "").toLowerCase();
  const code = String(error?.code || "").toLowerCase();

  return (
    code === "42p01" ||
    code === "pgrst205" ||
    message.includes("does not exist") ||
    message.includes("could not find") ||
    message.includes("schema cache")
  );
}

function validateDates(startDate: any, endDate: any) {
  const start = cleanText(startDate);
  const end = cleanText(endDate);

  if (!start || !end) {
    throw new Error("Startdatum och slutdatum krävs.");
  }

  if (start > end) {
    throw new Error("Startdatum kan inte vara efter slutdatum.");
  }

  return { start, end };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const supabase = getSupabase();

    if (req.method === "GET") {
      const includeUnlocked = String(req.query.include_unlocked || "") === "true";

      let query: any = supabase
        .from("finance_locked_periods")
        .select("*")
        .order("start_date", { ascending: false })
        .limit(500);

      if (!includeUnlocked) {
        query = query.eq("is_locked", true);
      }

      const { data, error } = await query;

      if (error) {
        if (isMissingTableError(error)) {
          return res.status(200).json({
            ok: true,
            needsSetup: true,
            periods: [],
            summary: {
              activeCount: 0,
              unlockedCount: 0,
            },
          });
        }

        throw error;
      }

      const periods = data || [];

      return res.status(200).json({
        ok: true,
        needsSetup: false,
        periods,
        summary: {
          activeCount: periods.filter((row: any) => row.is_locked).length,
          unlockedCount: periods.filter((row: any) => !row.is_locked).length,
        },
      });
    }

    if (req.method === "POST") {
      const body = req.body || {};
      const { start, end } = validateDates(body.start_date, body.end_date);

      const payload = {
        period_name:
          cleanText(body.period_name) || "Låst period " + start + " - " + end,
        start_date: start,
        end_date: end,
        lock_type: cleanText(body.lock_type) || "custom",
        reason: cleanText(body.reason),
        locked_by: cleanText(body.locked_by) || "Admin",
        is_locked: true,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("finance_locked_periods")
        .insert(payload)
        .select("*")
        .single();

      if (error) {
        if (isMissingTableError(error)) {
          return res.status(200).json({
            ok: false,
            needsSetup: true,
            error: "Tabellen för låsta perioder saknas. Kör SQL-koden först.",
          });
        }

        throw error;
      }

      return res.status(201).json({
        ok: true,
        period: data,
      });
    }

    if (req.method === "PUT") {
      const body = req.body || {};
      const id = cleanText(body.id);

      if (!id) {
        return res.status(400).json({
          ok: false,
          error: "Period-ID saknas.",
        });
      }

      const { start, end } = validateDates(body.start_date, body.end_date);

      const payload = {
        period_name:
          cleanText(body.period_name) || "Låst period " + start + " - " + end,
        start_date: start,
        end_date: end,
        lock_type: cleanText(body.lock_type) || "custom",
        reason: cleanText(body.reason),
        locked_by: cleanText(body.locked_by) || "Admin",
        is_locked: body.is_locked !== false,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("finance_locked_periods")
        .update(payload)
        .eq("id", id)
        .select("*")
        .single();

      if (error) throw error;

      return res.status(200).json({
        ok: true,
        period: data,
      });
    }

    if (req.method === "DELETE") {
      const id = cleanText(req.body?.id || req.query.id);

      if (!id) {
        return res.status(400).json({
          ok: false,
          error: "Period-ID saknas.",
        });
      }

      const { data, error } = await supabase
        .from("finance_locked_periods")
        .update({
          is_locked: false,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select("*")
        .single();

      if (error) throw error;

      return res.status(200).json({
        ok: true,
        period: data,
      });
    }

    return res.status(405).json({
      ok: false,
      error: "Method not allowed",
    });
  } catch (error: any) {
    console.error("/api/admin/ekonomi/lasta-perioder error", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte hantera låsta perioder.",
    });
  }
}
