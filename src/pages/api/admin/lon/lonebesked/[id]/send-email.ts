import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;

const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY;

const resendApiKey = process.env.RESEND_API_KEY;

const fromEmail =
  process.env.RESEND_FROM_EMAIL ||
  process.env.EMAIL_FROM ||
  "Helsingbuss <no-reply@helsingbuss.se>";

const appUrl =
  process.env.APP_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  "http://localhost:3000";

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

function safeText(value: any) {
  return String(value ?? "").trim();
}

function fmtDate(value: any) {
  if (!value) return "—";

  try {
    return new Intl.DateTimeFormat("sv-SE", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(new Date(value));
  } catch {
    return String(value);
  }
}

function isMissingColumnError(error: any) {
  const message = String(error?.message || "").toLowerCase();
  const code = String(error?.code || "").toLowerCase();

  return (
    code === "42703" ||
    code === "pgrst204" ||
    message.includes("email_provider_id") ||
    message.includes("schema cache")
  );
}

async function updateEmailStatus(supabase: any, id: string, updateData: any) {
  const { error } = await supabase
    .from("payroll_run_rows")
    .update(updateData)
    .eq("id", id);

  if (!error) return;

  if (isMissingColumnError(error) && "email_provider_id" in updateData) {
    const retryData = { ...updateData };
    delete retryData.email_provider_id;

    const { error: retryError } = await supabase
      .from("payroll_run_rows")
      .update(retryData)
      .eq("id", id);

    if (retryError) throw retryError;
    return;
  }

  throw error;
}

function buildEmailHtml(employeeName: string, run: any) {
  const period = fmtDate(run?.period_start) + " - " + fmtDate(run?.period_end);
  const payoutDate = fmtDate(run?.payout_date);

  return `
    <div style="font-family: Arial, sans-serif; background:#f5f4f0; padding:24px;">
      <div style="max-width:620px; margin:0 auto; background:#ffffff; border-radius:16px; padding:28px; border:1px solid #e5e7eb;">
        <div style="font-size:13px; letter-spacing:2px; text-transform:uppercase; color:#00645d; font-weight:700;">
          Helsingbuss
        </div>

        <h1 style="margin:12px 0 8px; color:#194C66; font-size:26px;">
          Ditt lönebesked är klart
        </h1>

        <p style="color:#334155; font-size:15px; line-height:1.6;">
          Hej ${employeeName},
        </p>

        <p style="color:#334155; font-size:15px; line-height:1.6;">
          Ditt lönebesked för perioden <strong>${period}</strong> finns nu tillgängligt.
        </p>

        <p style="color:#334155; font-size:15px; line-height:1.6;">
          Utbetalningsdatum: <strong>${payoutDate}</strong>
        </p>

        <div style="margin:22px 0; padding:16px; background:#f8fafc; border-radius:12px; color:#475569; font-size:14px; line-height:1.6;">
          Av säkerhetsskäl skickas inte lönebeskedet som bifogad PDF i detta mejl. Logga in i personalappen eller portalen för att se lönebeskedet.
        </div>

        <p style="margin-top:22px;">
          <a href="${appUrl}/personal/lonebesked" style="display:inline-block; background:#00645d; color:#ffffff; text-decoration:none; padding:12px 18px; border-radius:10px; font-weight:700;">
            Öppna personalappen
          </a>
        </p>

        <p style="color:#64748b; font-size:12px; line-height:1.6; margin-top:26px;">
          Detta är en automatisk avisering från Helsingbuss.
        </p>
      </div>
    </div>
  `;
}

function buildEmailText(employeeName: string, run: any) {
  const period = fmtDate(run?.period_start) + " - " + fmtDate(run?.period_end);
  const payoutDate = fmtDate(run?.payout_date);

  return [
    "Hej " + employeeName + ",",
    "",
    "Ditt lönebesked för perioden " + period + " finns nu tillgängligt.",
    "Utbetalningsdatum: " + payoutDate,
    "",
    "Av säkerhetsskäl skickas inte lönebeskedet som bifogad PDF i detta mejl.",
    "Logga in i personalappen eller portalen för att se lönebeskedet.",
    "",
    appUrl + "/personal/lonebesked",
    "",
    "Helsingbuss",
  ].join("\n");
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
    if (req.method !== "POST") {
      return res.status(405).json({
        ok: false,
        error: "Method not allowed",
      });
    }

    if (!resendApiKey) {
      return res.status(400).json({
        ok: false,
        error: "RESEND_API_KEY saknas i .env.local.",
      });
    }

    const supabase = getSupabase();

    const { data: payslip, error: payslipError } = await supabase
      .from("payroll_run_rows")
      .select("*")
      .eq("id", id)
      .single();

    if (payslipError) throw payslipError;

    let run: any = null;

    if (payslip?.payroll_run_id) {
      const { data: runData, error: runError } = await supabase
        .from("payroll_runs")
        .select("*")
        .eq("id", payslip.payroll_run_id)
        .single();

      if (runError) throw runError;
      run = runData;
    }

    let employee: any = null;

    if (payslip?.employee_id) {
      const { data: employeeData } = await supabase
        .from("staff_employees")
        .select("*")
        .eq("id", payslip.employee_id)
        .maybeSingle();

      employee = employeeData || null;
    }

    let bankDetail: any = null;

    if (payslip?.employee_id) {
      const { data: bankData } = await supabase
        .from("payroll_employee_bank_details")
        .select("*")
        .eq("employee_id", payslip.employee_id)
        .eq("is_active", true)
        .maybeSingle();

      bankDetail = bankData || null;
    }

    const toEmail =
      safeText(bankDetail?.payslip_email) ||
      safeText(employee?.email);

    if (!toEmail) {
      await updateEmailStatus(supabase, id, {
        email_status: "failed",
        delivery_notes:
          safeText(payslip.delivery_notes) +
          "\nE-post misslyckades: saknar e-postadress.",
        updated_at: new Date().toISOString(),
      });

      return res.status(400).json({
        ok: false,
        error: "Den anställda saknar e-postadress för lönebesked.",
      });
    }

    const employeeName =
      safeText(payslip.employee_name_snapshot) ||
      [employee?.first_name, employee?.last_name].filter(Boolean).join(" ") ||
      "medarbetare";

    await updateEmailStatus(supabase, id, {
      email_status: "queued",
      updated_at: new Date().toISOString(),
    });

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + resendApiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [toEmail],
        subject: "Ditt lönebesked är klart",
        html: buildEmailHtml(employeeName, run),
        text: buildEmailText(employeeName, run),
      }),
    });

    const resendJson: any = await resendResponse.json().catch(() => ({}));

    if (!resendResponse.ok) {
      await updateEmailStatus(supabase, id, {
        email_status: "failed",
        delivery_notes:
          safeText(payslip.delivery_notes) +
          "\nE-post misslyckades: " +
          safeText(resendJson?.message || resendJson?.error || "Okänt fel"),
        updated_at: new Date().toISOString(),
      });

      return res.status(500).json({
        ok: false,
        error:
          resendJson?.message ||
          resendJson?.error ||
          "Kunde inte skicka e-postavisering.",
      });
    }

    const providerId = resendJson?.id || resendJson?.data?.id || null;

    await updateEmailStatus(supabase, id, {
      email_status: "sent",
      email_sent_at: new Date().toISOString(),
      email_provider_id: providerId,
      delivery_notes:
        safeText(payslip.delivery_notes) +
        "\nE-postavisering skickad till " +
        toEmail +
        ".",
      updated_at: new Date().toISOString(),
    });

    return res.status(200).json({
      ok: true,
      to: toEmail,
      providerId,
    });
  } catch (error: any) {
    console.error("/api/admin/lon/lonebesked/[id]/send-email error", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte skicka e-postavisering.",
    });
  }
}
