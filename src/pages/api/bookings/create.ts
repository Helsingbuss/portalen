// src/pages/api/bookings/create.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { sendBookingMail } from "@/lib/sendBookingMail";

function toNull(v: any) { return v === "" || v === undefined ? null : v; }

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const p = req.body ?? {};

    // Antag att booking_number redan sÃ¤tts server-side (trigger/procedur) eller hÃ¤r:
    // Om saknas, skapa enkelt nummer BK{YY}{random} â€“ byt gÃ¤rna mot ditt riktiga sekvensflÃ¶de.
    let booking_number: string | null = p.booking_number || null;
    if (!booking_number) {
      const yy = new Date().getFullYear().toString().slice(-2);
      const rnd = Math.floor(1000 + Math.random() * 9000);
      booking_number = `BK${yy}${rnd}`;
    }

    const record = {
      booking_number,
      status: "created",
      // kund
      contact_person: toNull(p.contact_person),
      customer_email: toNull(p.customer_email),
      customer_phone: toNull(p.customer_phone),
      // utresa
      passengers: p.passengers ?? null,
      departure_place: toNull(p.departure_place),
      destination: toNull(p.destination),
      departure_date: toNull(p.departure_date),
      departure_time: toNull(p.departure_time),
      end_time: toNull(p.end_time),
      on_site_minutes: p.on_site_minutes ?? null,
      stopover_places: toNull(p.stopover_places),
      // retur
      return_departure: toNull(p.return_departure),
      return_destination: toNull(p.return_destination),
      return_date: toNull(p.return_date),
      return_time: toNull(p.return_time),
      return_end_time: toNull(p.return_end_time),
      return_on_site_minutes: p.return_on_site_minutes ?? null,
      // interna
      assigned_vehicle_id: toNull(p.assigned_vehicle_id),
      assigned_driver_id: toNull(p.assigned_driver_id),
      // Ã¶vrigt
      notes: toNull(p.notes),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabaseAdmin
      .from("bookings")
      .insert(record)
      .select("*")
      .single();

    if (error) throw error;

    // FÃ¶rsÃ¶k skicka bokningsbekrÃ¤ftelse (icke-blockerande)
    (async () => {
      try {
        if (data?.customer_email) {
          await sendBookingMail({
  to: data.customer_email,
  bookingNumber: data.booking_number,
  event: "created",
  passengers: data.passengers ?? null,

  // ev. platta fält från formulär
  from:    (data.from ?? null) as string | null,
  toPlace: (data.toPlace ?? null) as string | null,
  date:    (data.date ?? null) as string | null,
  time:    (data.time ?? null) as string | null,
  notes:   (data.notes ?? null) as string | null,
});}
      } catch (e) {
        console.warn("sendBookingMail failed:", (e as any)?.message || e);
      }
    })();

    return res.status(200).json({ ok: true, booking: data });
  } catch (e: any) {
    console.error("/api/bookings/create error:", e?.message || e);
    return res.status(500).json({ error: e?.message || "Serverfel" });
  }
}








