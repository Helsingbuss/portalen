// src/pages/api/offert/create.ts
import type { NextApiRequest, NextApiResponse } from "next";
import supabase from "@/lib/supabaseAdmin";
import { sendOfferMail } from "@/lib/sendMail"; // ✅ samma namn, ny signatur

function pickYmd(v?: string | null) {
  if (!v) return null;
  const m = String(v).match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : null;
}

// ... (allt oförändrat t.o.m. ins.data)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const b = (req.body || {}) as Record<string, any>;
    const customer_reference = (b.contact_person || b.customer_name || "").toString().trim();
    const contact_email      = (b.customer_email  || b.email         || "").toString().trim();
    const contact_phone      = (b.customer_phone  || b.phone         || "").toString().trim();

    if (!customer_reference || !contact_email || !contact_phone) {
      return res.status(400).json({
        ok: false,
        error: "Fyll i Referens (beställarens namn), E-post och Telefon.",
      });
    }

    const passengers = Number(b.passengers ?? 0) || null;

    const departure_place = b.departure_place ?? b.from ?? null;
    const destination     = b.destination     ?? b.to   ?? null;
    const departure_date  = pickYmd(b.departure_date ?? b.date);
    const departure_time  = b.departure_time ?? b.time ?? null;

    const return_departure   = b.return_departure   ?? b.return_from ?? null;
    const return_destination = b.return_destination ?? b.return_to   ?? null;
    const return_date        = pickYmd(b.return_date ?? b.ret_date);
    const return_time        = b.return_time ?? b.ret_time ?? null;

    const notes = b.notes ?? b.message ?? null;

    // Generera offertnummer (din funktion)
    const yy = String(new Date().getFullYear()).slice(2);
    const prefix = `HB${yy}`;
    const { data } = await supabase
      .from("offers")
      .select("offer_number")
      .ilike("offer_number", `${prefix}%`)
      .order("offer_number", { ascending: false })
      .limit(100);

    let next = 7;
    if (data?.length) {
      let max = 0;
      for (const r of data) {
        const m = String((r as any).offer_number || "").match(new RegExp(`^${prefix}(\\d{1,6})$`, "i"));
        if (m) {
          const n = parseInt(m[1], 10);
          if (Number.isFinite(n)) max = Math.max(max, n);
        }
      }
      next = max + 1;
    }
    const offer_number = `${prefix}${String(next).padStart(4, "0")}`;

    const row = {
      offer_number,
      status: "inkommen",
      customer_reference,
      contact_email,
      contact_phone,
      passengers,
      departure_place,
      destination,
      departure_date,
      departure_time,
      return_departure,
      return_destination,
      return_date,
      return_time,
      notes,
    };

    const ins = await supabase
      .from("offers")
      .insert(row)
      .select("id, offer_number, contact_email, customer_email, customer_reference, contact_phone, departure_place, destination, departure_date, departure_time, return_departure, return_destination, return_date, return_time, passengers, notes")
      .single();

    if (ins.error) {
      return res.status(500).json({ ok: false, error: ins.error.message });
    }

    const saved = ins.data!;
    const recipient = saved.contact_email || saved.customer_email || contact_email;

    // ✅ Skicka mail med NYA signaturen (objekt)
    try {
      const r = await sendOfferMail({
        offerId: String(saved.id),
        offerNumber: String(saved.offer_number),
        customerEmail: recipient,

        customerName: saved.customer_reference || customer_reference,
        customerPhone: saved.contact_phone || contact_phone,

        from: saved.departure_place,
        to: saved.destination,
        date: saved.departure_date,
        time: saved.departure_time,
        passengers: saved.passengers,
        via: undefined,
        onboardContact: undefined,

        return_from: saved.return_departure,
        return_to: saved.return_destination,
        return_date: saved.return_date,
        return_time: saved.return_time,

        notes: saved.notes,
      });
      console.log("[offert/create] mail result:", r);
    } catch (e: any) {
      console.warn("[offert/create] e-post misslyckades:", e?.message || e);
    }

    return res.status(200).json({ ok: true, offer: saved });
  } catch (e: any) {
    console.error("[offert/create] server error:", e?.message || e);
    return res.status(500).json({ ok: false, error: e?.message || "Internt fel" });
  }
}
