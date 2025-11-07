// src/pages/api/bookings/create.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { sendBookingMail } from "@/lib/sendBookingMail";

function toNull(v: any) { return v === "" || v === undefined ? null : v; }

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const p = req.body ?? {};

    // Skapa booking_number om det saknas (byt gärna mot din sekvens/trigger i DB)
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
      // övrigt
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

    // Skicka bokningsbekräftelse (icke-blockerande)
    (async () => {
      try {
        if (data?.customer_email) {
          await sendBookingMail({
            to: data.customer_email,
            bookingNumber: data.booking_number,       // mappa DB booking_number -> bookingNumber
            passengers: data.passengers ?? null,

            // Mappning från dina fält i tabellen
            from:    (data.departure_place ?? null) as string | null,
            toPlace: (data.destination ?? null) as string | null,
            date:    (data.departure_date ?? null) as string | null,
            time:    (data.departure_time ?? null) as string | null,
            notes:   (data.notes ?? null) as string | null,
          });
        }
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
