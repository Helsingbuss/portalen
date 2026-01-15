import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { sendBookingMail } from "@/lib/sendBookingMail";

function toNull(v: any) {
  return v === "" || v === undefined ? null : v;
}
function toMoney(v: any): number {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (typeof v === "string") {
    const n = Number(v.replace(/\s/g, "").replace(",", "."));
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const p = req.body ?? {};

    let booking_number: string | null = p.booking_number || null;
    if (!booking_number) {
      const yy = new Date().getFullYear().toString().slice(-2);
      const rnd = Math.floor(1000 + Math.random() * 9000);
      booking_number = `BK${yy}${rnd}`;
    }

    const record = {
      booking_number,
      status: "created",

      contact_person: toNull(p.contact_person),
      customer_email: toNull(p.customer_email),
      customer_phone: toNull(p.customer_phone),

      passengers: p.passengers ?? null,
      departure_place: toNull(p.departure_place),
      destination: toNull(p.destination),
      departure_date: toNull(p.departure_date),
      departure_time: toNull(p.departure_time),
      end_time: toNull(p.end_time),
      on_site_minutes: p.on_site_minutes ?? null,
      stopover_places: toNull(p.stopover_places),

      return_departure: toNull(p.return_departure),
      return_destination: toNull(p.return_destination),
      return_date: toNull(p.return_date),
      return_time: toNull(p.return_time),
      return_end_time: toNull(p.return_end_time),
      return_on_site_minutes: p.return_on_site_minutes ?? null,

      assigned_vehicle_id: toNull(p.assigned_vehicle_id),
      assigned_driver_id: toNull(p.assigned_driver_id),

      notes: toNull(p.notes),

      // ✅ PRIS: om du vill kunna skapa manuell bokning med belopp
      total_price: toMoney(p.total_price ?? 0),

      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabaseAdmin.from("bookings").insert(record).select("*").single();
    if (error) throw error;

    (async () => {
      try {
        if (data?.customer_email) {
          await sendBookingMail({
            to: data.customer_email,
            bookingNumber: data.booking_number,
            passengers: data.passengers ?? null,
            out: {
              date: data.departure_date,
              time: data.departure_time,
              from: data.departure_place,
              to: data.destination,
            },
            ret: data.return_date
              ? { date: data.return_date, time: data.return_time, from: data.return_departure, to: data.return_destination }
              : null,
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
