// src/pages/api/ticket-orders/by-departure.ts
import type { NextApiRequest, NextApiResponse } from "next";
import * as admin from "@/lib/supabaseAdmin";

const supabase: any =
  (admin as any).supabaseAdmin ||
  (admin as any).supabase ||
  (admin as any).default;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res
      .status(405)
      .json({ ok: false, error: "Method not allowed" });
  }

  const trip_id = String(req.query.trip_id || "").trim();
  const departure_date = String(req.query.departure_date || "").trim();

  if (!trip_id) {
    return res.status(400).json({ ok: false, error: "trip_id krävs." });
  }
  if (!departure_date || !/^\d{4}-\d{2}-\d{2}$/.test(departure_date)) {
    return res.status(400).json({
      ok: false,
      error: 'departure_date måste vara YYYY-MM-DD.',
    });
  }

  try {
    // 1) Kolla att resan finns
    const { data: trip, error: tripErr } = await supabase
      .from("trips")
      .select("id, title, year")
      .eq("id", trip_id)
      .single();

    if (tripErr || !trip) {
      return res.status(400).json({
        ok: false,
        error: "Angiven resa kunde inte hittas.",
      });
    }

    // 2) Hämta alla bokningar för resan + datum
    const { data: bookings, error: bookingErr } = await supabase
      .from("ticket_bookings")
      .select(
        [
          "id",
          "trip_id",
          "departure_date",
          "customer_name",
          "customer_email",
          "customer_phone",
          "total_price",
          "currency",
          "status",
          "payment_status",
          "created_at",
          "internal_note",
        ].join(",")
      )
      .eq("trip_id", trip_id)
      .eq("departure_date", departure_date)
      .order("created_at", { ascending: true });

    if (bookingErr) {
      console.error("by-departure: bookingErr", bookingErr);
      return res.status(500).json({
        ok: false,
        error: "Kunde inte läsa bokningar.",
      });
    }

    if (!bookings || bookings.length === 0) {
      return res.status(200).json({
        ok: true,
        trip,
        departure_date,
        bookings: [],
        totals: {
          total_passengers: 0,
          total_revenue: 0,
          per_type: [],
        },
      });
    }

    const bookingIds = bookings.map((b: any) => b.id);

    // 3) Hämta alla rader (items) för dessa bokningar
    const { data: items, error: itemsErr } = await supabase
      .from("ticket_booking_items")
      .select("booking_id, ticket_type_id, quantity, unit_price, total_price")
      .in("booking_id", bookingIds);

    if (itemsErr) {
      console.error("by-departure: itemsErr", itemsErr);
      return res.status(500).json({
        ok: false,
        error: "Kunde inte läsa bokningsrader.",
      });
    }

    const typeIds = Array.from(
      new Set((items || []).map((it: any) => it.ticket_type_id))
    ).filter(Boolean) as string[];

    let types: any[] = [];
    if (typeIds.length > 0) {
      const { data: tData, error: typesErr } = await supabase
        .from("ticket_ticket_types")
        .select("id, code, name, kind")
        .in("id", typeIds);

      if (typesErr) {
        console.error("by-departure: typesErr", typesErr);
        return res.status(500).json({
          ok: false,
          error: "Kunde inte läsa biljetttyper.",
        });
      }
      types = tData || [];
    }

    const typeMap: Record<string, any> = {};
    for (const t of types) {
      typeMap[t.id] = t;
    }

    // 4) Gruppera items per bokning
    const itemsByBooking: Record<string, any[]> = {};
    for (const it of items || []) {
      const key = it.booking_id;
      if (!itemsByBooking[key]) itemsByBooking[key] = [];
      itemsByBooking[key].push({
        ticket_type_id: it.ticket_type_id,
        quantity: it.quantity,
        unit_price: it.unit_price,
        total_price: it.total_price,
        ticket_type: typeMap[it.ticket_type_id] || null,
      });
    }

    // 5) Summeringar (totalt + per biljettyp)
    let totalPassengers = 0;
    let totalRevenue = 0;

    const perTypeAgg: Record<
      string,
      {
        ticket_type_id: string;
        code: string;
        name: string;
        kind: string;
        quantity: number;
        revenue: number;
      }
    > = {};

    for (const it of items || []) {
      const qty = Number(it.quantity) || 0;
      const rowTotal = Number(it.total_price) || 0;
      totalPassengers += qty;
      totalRevenue += rowTotal;

      const t = typeMap[it.ticket_type_id] || {
        code: "",
        name: "",
        kind: "",
      };

      if (!perTypeAgg[it.ticket_type_id]) {
        perTypeAgg[it.ticket_type_id] = {
          ticket_type_id: it.ticket_type_id,
          code: t.code || "",
          name: t.name || "",
          kind: t.kind || "",
          quantity: 0,
          revenue: 0,
        };
      }
      perTypeAgg[it.ticket_type_id].quantity += qty;
      perTypeAgg[it.ticket_type_id].revenue += rowTotal;
    }

    const per_type = Object.values(perTypeAgg).sort((a, b) =>
      (a.name || "").localeCompare(b.name || "")
    );

    // 6) Bygg bokningsobjekt med items
    const enrichedBookings = bookings.map((b: any) => {
      const bItems = itemsByBooking[b.id] || [];
      const passengers = bItems.reduce(
        (sum: number, it: any) => sum + (Number(it.quantity) || 0),
        0
      );
      return {
        ...b,
        passengers,
        items: bItems,
      };
    });

    return res.status(200).json({
      ok: true,
      trip,
      departure_date,
      bookings: enrichedBookings,
      totals: {
        total_passengers: totalPassengers,
        total_revenue: totalRevenue,
        per_type,
      },
    });
  } catch (e: any) {
    console.error("by-departure: unexpected error", e);
    return res.status(500).json({
      ok: false,
      error: e?.message || "Oväntat serverfel.",
    });
  }
}
