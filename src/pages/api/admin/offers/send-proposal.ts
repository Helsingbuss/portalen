import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import { sendOfferMail } from "@/lib/sendMail";
import { signOfferToken } from "@/lib/offerToken";

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

const U = <T extends string | number | null | undefined>(v: T) =>
  v == null || v === "" ? undefined : (v as Exclude<T, null>);

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

function customerBaseUrl() {
  const base =
    process.env.NEXT_PUBLIC_CUSTOMER_BASE_URL ||
    process.env.CUSTOMER_BASE_URL ||
    "https://kund.helsingbuss.se";

  return base.replace(/\/+$/, "");
}

function getOfferReference(offer: any) {
  return (
    safeText(offer.offer_number) ||
    safeText(offer.synergybus_id) ||
    safeText(offer.id)
  );
}

function getCustomerName(offer: any) {
  return (
    safeText(offer.contact_person) ||
    safeText(offer.customer_name) ||
    safeText(offer.Namn_efternamn) ||
    safeText(offer.foretag_forening) ||
    "kund"
  );
}

function getCustomerEmail(offer: any) {
  return (
    safeText(offer.contact_email) ||
    safeText(offer.customer_email) ||
    safeText(offer.email)
  );
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
  return (
    safeText(offer.departure_date) ||
    safeText(offer.travel_date) ||
    safeText(offer.offer_date)
  );
}

function getTravelTime(offer: any) {
  return safeText(offer.departure_time) || safeText(offer.travel_time);
}

function getPassengers(offer: any) {
  const value = Number(offer.passengers || offer.passenger_count || 0);
  return Number.isFinite(value) && value > 0 ? value : undefined;
}

function getProposalStatusAfterSend(offer: any) {
  const current = safeText(offer.status).toLowerCase();

  if (!current || ["inkommen", "new", "incoming", "draft"].includes(current)) {
    return "besvarad";
  }

  return safeText(offer.status) || "besvarad";
}

async function verifyUser(req: NextApiRequest) {
  const supabaseUrl = getRequiredEnv(
    "SUPABASE_URL",
    process.env.NEXT_PUBLIC_SUPABASE_URL
  );

  const anonKey = getRequiredEnv(
    "SUPABASE_ANON_KEY",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_KEY
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
    console.log("[admin/offers/send-proposal] Role check skipped:", error.message);
    return;
  }

  if (!data || data.length === 0) {
    throw new Error("Du saknar behörighet att skicka prisförslag.");
  }
}

function buildCustomerOfferLink(offer: any, reference: string) {
  const token = signOfferToken({
    offerId: String(offer.id),
    offerNumber: reference,
  });

  const base = customerBaseUrl();

  return `${base}/offert/${encodeURIComponent(reference)}?token=${encodeURIComponent(
    token
  )}&t=${encodeURIComponent(token)}`;
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

    const offerId = safeText(req.body?.offerId || req.body?.offer_id);

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

    const priceTotal = Number(offer.price_total || offer.total_amount || offer.total_price || 0);

    if (!Number.isFinite(priceTotal) || priceTotal <= 0) {
      return res.status(400).json({
        ok: false,
        error: "Offerten saknar sparat prisförslag. Spara kalkylen först.",
      });
    }

    const reference = getOfferReference(offer);
    const customerOfferLink = buildCustomerOfferLink(offer, reference);

    const notesParts = [
      safeText(offer.price_note),
      safeText(offer.notes),
      getCustomerPhone(offer) ? `Telefon: ${getCustomerPhone(offer)}` : "",
    ].filter(Boolean);

    await sendOfferMail({
      offerId: String(offer.id),
      offerNumber: reference,

      customerEmail,
      customerName: U(getCustomerName(offer)),

      from: U(getDeparture(offer)),
      to: U(getDestination(offer)),
      date: U(getTravelDate(offer)),
      time: U(getTravelTime(offer)),
      via: U(offer.via),
      stop: U(offer.stop),
      passengers: getPassengers(offer),

      return_from: U(offer.return_departure),
      return_to: U(offer.return_destination),
      return_date: U(offer.return_date),
      return_time: U(offer.return_time),

      notes: notesParts.length ? notesParts.join("\n") : undefined,

      subject: `Offert ${reference} – prisförslag från Helsingbuss`,
      link: customerOfferLink,
    });

    const nextStatus = getProposalStatusAfterSend(offer);

    await adminClient
      .from("offers")
      .update({
        status: nextStatus,
        proposal_status: "sent",
        proposal_sent_at: new Date().toISOString(),
        proposal_sent_by: user.id,
        proposal_sent_to: customerEmail,
        proposal_send_error: null,
        proposal_updated_at: new Date().toISOString(),
      })
      .eq("id", offerId);

    return res.status(200).json({
      ok: true,
      emailId: "",
      offerId,
      sentTo: customerEmail,
      reference,
    });
  } catch (error: any) {
    console.error("[admin/offers/send-proposal] error:", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte skicka prisförslaget.",
    });
  }
}
