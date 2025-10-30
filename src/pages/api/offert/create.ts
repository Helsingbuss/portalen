// src/pages/api/offert/create.ts
import type { NextApiRequest, NextApiResponse } from "next";
import * as admin from "@/lib/supabaseAdmin";
import { sendOfferMail } from "@/lib/sendMail";

const supabase = admin.supabase;

/** Plocka ut YYYY-MM-DD från 'YYYY-MM-DD' | 'YYYY-MM-DDTHH:mm' | 'YYYY-MM-DD HH:mm' */
function pickYmd(v?: string | null) {
  if (!v) return null;
  const m = String(v).match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : null;
}

/** Hämta nästa offertnummer utan DB-funktion. */
async function nextOfferNumber(): Promise<string> {
  const yy = String(new Date().getFullYear()).slice(2);
  const prefix = `HB${yy}`;

  const { data, error } = await supabase
    .from("offers")
    .select("offer_number")
    .ilike("offer_number", `${prefix}%`)
    .order("offer_number", { ascending: false })
    .limit(50);

  if (error) {
    console.warn("[offert/create] nextOfferNumber fallback p.g.a. select-fel:", error.message);
    return `${prefix}${String(1).padStart(4, "0")}`;
  }

  let max = 0;
  for (const r of data || []) {
    const raw = (r as any).offer_number as string | null;
    if (!raw) continue;
    const m = raw.replace(/\s+/g, "").match(new RegExp(`^${prefix}(\\d{1,6})$`, "i"));
    if (m) {
      const n = parseInt(m[1], 10);
      if (Number.isFinite(n)) max = Math.max(max, n);
    }
  }
  const next = max + 1;
  return `${prefix}${String(next).padStart(4, "0")}`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const body = req.body || {};

    // Fält från Steg 2
    const customer_reference = (body.contact_person || "").toString().trim();
    const contact_email = (body.customer_email || "").toString().trim();
    const contact_phone = (body.customer_phone || "").toString().trim();

    if (!customer_reference || !contact_email || !contact_phone) {
      return res.status(400).json({
        ok: false,
        error: "Fyll i Referens (beställarens namn), E-post och Telefon.",
      });
    }

    const passengers =
      typeof body.passengers === "number"
        ? body.passengers
        : Number(body.passengers || 0) || null;

    // Utresa
    const departure_place = body.departure_place || null;
    const destination = body.destination || null;
    const departure_date = pickYmd(body.departure_date);
    const departure_time = body.departure_time || null;
    const notes = body.notes || null;

    // Retur – kan vara tomt
    const return_departure = body.return_departure || null;
    const return_destination = body.return_destination || null;
    const return_date = pickYmd(body.return_date);
    const return_time = body.return_time || null;

    const offer_number = await nextOfferNumber();
    const status = "inkommen";

    // Första försök: inkludera retur-fälten
    const insertPrimary: Record<string, any> = {
      offer_number,
      status,
      customer_reference,
      contact_email,
      contact_phone,
      passengers,
      departure_place,
      destination,
      departure_date,
      departure_time,
      notes,
      // retur
      return_departure,
      return_destination,
      return_date,
      return_time,
    };

    let ins = await supabase
      .from("offers")
      .insert(insertPrimary)
      .select("id, offer_number, contact_email, customer_email")
      .single();

    // Fallback om DB:n inte har retur-kolumnerna
    if (ins.error && /column .* does not exist/i.test(ins.error.message)) {
      console.warn("[offert/create] fallback utan return_* kolumner:", ins.error.message);
      const { return_departure: _a, return_destination: _b, return_date: _c, return_time: _d, ...noReturn } =
        insertPrimary;

      ins = await supabase
        .from("offers")
        .insert(noReturn)
        .select("id, offer_number, contact_email, customer_email")
        .single();
    }

    // Andra fallback om contact_* skiljer i DB
    if (ins.error && /column .* does not exist/i.test(ins.error.message)) {
      console.warn("[offert/create] primär insert misslyckades igen, provar alias för contact_*:", ins.error.message);
      const alt: Record<string, any> = {
        offer_number,
        status,
        customer_reference,
        customer_email: contact_email,
        customer_phone: contact_phone,
        passengers,
        departure_place,
        destination,
        departure_date,
        departure_time,
        notes,
        return_departure,
        return_destination,
        return_date,
        return_time,
      };

      ins = await supabase
        .from("offers")
        .insert(alt)
        .select("id, offer_number, contact_email, customer_email")
        .single();
    }

    if (ins.error) {
      return res.status(500).json({
        ok: false,
        error: ins.error.message || "Kunde inte skapa offert.",
      });
    }

    const row = ins.data!;
    const recipient = row.contact_email || row.customer_email || contact_email;

    try {
      // Skicka “inkommen”
      await sendOfferMail(recipient, row.offer_number || row.id, "inkommen");
      // Notis till admin mejl hanteras inne i sendOfferMail som tidigare.
    } catch (mailErr: any) {
      console.warn("[offert/create] kunde inte skicka mejl:", mailErr?.message || mailErr);
    }

    return res.status(200).json({ ok: true, offer: row });
  } catch (e: any) {
    console.error("[offert/create] server error:", e?.message || e);
    return res.status(500).json({
      ok: false,
      error: e?.message || "Internt fel vid skapande av offert.",
    });
  }
}
