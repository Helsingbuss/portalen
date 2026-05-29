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
    throw new Error("Supabase env saknas.");
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
    const paymentStatus = String(req.query.payment_status || "").trim();
    const passengerType = String(req.query.passenger_type || "").trim();

    const limitRaw = Number(req.query.limit || 300);
    const limit = Number.isFinite(limitRaw)
      ? Math.min(Math.max(limitRaw, 1), 500)
      : 300;

    let passengerQuery = supabase
      .from("sundra_booking_passengers")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (passengerType) {
      passengerQuery = passengerQuery.eq("passenger_type", passengerType);
    }

    const { data: passengers, error: passengersError } = await passengerQuery;

    if (passengersError) {
      throw passengersError;
    }

    const passengerRows = passengers || [];
    const bookingIds = uniq(passengerRows.map((p: any) => p.booking_id));

    const { data: bookings, error: bookingsError } = bookingIds.length
      ? await supabase.from("sundra_bookings").select("*").in("id", bookingIds)
      : { data: [], error: null };

    if (bookingsError) {
      throw bookingsError;
    }

    let bookingRows = bookings || [];

    if (paymentStatus) {
      bookingRows = bookingRows.filter(
        (booking: any) => booking.payment_status === paymentStatus
      );
    }

    const bookingsMap = asMap(bookingRows);

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

    const [tripsResult, departuresResult, stopsResult] = await Promise.all([
      tripIds.length
        ? supabase.from("sundra_trips").select("*").in("id", tripIds)
        : Promise.resolve({ data: [], error: null }),
      departureIds.length
        ? supabase.from("sundra_departures").select("*").in("id", departureIds)
        : Promise.resolve({ data: [], error: null }),
      stopIds.length
        ? supabase.from("sundra_line_stops").select("*").in("id", stopIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (tripsResult.error) throw tripsResult.error;
    if (departuresResult.error) throw departuresResult.error;
    if (stopsResult.error) throw stopsResult.error;

    const trips = asMap(tripsResult.data as any[]);
    const departures = asMap(departuresResult.data as any[]);
    const stops = asMap(stopsResult.data as any[]);

    let rows = passengerRows
      .map((passenger: any) => {
        const booking = bookingsMap.get(String(passenger.booking_id));

        if (!booking) return null;

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

        const passengerName =
          [passenger.first_name, passenger.last_name]
            .filter(Boolean)
            .join(" ")
            .trim() ||
          passenger.name ||
          passenger.full_name ||
          "Resenär";

        const seatLabel =
          passenger.seat_number ||
          passenger.seat ||
          passenger.seat_label ||
          "Ej valt";

        const pickupLabel =
          pickupStop?.stop_name
            ? pickupStop.stop_name +
              (pickupStop.stop_city ? ", " + pickupStop.stop_city : "")
            : booking.pickup_stop_name ||
              booking.pickup_place ||
              booking.selected_stop_name ||
              booking.selected_pickup_stop ||
              booking.pickup_name ||
              "Ej vald";

        return {
          ...passenger,
          passenger_name: passengerName,
          seat_label_resolved: seatLabel,
          booking,
          trip,
          departure,
          pickup_stop: pickupStop,
          pickup_label: pickupLabel,
        };
      })
      .filter(Boolean);

    if (q) {
      rows = rows.filter((row: any) => {
        const haystack = [
          row.passenger_name,
          row.passenger_type,
          row.seat_label_resolved,
          row.booking?.booking_number,
          row.booking?.customer_name,
          row.booking?.customer_email,
          row.booking?.customer_phone,
          row.booking?.payment_status,
          row.trip?.title,
          row.trip?.destination,
          row.pickup_label,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return haystack.includes(q);
      });
    }

    const summary = {
      total: rows.length,
      withSeat: rows.filter((r: any) => r.seat_label_resolved !== "Ej valt").length,
      withoutSeat: rows.filter((r: any) => r.seat_label_resolved === "Ej valt").length,
      paid: rows.filter((r: any) => r.booking?.payment_status === "paid").length,
    };

    return res.status(200).json({
      ok: true,
      passengers: rows,
      summary,
    });
  } catch (error: any) {
    console.error("/api/admin/sundra/passagerare error", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte hämta passagerare.",
    });
  }
}
