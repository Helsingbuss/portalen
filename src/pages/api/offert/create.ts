// src/pages/api/offert/create.ts
export const config = { api: { bodyParser: true } };
export const runtime = "nodejs"; // 👈 tvinga Node (inte Edge)

import type { NextApiRequest, NextApiResponse } from "next";
import supabaseAdmin from "@/lib/supabaseAdmin";
import { sendOfferMail } from "@/lib/sendOfferMail";
import { Resend } from "resend";
import cors from "@/lib/cors";
import { verifyTurnstile } from "@/lib/turnstile";
import { verifyTicket } from "@/lib/formTicket";

const supabase = supabaseAdmin;

const env = (v?: string | null) => (v ?? "").trim();
const lc = (v?: string | null) => env(v).toLowerCase();

const RESEND_API_KEY = env(process.env.RESEND_API_KEY);
const EMAIL_FROM     = env(process.env.EMAIL_FROM) || "Helsingbuss <no-reply@helsingbuss.se>";
const EMAIL_REPLY_TO = env(process.env.EMAIL_REPLY_TO) || "kundteam@helsingbuss.se";
const SUPPORT_INBOX  = lc(process.env.SUPPORT_INBOX) || "kundteam@helsingbuss.se";
const OFFERS_INBOX   = lc(process.env.OFFERS_INBOX)  || "offert@helsingbuss.se";

const CUSTOMER_BASE_URL =
  env(process.env.CUSTOMER_BASE_URL) ||
  env(process.env.NEXT_PUBLIC_CUSTOMER_BASE_URL) ||
  env(process.env.NEXT_PUBLIC_BASE_URL);

