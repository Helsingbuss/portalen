// src/pages/api/offert/create.ts
import type { NextApiRequest, NextApiResponse } from "next";
import * as admin from "@/lib/supabaseAdmin";
import { sendOfferMail } from "@/lib/sendOfferMail";
import { Resend } from "resend";
import cors from "@/lib/cors"; // ✅ CORS


// ---- Supabase klient (tål olika exports) ----
const supabase =
  (admin as any).supabaseAdmin ||
  (admin as any).supabase ||
  (admin as any).default;

// ---- Env helpers ----
const env = (v?: string | null) => (v ?? "").trim();
const lc = (v?: string | null) => env(v).toLowerCase();

const RESEND_API_KEY = env(process.env.RESEND_API_KEY);
const EMAIL_FROM     = env(process.env.EMAIL_FROM) || "Helsingbuss <no-reply@helsingbuss.se>";
const EMAIL_REPLY_TO = env(process.env.EMAIL_REPLY_TO) || "kundteam@helsingbuss.se";

const SUPPORT_INBOX  = lc(process.env.SUPPORT_INBOX) || "kundteam@helsingbuss.se";
const OFFERS_INBOX   = lc(process.env.OFFERS_INBOX)  || "offert@helsingbuss.se";

// kunddomän för publika vyer
const CUSTOMER_BASE_URL =
  env(process.env.CUSTOMER_BASE_URL) ||
  env(process.env.NEXT_PUBLIC_CUSTOMER_BASE_URL) ||
  env(process.env.NEXT_PUBLIC_BASE_URL); // sista utvägen

