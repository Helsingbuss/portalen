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

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy.toISOString().slice(0, 10);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const id = String(req.query.id || "").trim();

  if (!id) {
    return res.status(400).json({
      ok: false,
      error: "Faktura-ID saknas.",
    });
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      error: "Method not allowed",
    });
  }

  try {
    const supabase = getSupabase();

    const { data: invoice, error: invoiceError } = await supabase
      .from("finance_invoices")
      .select("*")
      .eq("id", id)
      .single();

    if (invoiceError) throw invoiceError;

    if (invoice.status === "paid") {
      return res.status(400).json({
        ok: false,
        error: "Betald faktura behöver ingen påminnelse.",
      });
    }

    const now = new Date();
    const reminderCount = Number(invoice.reminder_count || 0) + 1;
    const nextReminderDate =
      cleanText(req.body?.next_reminder_date) ||
      addDays(now, reminderCount >= 2 ? 5 : 7);

    const { data: updated, error: updateError } = await supabase
      .from("finance_invoices")
      .update({
        reminder_count: reminderCount,
        last_reminder_sent_at: now.toISOString(),
        next_reminder_date: nextReminderDate,
        updated_at: now.toISOString(),
      })
      .eq("id", id)
      .select("*")
      .single();

    if (updateError) throw updateError;

    return res.status(200).json({
      ok: true,
      invoice: updated,
    });
  } catch (error: any) {
    console.error("/api/admin/ekonomi/fakturor/[id]/mark-reminder error", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte markera påminnelsen.",
    });
  }
}
