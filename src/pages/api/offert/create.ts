// src/pages/api/offert/create.ts
import type { NextApiRequest, NextApiResponse } from "next";
import supabase from "@/lib/supabaseAdmin";        // ✅ service_role
import { sendOfferMail } from "@/lib/sendOfferMail";

export const config = { runtime: "nodejs" };

/* --- Minimal, icke-blockerande CORS --- */
function allowCors(req: NextApiRequest, res: NextApiResponse) {
  const origin = String(req.headers.origin || "");
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Origin", origin || "*");
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return false;
  }
  return true;
}

function pickYmd(v?: string | null) {
  if (!v) return null;
  const m = String(v).match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : null;
}

async function nextOfferNumber(): Promise<string> {
  const yy = String(new Date().getFullYear()).slice(2);
  const prefix = `HB${yy}`;

  const { data, error } = await supabase
    .from("offers")
    .select("offer_number")
    .ilike("offer_number", `${prefix}%`)
    .order("offer_number", { ascending: false })
    .limit(100);

  if (error) {
    console.warn("[offert/create] nextOfferNumber warn:", error.message);
  }

  let nextRun = 7;
  if (data?.length) {
    let max = 0;
    for (const r of data) {
      const raw = (r as any).offer_number as string | null;
      if (!raw) continue;
      const m = raw.replace(/\s+/g, "").match(new RegExp(`^${prefix}(\\d{3,6})$`, "i"));
      if (m) {
        const n = parseInt(m[1], 10);
        if (Number.isFinite(n)) max = Math.max(max, n);
      }
    }
    nextRun = Math.max(7, max + 1);
  }
  return `${prefix}${String(nextRun).padStart(3, "0")}`;
}

const isEmail = (s: string) => /\S+@\S+\.\S+/.test(s);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!allowCors(req, res)) return;
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const b = (typeof req.body === "string" ? JSON.parse(req.body) : req.body) || {};

    // --- OBS: läs indata, men skriv till DB med DINA kolumner ---
    const customer_name   = String(b.contact_person || b.customer_name || b.name || "").trim();
    const customer_email  = String(b.customer_email || b.email || "").trim();
    const customer_phone  = String(b.customer_phone || b.phone || "").trim();

    if (!customer_name || !isEmail(customer_email)) {
      return res.status(400).json({ ok: false, error: "Fyll i namn och giltig e-post." });
    }

    const passengers         = Number(b.passengers ?? 0) || null;
    const departure_place    = b.departure_place ?? b.from ?? null;
    const destination        = b.destination ?? b.to ?? null;
    const departure_date     = pickYmd(b.departure_date ?? b.date);
    const departure_time     = b.departure_time ?? b.time ?? null;
    const return_departure   = b.return_departure ?? b.return_from ?? null;
    const return_destination = b.return_destination ?? b.return_to ?? null;
    const return_date        = pickYmd(b.return_date ?? b.ret_date);
    const return_time        = b.return_time ?? b.ret_time ?? null;
    const stopover_places    = b.stopover_places ?? b.via ?? null;
    const onboard_contact    = b.onboard_contact ?? null;
    const notes              = b.notes ?? b.message ?? null;

    const customer_reference = String(b.customer_reference || customer_name).trim();

    const offer_number = await nextOfferNumber();
    const status = "inkommen";

    // === DIREKT IN I SUPABASE (service_role) ===
    const row = {
      offer_number,
      status,
      customer_reference,
      // 🟩 Ditt schema:
      contact_person: customer_name,     // (namnkolumnen du använder)
      customer_email,                    // 🟩 du sa att e-post heter "customer_email"
      contact_phone: customer_phone,

      passengers,
      departure_place,
      destination,
      departure_date,
      departure_time,
      return_departure,
      return_destination,
      return_date,
      return_time,
      stopover_places,
      onboard_contact,
      notes,
      offer_date: new Date().toISOString().split("T")[0],
    };

    const ins = await supabase
      .from("offers")
      .insert(row)
      .select("id, offer_number")
      .single();

    if (ins.error) {
      console.error("[offert/create] INSERT ERROR:", ins.error, { rowKeys: Object.keys(row) });
      return res.status(500).json({ ok: false, error: ins.error.message });
    }

    // === MAIL (kör EFTER lyckad insert; får faila utan att stoppa DB) ===
    try {
      await sendOfferMail({
        offerId: String(ins.data.id),
        offerNumber: offer_number,
        customerEmail: customer_email, // mejl-funktionen använder denna prop
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
        return_date: return_date,
        return_time: return_time,
        notes,
      });
    } catch (mailErr: any) {
      console.warn("[offert/create] mail failed (DB OK):", mailErr?.message || mailErr);
      // vi returnerar ändå 200 – offerten ligger i DB
    }

    return res.status(200).json({ ok: true, offer: ins.data });
  } catch (e: any) {
    console.error("[offert/create] server error:", e?.message || e);
    return res.status(500).json({ ok: false, error: e?.message || "Internt fel" });
  }
}
