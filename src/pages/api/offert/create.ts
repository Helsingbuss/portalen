// src/pages/api/offert/create.ts
import type { NextApiRequest, NextApiResponse } from "next";
import supabase from "@/lib/supabaseAdmin";
import { allowCors } from "@/lib/cors";
import { sendOfferMail } from "@/lib/sendOfferMail";

function pickYmd(v?: string | null) {
  if (!v) return null;
  const m = String(v).match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : null;
}

async function nextOfferNumber(): Promise<string> {
  const yy = String(new Date().getFullYear()).slice(2);
  const prefix = `HB${yy}`;
  const { data } = await supabase
    .from("offers")
    .select("offer_number")
    .ilike("offer_number", `${prefix}%`)
    .order("offer_number", { ascending: false })
    .limit(100);

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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!allowCors(req, res)) return;
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST,OPTIONS");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const b = (req.body || {}) as Record<string, any>;

    const customerName   = (b.contact_person || b.customer_name || "").toString().trim();
    const customerEmail  = (b.customer_email || b.contact_email || b.email || "").toString().trim();
    const customerPhone  = (b.customer_phone || b.contact_phone || b.phone || "").toString().trim();

    if (!customerName || !customerEmail) {
      return res.status(400).json({ ok: false, error: "Fyll i namn och e-post." });
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
    const via                = b.stopover_places ?? b.via ?? null;
    const onboardContact     = b.onboard_contact ?? null;
    const notes              = b.notes ?? b.message ?? null;

    const customer_reference = (b.customer_reference || customerName).toString().trim();

    const offer_number = await nextOfferNumber();
    const status = "inkommen";

    const row = {
      offer_number,
      status,
      customer_reference,

      // spara i båda fält för kompatibilitet
      customer_email: customerEmail,
      contact_email: customerEmail,

      customer_phone: customerPhone,
      contact_phone: customerPhone,

      passengers,
      departure_place,
      destination,
      departure_date,
      departure_time,
      return_departure,
      return_destination,
      return_date,
      return_time,
      stopover_places: via,
      notes,
      offer_date: new Date().toISOString().split("T")[0],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const ins = await supabase
      .from("offers")
      .insert(row)
      .select("id, offer_number")
      .single();

    if (ins.error) {
      console.error("[offert/create] insert error:", ins.error);
      return res.status(500).json({ ok: false, error: ins.error.message });
    }

    // skickar mejl (admin + kund)
    try {
      await sendOfferMail({
        offerId: String(ins.data.id),
        offerNumber: offer_number,
        customerEmail: customerEmail, // CAMELCASE
        customerName,
        customerPhone,
        from: departure_place,
        to: destination,
        date: departure_date,
        time: departure_time,
        passengers,
        via,
        onboardContact,
        return_from: return_departure,
        return_to: return_destination,
        return_date,
        return_time,
        notes,
      });
    } catch (mailErr: any) {
      console.error("[offert/create] mail failed:", mailErr?.message || mailErr);
    }

    return res.status(200).json({ ok: true, offer: ins.data });
  } catch (e: any) {
    console.error("[offert/create] server error:", e?.message || e);
    return res.status(500).json({ ok: false, error: e?.message || "Internt fel" });
  }
}