// ---- Små helpers ----
function toNull<T = any>(v: T | null | undefined): T | null {
  return v === "" || v === undefined ? null : (v as any);
}
function pickYmd(v?: string | null) {
  if (!v) return null;
  return v.length >= 10 ? v.slice(0, 10) : v;
}
function parseNumber(n: any): number | null {
  if (typeof n === "number") return Number.isFinite(n) ? n : null;
  const t = Number(n);
  return Number.isFinite(t) ? t : null;
}
function httpErr(res: NextApiResponse, code: number, msg: string) {
  console.error(`[offert/create] ${code} ${msg}`);
  return res.status(code).json({ error: msg });
}
function nextOfferNumberFactory(prefixYear?: string) {
  const yy = prefixYear ?? new Date().getFullYear().toString().slice(-2); // "25"
  return async function next(): Promise<string> {
    const { data: lastOffer } = await supabase
      .from("offers")
      .select("offer_number")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let nextNum = 7; // start fallback (HB{YY}007)
    if (lastOffer?.offer_number) {
      // plocka ut löpnumret efter "HBxx"
      const m = String(lastOffer.offer_number).match(/^HB(\d{2})(\d{3,})$/);
      if (m) {
        const lastYY = m[1];
        const lastRun = parseInt(m[2], 10);
        nextNum = (lastYY === yy && Number.isFinite(lastRun)) ? lastRun + 1 : 7;
      } else {
        // äldre format? ta sista siffrorna efter HBYY
        const tail = parseInt(String(lastOffer.offer_number).replace(/^HB\d{2}/, ""), 10);
        if (Number.isFinite(tail)) nextNum = tail + 1;
      }
    }
    return `HB${yy}${String(nextNum).padStart(3, "0")}`;
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // 1) CORS
  const proceeded = await cors(req, res, {
    allowOrigins: [
      env(process.env.NEXT_PUBLIC_CUSTOMER_BASE_URL),
      env(process.env.CUSTOMER_BASE_URL),
      env(process.env.NEXT_PUBLIC_BASE_URL),
      env(process.env.NEXT_PUBLIC_LOGIN_BASE_URL),
      "http://localhost:3000",
      "http://127.0.0.1:3000",
    ].filter(Boolean),
    allowMethods: ["POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  });
  if (proceeded === false) return; // preflight svarat

  if (req.method !== "POST") return httpErr(res, 405, "Method not allowed");

  // 2) Grundlogg
  const t0 = Date.now();
  const contentType = (req.headers["content-type"] || "").toString();
  console.log("[offert/create] start", {
    origin: req.headers.origin,
    contentType,
  });

  try {
    // 3) Säkerställ att vi har JSON
    if (!contentType.includes("application/json")) {
      console.warn("[offert/create] Wrong content-type:", contentType);
      return httpErr(res, 415, "Content-Type must be application/json");
    }

    const p = req.body ?? {};
    console.log("[offert/create] body keys", Object.keys(p || {}));

    // ---- Fält från formulär ----
    const customer_name:  string | null = toNull(p.customer_name);
    const customer_email: string | null = lc(toNull(p.customer_email));
    const customer_phone: string | null = toNull(p.customer_phone);

    // UI-fält: “Kontaktperson ombord (namn och nummer)” → fallback till customer_reference
    const onboard_contact: string | null = toNull(p.onboard_contact);
    const customer_reference: string | null =
      toNull(p.customer_reference) ?? onboard_contact ?? customer_name;

    const internal_reference: string | null = toNull(p.internal_reference);

    const passengers: number | null = parseNumber(p.passengers);

    const departure_place: string | null = toNull(p.departure_place);
    const destination:     string | null = toNull(p.destination);
    const departure_date:  string | null = pickYmd(toNull(p.departure_date));
    const departure_time:  string | null = toNull(p.departure_time);

    const return_departure:   string | null = toNull(p.return_departure);
    const return_destination: string | null = toNull(p.return_destination);
    const return_date:        string | null = pickYmd(toNull(p.return_date));
    const return_time:        string | null = toNull(p.return_time);

    const stopover_places: string | null = toNull(p.stopover_places ?? p.via);
    const notes: string | null = toNull(p.notes);

    // ---- Minimal validering ----
    const missing: string[] = [];
    if (!customer_name)   missing.push("customer_name");
    if (!customer_email)  missing.push("customer_email");
    if (!departure_place) missing.push("departure_place");
    if (!destination)     missing.push("destination");
    if (!departure_date)  missing.push("departure_date");
    if (!departure_time)  missing.push("departure_time");
    if (missing.length) return httpErr(res, 400, `Saknar fält: ${missing.join(", ")}`);

    // ---- Offertnummer HB{YY}{xxx} ----
    const nextOfferNumber = nextOfferNumberFactory();
    const offer_number = await nextOfferNumber();

    // ---- Spara i DB ----
    const nowIso = new Date().toISOString();
    const insertPayload: any = {
      offer_number,
      status: "inkommen",
      offer_date: nowIso.slice(0, 10),

      // kontakt
      contact_person: customer_name,
      contact_phone: customer_phone,
      contact_email: customer_email,

      // referenser
      customer_reference,
      internal_reference,

      // resa
      passengers,
      departure_place,
      destination,
      departure_date,
      departure_time,
      stopover_places,

      // retur
      return_departure,
      return_destination,
      return_date,
      return_time,

      // övrigt
      notes,

      created_at: nowIso,
      updated_at: nowIso,
    };

    const { data: row, error: insErr } = await supabase
      .from("offers")
      .insert([insertPayload])
      .select("*")
      .single();

    if (insErr) {
      console.error("[offert/create] supabase insert error:", insErr);
      return httpErr(res, 500, "Kunde inte spara offert");
    }

    // ---- Mail: 1) till kund (primärt via sendOfferMail HTML)
    let mailOk = false;
    let mailError: string | null = null;

    try {
      await sendOfferMail({
        offerId: String(row.id ?? offer_number),
        offerNumber: String(offer_number),
        customerEmail: customer_email,

        customerName: customer_name,
        customerPhone: customer_phone,

        from: departure_place,
        to: destination,
        date: departure_date,
        time: departure_time,
        passengers,
        via: stopover_places,
        onboardContact: onboard_contact,

        return_from: return_departure,
        return_to: return_destination,
        return_date,
        return_time,

        notes,
      });
      mailOk = true;
    } catch (err: any) {
      mailError = err?.message || String(err);
      console.warn("[offert/create] sendOfferMail failed:", mailError);

      // --- Fallback via Resend (text, BCC → OFFERS_INBOX) ---
      try {
        if (RESEND_API_KEY && EMAIL_FROM) {
          const resend = new Resend(RESEND_API_KEY);
          const previewBase = CUSTOMER_BASE_URL || env(process.env.NEXT_PUBLIC_BASE_URL);
          const previewUrl = previewBase
            ? `${previewBase.replace(/\/+$/, "")}/offert/${offer_number}?view=inkommen`
            : "";

          await resend.emails.send({
            from: EMAIL_FROM,
            to: customer_email!,            // kunden
            ...(OFFERS_INBOX ? { bcc: [OFFERS_INBOX] } : {}), // intern spegling
            reply_to: EMAIL_REPLY_TO,
            subject: `Tack för din offertförfrågan – ${offer_number}`,
            text:
              `Hej ${customer_name || ""}!\n\n` +
              `Vi har tagit emot er offertförfrågan.` +
              (previewUrl ? `\nGranska här: ${previewUrl}\n` : "\n") +
              `\nSammanfattning:\n` +
              `Från: ${departure_place || "-"}\n` +
              `Till: ${destination || "-"}\n` +
              `Datum: ${departure_date || "-"}\n` +
              `Tid: ${departure_time || "-"}\n` +
              `Passagerare: ${passengers ?? "-"}\n` +
              (return_date || return_time || return_departure || return_destination
                ? `\nRetur: ${return_departure || "-"} → ${return_destination || "-"} (${return_date || "-"} ${return_time || "-"})\n`
                : "") +
              (notes ? `\nNoteringar:\n${notes}\n` : "") +
              `\nHar du frågor eller vill justera något? Svara på detta mail eller kontakta oss på ${EMAIL_REPLY_TO}.\n\n` +
              `Vänliga hälsningar,\nHelsingbuss`,
          });

          mailOk = true;
        }
      } catch (fallbackErr: any) {
        console.error("[offert/create] Resend fallback failed:", fallbackErr?.message || fallbackErr);
      }
    }

    // ---- Mail: 2) separat intern notis till OFFERS_INBOX (oavsett)
    try {
      if (RESEND_API_KEY && EMAIL_FROM && OFFERS_INBOX) {
        const resend = new Resend(RESEND_API_KEY);
        await resend.emails.send({
          from: EMAIL_FROM,
          to: OFFERS_INBOX,
          reply_to: customer_email || EMAIL_REPLY_TO || SUPPORT_INBOX,
          subject: `Ny offert inkommen ${offer_number} – ${customer_name || ""}`,
          text:
            `Offert ${offer_number} har inkommit.\n\n` +
            `Kontakt: ${customer_name || "-"}\n` +
            `E-post: ${customer_email || "-"}\n` +
            `Telefon: ${customer_phone || "-"}\n\n` +
            `Från: ${departure_place || "-"}\n` +
            `Till: ${destination || "-"}\n` +
            `Datum: ${departure_date || "-"}\n` +
            `Tid: ${departure_time || "-"}\n` +
            `Passagerare: ${passengers ?? "-"}\n` +
            (return_date || return_time || return_departure || return_destination
              ? `\nRetur: ${return_departure || "-"} → ${return_destination || "-"} (${return_date || "-"} ${return_time || "-"})\n`
              : "") +
            (notes ? `\nNoteringar:\n${notes}\n` : ""),
        });
      }
    } catch (internalErr: any) {
      console.error("[offert/create] internal notify failed:", internalErr?.message || internalErr);
      // Fortsätt ändå – detta ska inte fälla användarflödet
    }

    console.log("[offert/create] done in", Date.now() - t0, "ms");
    return res.status(200).json({
      success: true,
      offer: row,
      mail: mailOk ? "sent" : (mailError ? `failed: ${mailError}` : "skipped"),
    });
  } catch (e: any) {
    console.error("[offert/create] unhandled:", e?.message || e);
    return httpErr(res, 500, "Serverfel");
  }
}
