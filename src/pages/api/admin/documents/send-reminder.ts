import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

type ApiResponse =
  | {
      ok: true;
      emailId: string;
      documentId: string;
      sentTo: string;
      reminderCount: number;
    }
  | {
      ok: false;
      error: string;
      details?: any;
    };

function safeText(value: any) {
  return String(value || "").trim();
}

function getRequiredEnv(name: string, fallback?: string) {
  const value = process.env[name] || fallback;

  if (!value) {
    throw new Error(`Missing env: ${name}`);
  }

  return value;
}

function formatDate(value: any) {
  const clean = safeText(value);

  if (!clean) return "Ej angivet";

  const parsed = new Date(clean);

  if (Number.isNaN(parsed.getTime())) return clean;

  return new Intl.DateTimeFormat("sv-SE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(parsed);
}

function getDocumentTypeLabel(type: string) {
  const clean = safeText(type).toLowerCase();

  if (clean === "agreement") return "Avtal";
  if (clean === "permit") return "Tillstånd";
  if (clean === "internal") return "Internt underlag";
  if (clean === "vehicle") return "Fordonsdokument";
  if (clean === "operator") return "Operatörsdokument";
  if (clean === "staff") return "Personalunderlag";

  return "Dokument";
}

async function verifyUser(req: NextApiRequest) {
  const supabaseUrl = getRequiredEnv(
    "SUPABASE_URL",
    process.env.NEXT_PUBLIC_SUPABASE_URL
  );

  const anonKey = getRequiredEnv(
    "SUPABASE_ANON_KEY",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_KEY
  );

  const authHeader = req.headers.authorization || "";
  const token = authHeader.replace("Bearer ", "").trim();

  if (!token) {
    throw new Error("Saknar inloggningstoken.");
  }

  const authClient = createClient(supabaseUrl, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { data, error } = await authClient.auth.getUser(token);

  if (error || !data.user) {
    throw new Error("Kunde inte verifiera användaren.");
  }

  return data.user;
}

function createAdminClient() {
  const supabaseUrl = getRequiredEnv(
    "SUPABASE_URL",
    process.env.NEXT_PUBLIC_SUPABASE_URL
  );

  const serviceKey = getRequiredEnv(
    "SUPABASE_SERVICE_ROLE_KEY",
    process.env.SUPABASE_SERVICE_KEY
  );

  return createClient(supabaseUrl, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

async function optionalAdminRoleCheck(adminClient: any, userId: string) {
  const { data, error } = await adminClient
    .from("app_user_roles")
    .select("role_key")
    .eq("user_id", userId)
    .in("role_key", ["admin", "owner", "super_admin"]);

  if (error) {
    console.log("Document reminder role check skipped:", error.message);
    return;
  }

  if (!data || data.length === 0) {
    throw new Error("Du saknar behörighet att skicka dokumentpåminnelser.");
  }
}

function buildReminderHtml(document: any) {
  const title = safeText(document.title) || "Dokument";
  const type = getDocumentTypeLabel(document.document_type);
  const expiresAt = formatDate(document.expires_at);
  const status = safeText(document.status) || "active";
  const category = safeText(document.category);
  const description = safeText(document.description);

  return `
    <div style="font-family: Arial, sans-serif; color:#1D2937; line-height:1.55;">
      <div style="background:#003C3A;color:#ffffff;border-radius:18px;padding:22px;margin-bottom:22px;">
        <h1 style="margin:0;font-size:23px;">Dokumentpåminnelse</h1>
        <p style="margin:8px 0 0;color:#DDEBE8;">Helsingbuss administrativt underlag</p>
      </div>

      <p>Hej!</p>

      <p>Detta är en påminnelse om ett dokument som behöver kontrolleras.</p>

      <div style="background:#F6F8F7;border:1px solid #E2E8E6;border-radius:16px;padding:16px;margin:18px 0;">
        <p><strong>Dokument:</strong> ${title}</p>
        <p><strong>Typ:</strong> ${type}</p>
        ${category ? `<p><strong>Kategori:</strong> ${category}</p>` : ""}
        <p><strong>Status:</strong> ${status}</p>
        <p><strong>Giltigt till:</strong> ${expiresAt}</p>
      </div>

      ${
        description
          ? `<div style="background:#F9F5E8;border:1px solid #EFE4BE;border-radius:16px;padding:16px;margin:18px 0;">
              <strong>Beskrivning:</strong><br />
              ${description.replace(/\n/g, "<br />")}
            </div>`
          : ""
      }

      <p>Kontrollera dokumentet i appen och uppdatera giltighet, fil eller status vid behov.</p>

      <p>Vänliga hälsningar,<br />Helsingbuss</p>
    </div>
  `;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      error: "Method not allowed",
    });
  }

  try {
    const user = await verifyUser(req);
    const adminClient = createAdminClient();

    await optionalAdminRoleCheck(adminClient, user.id);

    const documentId = safeText(req.body?.documentId);
    const customTo = safeText(req.body?.to);

    if (!documentId) {
      return res.status(400).json({
        ok: false,
        error: "documentId saknas.",
      });
    }

    await adminClient.rpc("refresh_app_documents_expired_status").catch(() => null);

    const { data: document, error: documentError } = await adminClient
      .from("app_documents")
      .select("*")
      .eq("id", documentId)
      .single();

    if (documentError || !document) {
      return res.status(404).json({
        ok: false,
        error: "Dokumentet hittades inte.",
        details: documentError,
      });
    }

    const resendKey = getRequiredEnv("RESEND_API_KEY");

    const from =
      process.env.DOCUMENT_MAIL_FROM ||
      process.env.MAIL_FROM ||
      process.env.EMAIL_FROM ||
      "Helsingbuss <info@helsingbuss.se>";

    const replyTo =
      process.env.DOCUMENT_REPLY_TO ||
      process.env.EMAIL_REPLY_TO ||
      process.env.MAIL_REPLY_TO ||
      "info@helsingbuss.se";

    const fallbackTo =
      process.env.DOCUMENTS_ADMIN_EMAIL ||
      process.env.ADMIN_ALERT_EMAIL ||
      process.env.TRAVELS_ADMIN_EMAIL ||
      "info@helsingbuss.se";

    const forceTo = safeText(process.env.MAIL_FORCE_TO);
    const sentTo = forceTo || customTo || fallbackTo;

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [sentTo],
        reply_to: replyTo,
        subject: `Dokumentpåminnelse: ${safeText(document.title) || "Dokument"}`,
        html: buildReminderHtml(document),
      }),
    });

    const resendJson = await resendResponse.json();

    if (!resendResponse.ok) {
      await adminClient
        .from("app_documents")
        .update({
          last_reminder_error: JSON.stringify(resendJson),
          updated_at: new Date().toISOString(),
        })
        .eq("id", documentId);

      return res.status(500).json({
        ok: false,
        error: "Resend kunde inte skicka dokumentpåminnelsen.",
        details: resendJson,
      });
    }

    const emailId = String(resendJson?.id || "");
    const newReminderCount = Number(document.reminder_count || 0) + 1;

    await adminClient
      .from("app_documents")
      .update({
        reminder_count: newReminderCount,
        last_reminder_at: new Date().toISOString(),
        last_reminder_to: sentTo,
        last_reminder_email_id: emailId,
        last_reminder_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", documentId);

    return res.status(200).json({
      ok: true,
      emailId,
      documentId,
      sentTo,
      reminderCount: newReminderCount,
    });
  } catch (error: any) {
    console.error("Send document reminder error:", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte skicka dokumentpåminnelsen.",
    });
  }
}
