import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import { createLoginCode, hashLoginCode } from "@/lib/personalAuth";

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

function cleanEmail(value: any) {
  return String(value || "").trim().toLowerCase();
}

function employeeName(employee: any) {
  return [employee?.first_name, employee?.last_name].filter(Boolean).join(" ") || "medarbetare";
}

async function findEmployeeByEmail(supabase: any, email: string) {
  const { data: employees, error: employeeError } = await supabase
    .from("staff_employees")
    .select("*")
    .ilike("email", email)
    .limit(1);

  if (employeeError) throw employeeError;

  if (employees?.[0]) return employees[0];

  const { data: bankDetails, error: bankError } = await supabase
    .from("payroll_employee_bank_details")
    .select("*")
    .ilike("payslip_email", email)
    .eq("is_active", true)
    .limit(1);

  if (bankError) return null;

  const bankDetail = bankDetails?.[0];

  if (!bankDetail?.employee_id) return null;

  const { data: employeeFromBank, error: employeeFromBankError } = await supabase
    .from("staff_employees")
    .select("*")
    .eq("id", bankDetail.employee_id)
    .maybeSingle();

  if (employeeFromBankError) throw employeeFromBankError;

  return employeeFromBank || null;
}

function buildEmailHtml(code: string, employee: any) {
  return `
    <div style="font-family: Arial, sans-serif; background:#f5f4f0; padding:24px;">
      <div style="max-width:620px; margin:0 auto; background:#ffffff; border-radius:16px; padding:28px; border:1px solid #e5e7eb;">
        <div style="font-size:13px; letter-spacing:2px; text-transform:uppercase; color:#00645d; font-weight:700;">
          Helsingbuss Personal
        </div>

        <h1 style="margin:12px 0 8px; color:#194C66; font-size:26px;">
          Din inloggningskod
        </h1>

        <p style="color:#334155; font-size:15px; line-height:1.6;">
          Hej ${employeeName(employee)},
        </p>

        <p style="color:#334155; font-size:15px; line-height:1.6;">
          Använd koden nedan för att logga in och se dina lönebesked.
        </p>

        <div style="margin:24px 0; padding:18px; background:#f8fafc; border-radius:12px; text-align:center;">
          <div style="font-size:34px; letter-spacing:8px; color:#194C66; font-weight:800;">
            ${code}
          </div>
        </div>

        <p style="color:#64748b; font-size:13px; line-height:1.6;">
          Koden gäller i 15 minuter. Om du inte begärt koden kan du bortse från detta mejl.
        </p>
      </div>
    </div>
  `;
}

function buildEmailText(code: string, employee: any) {
  return [
    "Hej " + employeeName(employee) + ",",
    "",
    "Din inloggningskod till Helsingbuss Personal är:",
    "",
    code,
    "",
    "Koden gäller i 15 minuter.",
    "",
    "Helsingbuss",
  ].join("\n");
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
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

    const email = cleanEmail(req.body?.email);

    if (!email || !email.includes("@")) {
      return res.status(400).json({
        ok: false,
        error: "Skriv en giltig e-postadress.",
      });
    }

    const supabase = getSupabase();
    const employee = await findEmployeeByEmail(supabase, email);

    if (!employee) {
      return res.status(200).json({
        ok: true,
        message: "Om e-postadressen finns hos oss skickas en kod.",
      });
    }

    const code = createLoginCode();
    const codeHash = hashLoginCode(email, code);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    const { error: insertError } = await supabase
      .from("personal_login_codes")
      .insert({
        employee_id: employee.id,
        email,
        code_hash: codeHash,
        expires_at: expiresAt,
      });

    if (insertError) throw insertError;

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + resendApiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [email],
        subject: "Din inloggningskod till Helsingbuss Personal",
        html: buildEmailHtml(code, employee),
        text: buildEmailText(code, employee),
      }),
    });

    const resendJson: any = await resendResponse.json().catch(() => ({}));

    if (!resendResponse.ok) {
      return res.status(500).json({
        ok: false,
        error:
          resendJson?.message ||
          resendJson?.error ||
          "Kunde inte skicka inloggningskod.",
      });
    }

    return res.status(200).json({
      ok: true,
      message: "Kod skickad.",
    });
  } catch (error: any) {
    console.error("/api/personal/auth/send-code error", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte skicka kod.",
    });
  }
}
