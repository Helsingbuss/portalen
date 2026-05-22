import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

type ApiResponse =
  | {
      ok: true;
      emailId: string;
      offerId: string;
      sentTo: string;
      reference: string;
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

function money(value: number) {
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: "SEK",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function getOfferReference(offer: any) {
  return safeText(offer.offer_number) || safeText(offer.synergybus_id) || safeText(offer.id);
}

function getCustomerName(offer: any) {
  return (
    safeText(offer.customer_name) ||
    safeText(offer.contact_person) ||
    safeText(offer.Namn_efternamn) ||
    safeText(offer.foretag_forening) ||
    "kund"
  );
}

function getCustomerEmail(offer: any) {
  return safeText(offer.customer_email) || safeText(offer.email);
}

function getCustomerPhone(offer: any) {
  return safeText(offer.customer_phone) || safeText(offer.phone);
}

function getDeparture(offer: any) {
  return (
    safeText(offer.departure_place) ||
    safeText(offer.departure) ||
    safeText(offer.departure_city)
  );
}

function getDestination(offer: any) {
  return (
    safeText(offer.destination) ||
    safeText(offer.destination_city) ||
    safeText(offer.final_destination)
  );
}

function getTravelDate(offer: any) {
  return safeText(offer.departure_date) || safeText(offer.travel_date) || safeText(offer.offer_date);
}

function getProposalStatusAfterSend(offer: any) {
  const current = safeText(offer.status).toLowerCase();

  if (!current || ["inkommen", "new", "incoming", "draft"].includes(current)) {
    return "besvarad";
  }

  return safeText(offer.status);
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
    console.log("Offer proposal role check skipped:", error.message);
    return;
  }

  if (!data || data.length === 0) {
    throw new Error("Du saknar behörighet att skicka prisförslag.");
  }
}

function buildProposalHtml(offer: any) {
  const reference = getOfferReference(offer);
  const customerName = getCustomerName(offer);
  const departure = getDeparture(offer);
  const destination = getDestination(offer);
  const travelDate = getTravelDate(offer);

  const priceExVat = Number(offer.price_ex_vat || 0);
  const vatAmount = Number(offer.price_vat_amount || 0);
  const priceTotal = Number(offer.price_total || 0);
  const vatRate = Number(offer.price_vat_rate || 6);
  const priceNote = safeText(offer.price_note);

  return `
    <div style="font-family: Arial, sans-serif; color: #1D2937; line-height: 1.55;">
      <div style="background:#003C3A;color:#ffffff;border-radius:18px;padding:22px;margin-bottom:22px;">
        <h1 style="margin:0;font-size:24px;">Prisförslag från Helsingbuss</h1>
        <p style="margin:8px 0 0;color:#DDEBE8;">Offert ${reference}</p>
      </div>

      <p>Hej ${customerName}!</p>

      <p>
        Tack för din förfrågan. Här kommer vårt prisförslag från Helsingbuss.
      </p>

      <div style="background:#F6F8F7;border:1px solid #E2E8E6;border-radius:16px;padding:16px;margin:18px 0;">
        <p style="margin:0 0 8px;"><strong>Resa:</strong> ${departure || "Start ej angiven"} → ${destination || "Destination ej angiven"}</p>
        ${travelDate ? `<p style="margin:0 0 8px;"><strong>Datum:</strong> ${travelDate}</p>` : ""}
        <p style="margin:0;"><strong>Referens:</strong> ${reference}</p>
      </div>

      <div style="background:#ffffff;border:1px solid #E2E8E6;border-radius:16px;padding:16px;margin:18px 0;">
        <h2 style="color:#003C3A;font-size:18px;margin:0 0 12px;">Pris</h2>

        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:8px 0;color:#52616D;">Pris exkl. moms</td>
            <td style="padding:8px 0;text-align:right;font-weight:700;">${money(priceExVat)}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#52616D;">Moms ${vatRate}%</td>
            <td style="padding:8px 0;text-align:right;font-weight:700;">${money(vatAmount)}</td>
          </tr>
          <tr>
            <td style="padding:12px 0;border-top:2px solid #003C3A;font-weight:800;color:#003C3A;">Totalt inkl. moms</td>
            <td style="padding:12px 0;border-top:2px solid #003C3A;text-align:right;font-size:20px;font-weight:900;color:#003C3A;">${money(priceTotal)}</td>
          </tr>
        </table>
      </div>

      ${
        priceNote
          ? `<div style="background:#F9F5E8;border:1px solid #EFE4BE;border-radius:16px;padding:16px;margin:18px 0;">
              <strong>Kommentar:</strong><br />
              ${priceNote.replace(/\n/g, "<br />")}
            </div>`
          : ""
      }

      <p>
        Återkom gärna om ni vill gå vidare, justera något i upplägget eller har frågor kring resan.
      </p>

      <p>
        Vänliga hälsningar,<br />
        Helsingbuss
      </p>
    </div>
  `;
}

function buildProposalText(offer: any) {
  const reference = getOfferReference(offer);
  const customerName = getCustomerName(offer);
  const departure = getDeparture(offer);
  const destination = getDestination(offer);
  const travelDate = getTravelDate(offer);

  return [
    `Hej ${customerName}!`,
    "",
    "Tack för din förfrågan. Här kommer vårt prisförslag från Helsingbuss.",
    "",
    `Offert: ${reference}`,
    `Resa: ${departure || "Start ej angiven"} → ${destination || "Destination ej angiven"}`,
    travelDate ? `Datum: ${travelDate}` : "",
    "",
    `Pris exkl. moms: ${money(Number(offer.price_ex_vat || 0))}`,
    `Moms ${Number(offer.price_vat_rate || 6)}%: ${money(Number(offer.price_vat_amount || 0))}`,
    `Totalt inkl. moms: ${money(Number(offer.price_total || 0))}`,
    "",
    safeText(offer.price_note) ? `Kommentar: ${safeText(offer.price_note)}` : "",
    "",
    "Vänliga hälsningar,",
    "Helsingbuss",
  ]
    .filter(Boolean)
    .join("\n");
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

    const offerId = safeText(req.body?.offerId);

    if (!offerId) {
      return res.status(400).json({
        ok: false,
        error: "offerId saknas.",
      });
    }

    const { data: offer, error: offerError } = await adminClient
      .from("offers")
      .select("*")
      .eq("id", offerId)
      .single();

    if (offerError || !offer) {
      return res.status(404).json({
        ok: false,
        error: "Offerten hittades inte.",
        details: offerError,
      });
    }

    const customerEmail = getCustomerEmail(offer);

    if (!customerEmail) {
      return res.status(400).json({
        ok: false,
        error: "Offerten saknar kundens e-postadress.",
      });
    }

    const priceTotal = Number(offer.price_total || 0);

    if (!Number.isFinite(priceTotal) || priceTotal <= 0) {
      return res.status(400).json({
        ok: false,
        error: "Offerten saknar sparat prisförslag. Spara kalkylen först.",
      });
    }

    const resendKey = getRequiredEnv("RESEND_API_KEY");

    const from =
      process.env.OFFER_MAIL_FROM ||
      process.env.MAIL_FROM ||
      process.env.EMAIL_FROM ||
      "Helsingbuss <info@helsingbuss.se>";

    const replyTo =
      process.env.OFFER_REPLY_TO ||
      process.env.EMAIL_REPLY_TO ||
      process.env.MAIL_REPLY_TO ||
      "info@helsingbuss.se";

    const forceTo = safeText(process.env.MAIL_FORCE_TO);
    const sentTo = forceTo || customerEmail;
    const reference = getOfferReference(offer);

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
        subject: `Prisförslag från Helsingbuss ${reference}`,
        html: buildProposalHtml(offer),
        text: buildProposalText(offer),
      }),
    });

    const resendJson = await resendResponse.json();

    if (!resendResponse.ok) {
      await adminClient
        .from("offers")
        .update({
          proposal_send_error: JSON.stringify(resendJson),
          proposal_status: "send_error",
          proposal_updated_at: new Date().toISOString(),
        })
        .eq("id", offerId);

      return res.status(500).json({
        ok: false,
        error: "Resend kunde inte skicka prisförslaget.",
        details: resendJson,
      });
    }

    const emailId = String(resendJson?.id || "");
    const nextStatus = getProposalStatusAfterSend(offer);

    await adminClient
      .from("offers")
      .update({
        status: nextStatus,
        proposal_status: "sent",
        proposal_sent_at: new Date().toISOString(),
        proposal_sent_by: user.id,
        proposal_sent_to: sentTo,
        proposal_email_id: emailId,
        proposal_send_error: null,
        proposal_updated_at: new Date().toISOString(),
      })
      .eq("id", offerId);

    return res.status(200).json({
      ok: true,
      emailId,
      offerId,
      sentTo,
      reference,
    });
  } catch (error: any) {
    console.error("Send offer proposal error:", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte skicka prisförslaget.",
    });
  }
}