function toNull<T = any>(v: T | null | undefined): T | null { return v === "" || v === undefined ? null : (v as any); }
function pickYmd(v?: string | null) { if (!v) return null; return v.length >= 10 ? v.slice(0, 10) : v; }
function parseNumber(n: any): number | null { if (typeof n === "number") return Number.isFinite(n) ? n : null; const t = Number(n); return Number.isFinite(t) ? t : null; }
function httpErr(res: NextApiResponse, code: number, msg: string, extra?: any) {
  console.error(`[offert/create] ${code} ${msg}`, extra ? { extra } : undefined);
  return res.status(code).json({ error: msg, ...(extra ? { extra } : {}) });
}
function nextOfferNumberFactory(prefixYear?: string) {
  const yy = prefixYear ?? new Date().getFullYear().toString().slice(-2);
  return async function next(): Promise<string> {
    const { data: lastOffer, error } = await supabase
      .from("offers").select("offer_number").order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (error) { console.error("[offert/create] select last offer_number error", error); }
    let nextNum = 7;
    if (lastOffer?.offer_number) {
      const m = String(lastOffer.offer_number).match(/^HB(\d{2})(\d{3,})$/);
      if (m) {
        const lastYY = m[1]; const lastRun = parseInt(m[2], 10);
        nextNum = (lastYY === yy && Number.isFinite(lastRun)) ? lastRun + 1 : 7;
      } else {
        const tail = parseInt(String(lastOffer.offer_number).replace(/^HB\d{2}/, ""), 10);
        if (Number.isFinite(tail)) nextNum = tail + 1;
      }
    }
    return `HB${yy}${String(nextNum).padStart(3, "0")}`;
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const proceeded = await cors(req, res, {
    allowOrigins: [
      "https://helsingbuss.se",
      "https://www.helsingbuss.se",
      "https://login.helsingbuss.se",
      "https://www.login.helsingbuss.se",
      "https://hbshuttle.se",
      "https://www.hbshuttle.se",
      env(process.env.NEXT_PUBLIC_CUSTOMER_BASE_URL),
      env(process.env.CUSTOMER_BASE_URL),
      env(process.env.NEXT_PUBLIC_BASE_URL),
      env(process.env.NEXT_PUBLIC_LOGIN_BASE_URL),
      "http://localhost:3000",
      "http://127.0.0.1:3000",
    ].filter(Boolean),
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  });
  if (proceeded === false) return;

  if (req.method === "GET") {
    try {
      const { error } = await supabase.from("offers").select("id").limit(1);
      return res.status(200).json({ ok: !error, db: error ? error.message : "ok", service: "offert/create" });
    } catch (e: any) {
      return res.status(200).json({ ok: false, db: e?.message || String(e), service: "offert/create" });
    }
  }
  if (req.method !== "POST") return httpErr(res, 405, "Method not allowed");

  const t0 = Date.now();
  const contentType = (req.headers["content-type"] || "").toString();
  const origin = (req.headers.origin as string) || null;
  const ua = (req.headers["user-agent"] || "").toString();
  const ip = (req.headers["x-forwarded-for"] || req.socket.remoteAddress || "").toString();

  try {
    if (!contentType.includes("application/json")) {
      return httpErr(res, 415, "Content-Type must be application/json", { contentType });
    }

    const p = req.body ?? {};
    // Bot-skydd
    const honeypot = (p.hp ?? p.honeypot ?? p._hp ?? "").toString().trim();
    if (honeypot) return httpErr(res, 400, "Bot suspected");

    const turnstileToken = (p.turnstile_token || p["cf-turnstile-response"] || "").toString();
    const formTicket = (p.form_ticket || "").toString();

    const turnstileOk = turnstileToken ? await verifyTurnstile(turnstileToken, ip) : false;
    let ticketOk = false;
    try { ticketOk = formTicket ? verifyTicket(formTicket, ua, origin) : false; } catch (e:any) {
      console.warn("[offert/create] verifyTicket error:", e?.message || e);
    }
    if (!turnstileOk && !ticketOk) {
      return httpErr(res, 401, "Security check failed", { turnstileOk, ticketOk });
    }

    const customer_name:  string | null = toNull(p.customer_name);
    const customer_email: string | null = lc(toNull(p.customer_email));
    const customer_phone: string | null = toNull(p.customer_phone);
    const onboard_contact: string | null = toNull(p.onboard_contact);
    const customer_reference: string | null = toNull(p.customer_reference) ?? onboard_contact ?? customer_name;
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

    const missing: string[] = [];
    if (!customer_name)   missing.push("customer_name");
    if (!customer_email)  missing.push("customer_email");
    if (!departure_place) missing.push("departure_place");
    if (!destination)     missing.push("destination");
    if (!departure_date)  missing.push("departure_date");
    if (!departure_time)  missing.push("departure_time");
    if (missing.length) return httpErr(res, 400, `Saknar fält: ${missing.join(", ")}`);

    const offer_number = await nextOfferNumberFactory()();

    const nowIso = new Date().toISOString();
    const insertPayload: any = {
      offer_number, status: "inkommen", offer_date: nowIso.slice(0, 10),
      contact_person: customer_name, contact_phone: customer_phone, contact_email: customer_email,
      customer_reference, internal_reference,
      passengers, departure_place, destination, departure_date, departure_time, stopover_places,
      return_departure, return_destination, return_date, return_time,
      notes,
      created_at: nowIso, updated_at: nowIso,
    };

    const { data: row, error: insErr } = await supabase
      .from("offers").insert([insertPayload]).select("*").single();

    if (insErr) {
      return httpErr(res, 500, "Kunde inte spara offert", { supabase: insErr });
    }

    let mailOk = false; let mailError: string | null = null;
    try {
      await sendOfferMail({
        offerId: String(row.id ?? offer_number), offerNumber: String(offer_number),
        customerEmail: customer_email,
        customerName: customer_name, customerPhone: customer_phone,
        from: departure_place, to: destination, date: departure_date, time: departure_time,
        passengers, via: stopover_places, onboardContact: onboard_contact,
        return_from: return_departure, return_to: return_destination, return_date, return_time,
        notes,
      });
      mailOk = true;
    } catch (err: any) {
      mailError = err?.message || String(err);
      console.warn("[offert/create] sendOfferMail failed:", mailError);
      try {
        if (RESEND_API_KEY && EMAIL_FROM) {
          const resend = new Resend(RESEND_API_KEY);
          const previewBase = CUSTOMER_BASE_URL || env(process.env.NEXT_PUBLIC_BASE_URL);
          const previewUrl = previewBase ? `${previewBase.replace(/\/+$/, "")}/offert/${offer_number}?view=inkommen` : "";
          await resend.emails.send({
            from: EMAIL_FROM, to: customer_email!,
            ...(OFFERS_INBOX ? { bcc: [OFFERS_INBOX] } : {}),
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

    try {
      if (RESEND_API_KEY && EMAIL_FROM && OFFERS_INBOX) {
        const resend = new Resend(RESEND_API_KEY);
        await resend.emails.send({
          from: EMAIL_FROM, to: OFFERS_INBOX,
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
    }

    return res.status(200).json({
      success: true,
      offer: row,
      mail: mailOk ? "sent" : (mailError ? `failed: ${mailError}` : "skipped"),
      ms: Date.now() - t0,
    });
  } catch (e: any) {
    return httpErr(res, 500, "Serverfel", { message: e?.message || String(e) });
  }
}
