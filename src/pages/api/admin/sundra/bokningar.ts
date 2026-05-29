import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;

const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_KEY;

function getSupabase() {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase env saknas. Kontrollera SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL och service key.");
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function uniq(values: any[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function asMap(rows: any[] | null | undefined) {
  const map = new Map<string, any>();
  for (const row of rows || []) {
    if (row?.id) map.set(String(row.id), row);
  }
  return map;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const supabase = getSupabase();

    const q = String(req.query.q || "").trim().toLowerCase();
    const status = String(req.query.status || "").trim();
    const paymentStatus = String(req.query.payment_status || "").trim();

    const limitRaw = Number(req.query.limit || 100);
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 300) : 100;

    let bookingQuery = supabase
      .from("sundra_bookings")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (status) {
      bookingQuery = bookingQuery.eq("status", status);
    }

    if (paymentStatus) {
      bookingQuery = bookingQuery.eq("payment_status", paymentStatus);
    }

    const { data: bookings, error: bookingsError } = await bookingQuery;

    if (bookingsError) {
      throw bookingsError;
    }

    const bookingRows = bookings || [];

    const tripIds = uniq(bookingRows.map((b: any) => b.trip_id));
    const departureIds = uniq(bookingRows.map((b: any) => b.departure_id));
    const stopIds = uniq(
      bookingRows.map(
        (b: any) =>
          b.stop_id ||
          b.line_stop_id ||
          b.pickup_stop_id ||
          b.selected_line_stop_id
      )
    );
    const bookingIds = uniq(bookingRows.map((b: any) => b.id));

    const [tripsResult, departuresResult, stopsResult, passengersResult] =
      await Promise.all([
        tripIds.length
          ? supabase.from("sundra_trips").select("*").in("id", tripIds)
          : Promise.resolve({ data: [], error: null }),
        departureIds.length
          ? supabase.from("sundra_departures").select("*").in("id", departureIds)
          : Promise.resolve({ data: [], error: null }),
        stopIds.length
          ? supabase.from("sundra_line_stops").select("*").in("id", stopIds)
          : Promise.resolve({ data: [], error: null }),
        bookingIds.length
          ? supabase
              .from("sundra_booking_passengers")
              .select("*")
              .in("booking_id", bookingIds)
          : Promise.resolve({ data: [], error: null }),
      ]);

    if (tripsResult.error) throw tripsResult.error;
    if (departuresResult.error) throw departuresResult.error;
    if (stopsResult.error) throw stopsResult.error;
    if (passengersResult.error) throw passengersResult.error;

    const trips = asMap(tripsResult.data as any[]);
    const departures = asMap(departuresResult.data as any[]);
    const stops = asMap(stopsResult.data as any[]);

    const passengerRows = (passengersResult.data || []) as any[];
    const passengersByBooking = new Map<string, any[]>();

    for (const passenger of passengerRows) {
      const key = String(passenger.booking_id || "");
      if (!passengersByBooking.has(key)) passengersByBooking.set(key, []);
      passengersByBooking.get(key)?.push(passenger);
    }

    let rows = bookingRows.map((booking: any) => {
      const stopId =
        booking.stop_id ||
        booking.line_stop_id ||
        booking.pickup_stop_id ||
        booking.selected_line_stop_id ||
        null;

      const trip = booking.trip_id ? trips.get(String(booking.trip_id)) : null;
      const departure = booking.departure_id
        ? departures.get(String(booking.departure_id))
        : null;
      const pickupStop = stopId ? stops.get(String(stopId)) : null;
      const passengers = passengersByBooking.get(String(booking.id)) || [];

      const passengerCount =
        Number(booking.passengers_count || booking.passengers || passengers.length || 0) || 0;

      const calculatedTotal =
        (Number(booking.subtotal || 0) || 0) +
        (Number(booking.options_total || 0) || 0) +
        (Number(booking.room_total || 0) || 0) +
        (Number(booking.seat_extra_total || 0) || 0) -
        (Number(booking.discount_amount || 0) || 0);

      const fallbackUnitPrice =
        Number(departure?.price || 0) ||
        Number(trip?.price_from || 0) ||
        0;

      const resolvedTotalAmount =
        Number(booking.total_amount || 0) ||
        calculatedTotal ||
        fallbackUnitPrice * Math.max(passengerCount, 1) ||
        0;

      const pickupLabel =
        pickupStop?.stop_name
          ? pickupStop.stop_name + (pickupStop.stop_city ? ", " + pickupStop.stop_city : "")
          : booking.pickup_stop_name ||
            booking.pickup_place ||
            booking.selected_stop_name ||
            booking.selected_pickup_stop ||
            booking.pickup_name ||
            "Ej vald";

      return {
        ...booking,
        trip,
        departure,
        pickup_stop: pickupStop,
        pickup_label: pickupLabel,
        total_amount_resolved: resolvedTotalAmount,
        passenger_count_resolved: passengerCount,
        passengers_preview: passengers.slice(0, 4),
      };
    });

    if (q) {
      rows = rows.filter((row: any) => {
        const haystack = [
          row.booking_number,
          row.customer_name,
          row.customer_email,
          row.customer_phone,
          row.status,
          row.payment_status,
          row.trip?.title,
          row.trip?.destination,
          row.pickup_stop?.stop_name,
          row.pickup_stop?.stop_city,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return haystack.includes(q);
      });
    }

    const summary = {
      total: rows.length,
      paid: rows.filter((r: any) => r.payment_status === "paid").length,
      pending: rows.filter((r: any) =>
        ["pending", "pending_payment", "unpaid"].includes(String(r.payment_status || ""))
      ).length,
      cancelled: rows.filter((r: any) => r.status === "cancelled").length,
    };

    return res.status(200).json({
      ok: true,
      bookings: rows,
      summary,
    });
  } catch (error: any) {
    console.error("/api/admin/sundra/bokningar error", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte hämta bokningar.",
    });
  }
}
