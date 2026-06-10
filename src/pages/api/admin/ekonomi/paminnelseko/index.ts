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

function n(value: any) {
  const num = Number(String(value ?? "0").replace(",", "."));
  return Number.isFinite(num) ? Number(num.toFixed(2)) : 0;
}

function isoDate(value?: any) {
  if (!value) return "";

  try {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "";

    return date.toISOString().slice(0, 10);
  } catch {
    return "";
  }
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(dateValue: string, days: number) {
  const date = new Date(dateValue + "T00:00:00");
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function daysBetween(start: string, end: string) {
  const a = new Date(start + "T00:00:00").getTime();
  const b = new Date(end + "T00:00:00").getTime();

  if (Number.isNaN(a) || Number.isNaN(b)) return 0;

  return Math.floor((b - a) / 86400000);
}

function isPaid(status: any) {
  return String(status || "").toLowerCase() === "paid";
}

function isArchived(status: any) {
  return String(status || "").toLowerCase() === "archived";
}

function cleanText(value: any) {
  const text = String(value ?? "").trim();
  return text.length ? text : null;
}

function getBaseUrl(req: NextApiRequest) {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;

  if (envUrl) return envUrl.replace(/\/$/, "");

  const host = req.headers.host;

  if (!host) return "http://localhost:3000";

  const proto = host.includes("localhost") ? "http" : "https";

  return proto + "://" + host;
}

async function loadSettings(supabase: any) {
  const defaults = {
    reminder_fee_amount: 60,
    late_interest_percent: 10,
    reminder_payment_days: 7,
  };

  const { data } = await supabase
    .from("company_finance_settings")
    .select("*")
    .eq("settings_key", "default")
    .maybeSingle();

  return {
    reminder_fee_amount: n(data?.reminder_fee_amount || defaults.reminder_fee_amount),
    late_interest_percent: n(data?.late_interest_percent || defaults.late_interest_percent),
    reminder_payment_days: Number(data?.reminder_payment_days || defaults.reminder_payment_days),
  };
}

function buildQueueRow(invoice: any, settings: any) {
  const now = today();
  const dueDate = isoDate(invoice.due_date);
  const nextReminderDate =
    isoDate(invoice.next_reminder_date) ||
    (dueDate ? addDays(dueDate, 1) : now);

  const daysOverdue = dueDate ? Math.max(0, daysBetween(dueDate, now)) : 0;
  const reminderCount = Number(invoice.reminder_count || 0);

  const dueForReminder =
    !isPaid(invoice.status) &&
    !isArchived(invoice.status) &&
    daysOverdue > 0 &&
    nextReminderDate <= now;

  let queueStatus = "upcoming";

  if (dueForReminder) queueStatus = "due";
  if (daysOverdue >= 14 && dueForReminder) queueStatus = "urgent";

  const recommendedIncludeFee = reminderCount >= 1 || daysOverdue >= 7;
  const recommendedIncludeInterest = daysOverdue >= 7;

  return {
    id: invoice.id,
    invoice_number: invoice.invoice_number,
    ocr_number: invoice.ocr_number,
    customer_name: invoice.customer_name,
    customer_email: invoice.customer_email,
    invoice_date: invoice.invoice_date,
    due_date: invoice.due_date,
    status: invoice.status,
    total_amount: n(invoice.total_amount),
    unpaid_amount: n(invoice.unpaid_amount || invoice.total_amount),
    reminder_count: reminderCount,
    last_reminder_sent_at: invoice.last_reminder_sent_at,
    next_reminder_date: nextReminderDate,
    days_overdue: daysOverdue,
    queue_status: queueStatus,
    due_for_reminder: dueForReminder,
    recommended_include_fee: recommendedIncludeFee,
    recommended_include_interest: recommendedIncludeInterest,
    reminder_fee_amount: settings.reminder_fee_amount,
    late_interest_percent: settings.late_interest_percent,
    reminder_payment_days: settings.reminder_payment_days,
    href: "/admin/ekonomi/fakturor/" + invoice.id,
  };
}

async function logReminderQueue(supabase: any, payload: any) {
  try {
    await supabase.from("finance_reminder_queue_log").insert({
      invoice_id: payload.invoice_id,
      action: payload.action,
      status: payload.status,
      message: payload.message,
      include_fee: payload.include_fee,
      include_interest: payload.include_interest,
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.warn("Kunde inte logga påminnelsekö.", error);
  }
}

async function sendReminderViaExistingApi(req: NextApiRequest, invoiceId: string, includeFee: boolean, includeInterest: boolean) {
  const baseUrl = getBaseUrl(req);

  const res = await fetch(
    baseUrl + "/api/admin/ekonomi/fakturor/" + encodeURIComponent(invoiceId) + "/send-reminder-email",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        includeReminderFee: includeFee,
        includeLateInterest: includeInterest,
      }),
    }
  );

  const json = await res.json().catch(() => ({}));

  if (!res.ok || !json.ok) {
    throw new Error(json.error || "Kunde inte skicka påminnelse.");
  }

  return json;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const supabase = getSupabase();
    const settings = await loadSettings(supabase);

    if (req.method === "GET") {
      const filter = String(req.query.filter || "all");

      const { data, error } = await supabase
        .from("finance_invoices")
        .select("*")
        .order("due_date", { ascending: true })
        .limit(1000);

      if (error) throw error;

      let rows = (data || [])
        .filter((invoice: any) => !isPaid(invoice.status))
        .filter((invoice: any) => !isArchived(invoice.status))
        .filter((invoice: any) => n(invoice.unpaid_amount || invoice.total_amount) > 0)
        .map((invoice: any) => buildQueueRow(invoice, settings))
        .filter((row: any) => row.days_overdue > 0);

      if (filter === "due") {
        rows = rows.filter((row: any) => row.due_for_reminder);
      }

      if (filter === "urgent") {
        rows = rows.filter((row: any) => row.queue_status === "urgent");
      }

      const dueRows = rows.filter((row: any) => row.due_for_reminder);

      return res.status(200).json({
        ok: true,
        settings,
        rows,
        summary: {
          totalCount: rows.length,
          dueCount: dueRows.length,
          urgentCount: rows.filter((row: any) => row.queue_status === "urgent").length,
          overdueAmount: Number(rows.reduce((sum: number, row: any) => sum + n(row.unpaid_amount), 0).toFixed(2)),
          dueAmount: Number(dueRows.reduce((sum: number, row: any) => sum + n(row.unpaid_amount), 0).toFixed(2)),
        },
      });
    }

    if (req.method === "POST") {
      const body = req.body || {};
      const action = cleanText(body.action) || "send_one";

      if (action === "send_one") {
        const invoiceId = cleanText(body.invoice_id);

        if (!invoiceId) {
          return res.status(400).json({
            ok: false,
            error: "Faktura-ID saknas.",
          });
        }

        const includeFee = body.include_fee === true;
        const includeInterest = body.include_interest === true;

        try {
          const result = await sendReminderViaExistingApi(req, invoiceId, includeFee, includeInterest);

          await logReminderQueue(supabase, {
            invoice_id: invoiceId,
            action: "send_one",
            status: "sent",
            message: "Påminnelse skickad.",
            include_fee: includeFee,
            include_interest: includeInterest,
          });

          return res.status(200).json({
            ok: true,
            result,
          });
        } catch (error: any) {
          await logReminderQueue(supabase, {
            invoice_id: invoiceId,
            action: "send_one",
            status: "failed",
            message: error?.message || "Kunde inte skicka påminnelse.",
            include_fee: includeFee,
            include_interest: includeInterest,
          });

          throw error;
        }
      }

      if (action === "send_due") {
        const { data, error } = await supabase
          .from("finance_invoices")
          .select("*")
          .order("due_date", { ascending: true })
          .limit(1000);

        if (error) throw error;

        const dueRows = (data || [])
          .filter((invoice: any) => !isPaid(invoice.status))
          .filter((invoice: any) => !isArchived(invoice.status))
          .filter((invoice: any) => n(invoice.unpaid_amount || invoice.total_amount) > 0)
          .map((invoice: any) => buildQueueRow(invoice, settings))
          .filter((row: any) => row.due_for_reminder);

        const results: any[] = [];

        for (const row of dueRows) {
          const includeFee =
            body.use_recommended === true
              ? row.recommended_include_fee
              : body.include_fee === true;

          const includeInterest =
            body.use_recommended === true
              ? row.recommended_include_interest
              : body.include_interest === true;

          try {
            const result = await sendReminderViaExistingApi(req, row.id, includeFee, includeInterest);

            await logReminderQueue(supabase, {
              invoice_id: row.id,
              action: "send_due",
              status: "sent",
              message: "Påminnelse skickad från kö.",
              include_fee: includeFee,
              include_interest: includeInterest,
            });

            results.push({
              invoice_id: row.id,
              invoice_number: row.invoice_number,
              ok: true,
              result,
            });
          } catch (error: any) {
            await logReminderQueue(supabase, {
              invoice_id: row.id,
              action: "send_due",
              status: "failed",
              message: error?.message || "Kunde inte skicka påminnelse.",
              include_fee: includeFee,
              include_interest: includeInterest,
            });

            results.push({
              invoice_id: row.id,
              invoice_number: row.invoice_number,
              ok: false,
              error: error?.message || "Kunde inte skicka påminnelse.",
            });
          }
        }

        return res.status(200).json({
          ok: true,
          checkedCount: dueRows.length,
          sentCount: results.filter((item) => item.ok).length,
          failedCount: results.filter((item) => !item.ok).length,
          results,
        });
      }

      return res.status(400).json({
        ok: false,
        error: "Okänd åtgärd.",
      });
    }

    return res.status(405).json({
      ok: false,
      error: "Method not allowed",
    });
  } catch (error: any) {
    console.error("/api/admin/ekonomi/paminnelseko error", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte hantera påminnelsekön.",
    });
  }
}
