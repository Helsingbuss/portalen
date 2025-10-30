// src/pages/api/bookings/create.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@/lib/supabaseAdmin";

/** Bokningsnummer: BK{YY}{NNNN} */
async function nextBookingNumber(): Promise<string> {
  const yy = String(new Date().getFullYear()).slice(-2);
  const prefix = `BK${yy}`;
  const { data, error } = await supabase
    .from("bookings")
    .select("booking_number, created_at")
    .not("booking_number", "is", null)
    .like("booking_number", `${prefix}%`)
    .order("created_at", { ascending: false })
    .limit(300);
  if (error) throw error;

  let maxSeq = 0;
  for (const row of data ?? []) {
    const bn = (row as any).booking_number as string | null;
    const m = bn?.match(new RegExp(`^${prefix}(\\d{4})$`));
    if (m) {
      const n = parseInt(m[1], 10);
      if (!Number.isNaN(n) && n > maxSeq) maxSeq = n;
    }
  }
  const next = (maxSeq || 0) + 1;
  return `${prefix}${String(next).padStart(4, "0")}`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const p = req.body ?? {};
  const nowISO = new Date().toISOString();
  const bookDate = nowISO.slice(0, 10);

  // round-trip heuristik
  const isRound =
    !!p.return_departure || !!p.return_destination || !!p.return_date || !!p.return_time;

  try {
    const booking_number = await nextBookingNumber();

    const insertObj = {
      booking_number,
      status: "skapad",          // initial status
      booking_date: bookDate,    // om kolumn finns, annars ignoreras

      // kontakt
      contact_person: p.contact_person ?? null,
      customer_email: p.customer_email ?? null,
      contact_phone: p.customer_phone ?? null,

      // utresa
      passengers: p.passengers ?? null,
      departure_place: p.departure_place ?? null,
      destination: p.destination ?? null,
      departure_date: p.departure_date ?? null,
      departure_time: p.departure_time ?? null,
      end_time: p.end_time ?? null,
      on_site_minutes: p.on_site_minutes ?? null,
      stopover_places: p.stopover_places ?? null,

      // retur
      return_departure: p.return_departure ?? null,
      return_destination: p.return_destination ?? null,
      return_date: p.return_date ?? null,
      return_time: p.return_time ?? null,
      return_end_time: p.return_end_time ?? null,
      return_on_site_minutes: p.return_on_site_minutes ?? null,

      // interna tilldelningar (spara bÃ¥de id och label om ni vill)
      assigned_vehicle_id: p.assigned_vehicle_id ?? null,
      assigned_driver_id: p.assigned_driver_id ?? null,

      // ev flagga (om kolumn saknas ignoreras)
      round_trip: isRound,

      // Ã¶vrigt
      notes: p.notes ?? null,

      // created/updated
      created_at: nowISO,
      updated_at: nowISO,
    };

    const { data, error } = await supabase
      .from("bookings")
      .insert(insertObj)
      .select("id, booking_number")
      .single();

    if (error) throw error;
    return res.status(200).json({ ok: true, booking: data });
  } catch (e: any) {
    console.error("booking/create error:", e?.message || e);
    return res.status(500).json({ error: e?.message || "Kunde inte skapa bokning" });
  }
}


