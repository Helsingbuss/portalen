// src/pages/api/ticket-orders/create.ts
import type { NextApiRequest, NextApiResponse } from "next";
import * as admin from "@/lib/supabaseAdmin";

const supabase: any =
  (admin as any).supabaseAdmin ||
  (admin as any).supabase ||
  (admin as any).default;

type ItemInput = {
  ticket_type_id: string;
  quantity: number;
};

type Body = {
  trip_id?: string;
  departure_date?: string;
  customer_name?: string;
  customer_email?: string | null;
  customer_phone?: string | null;
  payment_method?: string | null; // ex. 'manual', 'swish', 'card', 'invoice'
  mark_as_paid?: boolean;
  internal_note?: string | null;
  items?: ItemInput[];
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ ok: false, error: "Method not allowed" });
  }

  const b = (req.body || {}) as Body;

  const trip_id = String(b.trip_id || "").trim();
  const departure_date = String(b.departure_date || "").trim();
  const customer_name = String(b.customer_name || "").trim();
  const customer_email = b.customer_email
    ? String(b.customer_email).trim()
    : null;
  const customer_phone = b.customer_phone
    ? String(b.customer_phone).trim()
    : null;
  const payment_method = (b.payment_method || "manual").trim() || "manual";
  const mark_as_paid = !!b.mark_as_paid;
  const internal_note = b.internal_note
    ? String(b.internal_note).trim()
    : null;

  if (!trip_id) {
    return res
      .status(400)
      .json({ ok: false, error: "trip_id krävs." });
  }
  if (!departure_date || !/^\d{4}-\d{2}-\d{2}$/.test(departure_date)) {
    return res.status(400).json({
      ok: false,
      error: 'departure_date måste vara YYYY-MM-DD.',
    });
  }
  if (!customer_name) {
    return res
      .status(400)
      .json({ ok: false, error: "customer_name krävs." });
  }

  const items = Array.isArray(b.items) ? b.items : [];
  const cleanItems: ItemInput[] = items
    .map((it) => {
      const id = String(it.ticket_type_id || "").trim();
      const qty = Number(it.quantity);
      if (!id) return null;
      if (!Number.isFinite(qty) || qty <= 0) return null;
      return { ticket_type_id: id, quantity: Math.round(qty) };
    })
    .filter(Boolean) as ItemInput[];

  if (!cleanItems.length) {
    return res.status(400).json({
      ok: false,
      error: "Minst en biljettrad med quantity > 0 krävs.",
    });
  }

  try {
    // 1) Kontrollera att resan finns
    const { data: trip, error: tripErr } = await supabase
      .from("trips")
      .select("id, title")
      .eq("id", trip_id)
      .single();

    if (tripErr || !trip) {
      return res.status(400).json({
        ok: false,
        error: "Angiven resa kunde inte hittas.",
      });
    }

    // 2) Hämta priser för denna resa + datum
    const ticketTypeIds = Array.from(
      new Set(cleanItems.map((it) => it.ticket_type_id))
    );

    const { data: priceRows, error: priceErr } = await supabase
      .from("departure_ticket_prices")
      .select("ticket_type_id, price")
      .eq("trip_id", trip_id)
      .eq("departure_date", departure_date)
      .in("ticket_type_id", ticketTypeIds);

    if (priceErr) {
      console.error("ticket-orders/create: priceErr", priceErr);
      return res.status(500).json({
        ok: false,
        error: "Kunde inte läsa priser för avgången.",
      });
    }

    const priceMap: Record<string, number> = {};
    for (const row of priceRows || []) {
      if (typeof row.price === "number") {
        priceMap[row.ticket_type_id] = row.price;
      }
    }

    // Säkerställ att alla biljetttyper har pris
    for (const it of cleanItems) {
      if (typeof priceMap[it.ticket_type_id] !== "number") {
        return res.status(400).json({
          ok: false,
          error:
            "Priset saknas för en eller flera biljetttyper på denna avgång. Kontrollera Prissättning först.",
        });
      }
    }

    // 3) Räkna totaler
    let bookingTotal = 0;
    const itemRows = cleanItems.map((it) => {
      const unit_price = priceMap[it.ticket_type_id];
      const total_price = unit_price * it.quantity;
      bookingTotal += total_price;
      return {
        ticket_type_id: it.ticket_type_id,
        quantity: it.quantity,
        unit_price,
        total_price,
      };
    });

    if (bookingTotal <= 0) {
      return res.status(400).json({
        ok: false,
        error: "Totalbeloppet måste vara större än 0.",
      });
    }

    const status = mark_as_paid ? "confirmed" : "pending";
    const payment_status = mark_as_paid ? "paid" : "unpaid";

    // 4) Skapa bokning (i ticket_bookings-tabellen)
    const { data: booking, error: bookingErr } = await supabase
      .from("ticket_bookings")
      .insert({
        trip_id,
        departure_date,
        customer_name,
        customer_email,
        customer_phone,
        total_price: bookingTotal,
        currency: "SEK",
        status,
        payment_status,
        payment_provider: payment_method || "manual",
        internal_note,
      })
      .select("id")
      .single();

    if (bookingErr || !booking) {
      console.error("ticket-orders/create: bookingErr", bookingErr);
      return res.status(500).json({
        ok: false,
        error: bookingErr?.message || "Kunde inte skapa bokning.",
      });
    }

    const booking_id = booking.id as string;

    // 5) Skapa rader i ticket_booking_items
    const rowsToInsert = itemRows.map((row) => ({
      booking_id,
      ticket_type_id: row.ticket_type_id,
      quantity: row.quantity,
      unit_price: row.unit_price,
      total_price: row.total_price,
      meta: null,
    }));

    const { error: itemsErr } = await supabase
      .from("ticket_booking_items")
      .insert(rowsToInsert);

    if (itemsErr) {
      console.error("ticket-orders/create: itemsErr", itemsErr);
      // Försök städa bort bokningen om raderna misslyckas
      try {
        await supabase.from("ticket_bookings").delete().eq("id", booking_id);
      } catch (cleanupErr) {
        console.error("ticket-orders/create: cleanupErr", cleanupErr);
      }

      return res.status(500).json({
        ok: false,
        error: itemsErr?.message || "Kunde inte spara bokningsrader.",
      });
    }

    return res.status(200).json({
      ok: true,
      booking_id,
      total_price: bookingTotal,
      currency: "SEK",
      status,
      payment_status,
    });
  } catch (e: any) {
    console.error("ticket-orders/create: unexpected error", e);
    return res.status(500).json({
      ok: false,
      error: e?.message || "Oväntat serverfel.",
    });
  }
}
