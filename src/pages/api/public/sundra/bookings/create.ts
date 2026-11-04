import type { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function toNumber(value: any, fallback = 0) {
  if (value === "" || value === null || value === undefined) return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function makeBookingNumber() {
  const year = new Date().getFullYear().toString().slice(-2);
  const random = Math.floor(10000000 + Math.random() * 90000000);
  return `HBR${year}${random}`;
}

function baseUrl() {
  const raw =
    process.env.CUSTOMER_BASE_URL ||
    process.env.NEXT_PUBLIC_CUSTOMER_BASE_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    "https://kund.helsingbuss.se";

  return raw.replace(/\/$/, "");
}

function cleanPassenger(p: any) {
  return {
    first_name: p?.first_name || null,
    last_name: p?.last_name || null,
    passenger_type: p?.passenger_type || "adult",
    date_of_birth: p?.date_of_birth || null,
    special_requests: p?.special_requests || null,
    seat_number: p?.seat_number || null,
    seat_price: 0,
  };
}

function buildPassengers(
  bodyPassengers: any[],
  passengersCount: number,
  customerName: string
) {
  return Array.from({ length: passengersCount }).map((_, index) => {
    const existing = bodyPassengers[index] || {};
    const fallbackName = index === 0 ? customerName : "";

    if (existing.first_name || existing.last_name) {
      return cleanPassenger(existing);
    }

    const parts = fallbackName.trim().split(" ").filter(Boolean);
    const firstName = parts[0] || null;
    const lastName = parts.slice(1).join(" ") || null;

    return cleanPassenger({
      ...existing,
      first_name: firstName,
      last_name: lastName,
    });
  });
}


async function validateSelectedSeats({
  departureId,
  passengers,
}: {
  departureId: string;
  passengers: any[];
}) {
  const selectedSeats = passengers.map((p) => p?.seat_number).filter(Boolean);

  if (selectedSeats.length === 0) return;

  const uniqueSeats = new Set(selectedSeats);

  if (uniqueSeats.size !== selectedSeats.length) {
    throw new Error("Samma sÃ¤te har valts flera gÃ¥nger.");
  }

  const { data: occupiedPassengers, error } = await supabaseAdmin
    .from("sundra_booking_passengers")
    .select(`
      id,
      seat_number,
      sundra_bookings (
        id,
        departure_id,
        status
      )
    `)
    .in("seat_number", selectedSeats);

  if (error) throw error;

  const occupied = (occupiedPassengers || []).filter((p: any) => {
    const booking = Array.isArray(p.sundra_bookings)
      ? p.sundra_bookings[0]
      : p.sundra_bookings;

    return booking?.departure_id === departureId && booking?.status !== "cancelled";
  });

  if (occupied.length > 0) {
    throw new Error(
      `SÃ¤te ${occupied.map((p: any) => p.seat_number).join(", ")} Ã¤r redan bokat.`
    );
  }
}


function activeSundraBooking(booking: any) {
  const status = String(booking?.status || "").toLowerCase();
  const paymentStatus = String(booking?.payment_status || "").toLowerCase();

  const inactiveStatuses = new Set([
    "cancelled",
    "canceled",
    "expired",
    "failed",
    "refunded",
    "deleted",
    "void",
  ]);

  return !inactiveStatuses.has(status) && !inactiveStatuses.has(paymentStatus);
}

function seatColumnOrder(value: any) {
  const col = String(value || "").toUpperCase();
  const order: Record<string, number> = {
    A: 1,
    B: 2,
    C: 3,
    D: 4,
  };

  return order[col] || 99;
}

function seatSort(a: any, b: any) {
  const rowA = Number(a?.row_number || 0);
  const rowB = Number(b?.row_number || 0);

  if (rowA !== rowB) return rowA - rowB;

  const colDiff = seatColumnOrder(a?.seat_column) - seatColumnOrder(b?.seat_column);
  if (colDiff !== 0) return colDiff;

  return String(a?.seat_number || "").localeCompare(String(b?.seat_number || ""));
}

function pickSeatsTogether(availableSeats: any[], count: number) {
  const sorted = [...availableSeats].sort(seatSort);

  if (count <= 0) return [];

  const byRow = new Map<number, any[]>();

  for (const seat of sorted) {
    const row = Number(seat?.row_number || 0);
    if (!byRow.has(row)) byRow.set(row, []);
    byRow.get(row)!.push(seat);
  }

  const rows = Array.from(byRow.entries()).sort((a, b) => a[0] - b[0]);

  for (const [, rowSeatsRaw] of rows) {
    const rowSeats = [...rowSeatsRaw].sort(seatSort);

    if (rowSeats.length >= count) {
      for (let i = 0; i <= rowSeats.length - count; i++) {
        const slice = rowSeats.slice(i, i + count);
        return slice.map((s) => String(s.seat_number).toUpperCase());
      }
    }
  }

  const chosen: string[] = [];

  for (const [, rowSeatsRaw] of rows) {
    const rowSeats = [...rowSeatsRaw].sort(seatSort);

    for (const seat of rowSeats) {
      if (chosen.length >= count) break;
      chosen.push(String(seat.seat_number).toUpperCase());
    }

    if (chosen.length >= count) break;
  }

  return chosen;
}

async function assignAutomaticSeats({
  departureId,
  passengers,
}: {
  departureId: string;
  passengers: any[];
}) {
  const missingSeatIndexes = passengers
    .map((passenger, index) => ({ passenger, index }))
    .filter(({ passenger }) => !passenger?.seat_number)
    .map(({ index }) => index);

  if (missingSeatIndexes.length === 0) {
    return passengers;
  }

  const alreadySelected = new Set(
    passengers
      .map((p) => p?.seat_number)
      .filter(Boolean)
      .map((seat) => String(seat).toUpperCase())
  );

  const { data: departure, error: departureError } = await supabaseAdmin
    .from("sundra_departures")
    .select(`
      id,
      bus_map_id,
      sundra_bus_maps (
        id,
        name,
        seats_count,
        sundra_bus_map_seats (
          id,
          seat_number,
          row_number,
          seat_column,
          seat_type,
          seat_label,
          seat_price,
          is_active,
          is_blocked,
          is_selectable
        )
      )
    `)
    .eq("id", departureId)
    .single();

  if (departureError) throw departureError;

  const busMap = Array.isArray(departure?.sundra_bus_maps)
    ? departure.sundra_bus_maps[0]
    : departure?.sundra_bus_maps;

  const allSeats = busMap?.sundra_bus_map_seats || [];

  if (!allSeats.length) {
    return passengers;
  }

  const { data: occupiedPassengers, error: occupiedError } = await supabaseAdmin
    .from("sundra_booking_passengers")
    .select(`
      id,
      seat_number,
      sundra_bookings (
        id,
        departure_id,
        status,
        payment_status
      )
    `)
    .not("seat_number", "is", null);

  if (occupiedError) throw occupiedError;

  const occupiedSeats = new Set(
    (occupiedPassengers || [])
      .filter((p: any) => {
        const booking = Array.isArray(p.sundra_bookings)
          ? p.sundra_bookings[0]
          : p.sundra_bookings;

        return String(booking?.departure_id) === String(departureId) && activeSundraBooking(booking);
      })
      .map((p: any) => String(p.seat_number).toUpperCase())
  );

  const availableSeats = allSeats
    .filter((seat: any) => {
      const seatNumber = String(seat?.seat_number || "").toUpperCase();

      if (!seatNumber) return false;
      if (alreadySelected.has(seatNumber)) return false;
      if (occupiedSeats.has(seatNumber)) return false;
      if (seat.is_active === false) return false;
      if (seat.is_blocked === true) return false;
      if (seat.is_selectable === false) return false;

      return true;
    })
    .sort(seatSort);

  if (availableSeats.length < missingSeatIndexes.length) {
    throw new Error(`Det finns bara ${availableSeats.length} lediga sÃ¤ten kvar pÃ¥ platskartan.`);
  }

  const pickedSeats = pickSeatsTogether(availableSeats, missingSeatIndexes.length);

  if (pickedSeats.length < missingSeatIndexes.length) {
    throw new Error("Kunde inte reservera sÃ¤ten automatiskt.");
  }

  return passengers.map((passenger, index) => {
    const missingIndex = missingSeatIndexes.indexOf(index);

    if (missingIndex === -1) {
      return passenger;
    }

    return {
      ...passenger,
      seat_number: pickedSeats[missingIndex],
      seat_price: 0,
    };
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({
        ok: false,
        error: "Method not allowed",
      });
    }

    const body = req.body || {};

    if (!body.trip_id || !body.departure_id) {
      return res.status(400).json({
        ok: false,
        error: "Resa eller avgÃ¥ng saknas.",
      });
    }

    if (!body.customer_name || !body.customer_email || !body.customer_phone) {
      return res.status(400).json({
        ok: false,
        error: "Kunduppgifter saknas.",
      });
    }

    const passengersCount = Number(body.passengers_count);

    if (
      !Number.isSafeInteger(passengersCount) ||
      passengersCount < 1 ||
      passengersCount > 80
    ) {
      return res.status(400).json({
        ok: false,
        error: "Antalet resenÃ¤rer mÃ¥ste vara ett heltal mellan 1 och 80.",
      });
    }
    const bodyPassengers = Array.isArray(body.passengers) ? body.passengers : [];
    let passengers = buildPassengers(
      bodyPassengers,
      passengersCount,
      body.customer_name
    );

    const { data: departure, error: depError } = await supabaseAdmin
      .from("sundra_departures")
      .select(`
        id,
        trip_id,
        line_id,
        departure_time,
        price,
        capacity,
        booked_count,
        status,
        sundra_trips (
          id,
          title,
          slug,
          currency
        )
      `)
      .eq("id", body.departure_id)
      .single();

    if (depError) throw depError;

    if (!departure) {
      return res.status(404).json({
        ok: false,
        error: "AvgÃ¥ngen hittades inte.",
      });
    }

    if (departure.status !== "open") {
      return res.status(400).json({
        ok: false,
        error: "AvgÃ¥ngen Ã¤r inte bokningsbar.",
      });
    }

    if (String(departure.trip_id) !== String(body.trip_id)) {
      return res.status(400).json({
        ok: false,
        error: "AvgÃ¥ngen matchar inte vald resa.",
      });
    }

    const seatsLeft =
      Number(departure.capacity || 0) - Number(departure.booked_count || 0);

    if (seatsLeft < passengersCount) {
      return res.status(400).json({
        ok: false,
        error: `Det finns bara ${Math.max(0, seatsLeft)} platser kvar.`,
      });
    }
    // RESOR07F3B2
    // Kunden skickar endast vilket line-stop som valts.
    // Pris och tid bestÃ¤ms pÃ¥ servern.
    const requestedLineStopId =
      String(
        body.line_stop_id ||
        "",
      ).trim();

    if (!requestedLineStopId) {
      return res.status(400).json({
        ok: false,
        error:
          "PÃ¥stigningsplats saknas.",
      });
    }

    const {
      data: lineLinks,
      error: lineLinksError,
    } =
      await supabaseAdmin
        .from(
          "sundra_departure_lines",
        )
        .select(
          "line_id",
        )
        .eq(
          "departure_id",
          body.departure_id,
        );

    if (lineLinksError) {
      throw lineLinksError;
    }

    const allowedLineIds =
      new Set(
        [
          ...(
            lineLinks || []
          ).map(
            (row: any) =>
              String(
                row.line_id ||
                "",
              ),
          ),

          departure.line_id
            ? String(
                departure.line_id,
              )
            : "",
        ].filter(Boolean),
      );

    const {
      data: selectedStop,
      error: selectedStopError,
    } =
      await supabaseAdmin
        .from(
          "sundra_line_stops",
        )
        .select(`
          id,
          line_id,
          stop_name,
          stop_id,
          default_departure_time,
          price,
          stop_order,
          active
        `)
        .eq(
          "id",
          requestedLineStopId,
        )
        .limit(1)
        .maybeSingle();

    if (selectedStopError) {
      throw selectedStopError;
    }

    if (!selectedStop) {
      return res.status(400).json({
        ok: false,
        error:
          "PÃ¥stigningsplatsen hittades inte.",
      });
    }

    if (
      selectedStop.active ===
      false
    ) {
      return res.status(400).json({
        ok: false,
        error:
          "PÃ¥stigningsplatsen Ã¤r inte aktiv.",
      });
    }

    if (
      !allowedLineIds.has(
        String(
          selectedStop.line_id,
        ),
      )
    ) {
      return res.status(400).json({
        ok: false,
        error:
          "PÃ¥stigningsplatsen hÃ¶r inte till denna avgÃ¥ng.",
      });
    }

    if (
      body.line_id &&
      String(body.line_id) !==
        String(
          selectedStop.line_id,
        )
    ) {
      return res.status(400).json({
        ok: false,
        error:
          "Linjen stÃ¤mmer inte med vald pÃ¥stigningsplats.",
      });
    }

    const {
      data: stopOverride,
      error: stopOverrideError,
    } =
      await supabaseAdmin
        .from(
          "sundra_departure_stop_overrides",
        )
        .select(`
          departure_time,
          price
        `)
        .eq(
          "departure_id",
          body.departure_id,
        )
        .eq(
          "line_stop_id",
          selectedStop.id,
        )
        .limit(1)
        .maybeSingle();

    if (stopOverrideError) {
      throw stopOverrideError;
    }

    const effectivePickupTime =
      stopOverride
        ?.departure_time ||
      selectedStop.default_departure_time ||
      departure
        .departure_time ||
      null;

    const effectivePickupPrice =
      stopOverride?.price !==
        null &&
      stopOverride?.price !==
        undefined
        ? Number(
            stopOverride.price,
          )
        : selectedStop.price !==
              null &&
            selectedStop.price !==
              undefined
          ? Number(
              selectedStop.price,
            )
          : Number(
              departure.price ||
              0,
            );

    passengers = await assignAutomaticSeats({
      departureId: body.departure_id,
      passengers,
    });

    await validateSelectedSeats({
      departureId: body.departure_id,
      passengers,
    });

    // RESERVATIONER04BN - serverkontrollerade satespriser
    const { data: seatDeparture, error: seatDepartureError } =
      await supabaseAdmin
        .from("sundra_departures")
        .select(`
          bus_map_id,
          sundra_bus_maps (
            sundra_bus_map_seats (
              seat_number,
              seat_price,
              is_active,
              is_blocked,
              is_selectable
            )
          )
        `)
        .eq("id", body.departure_id)
        .single();

    if (seatDepartureError) throw seatDepartureError;

    const rawBusMap = seatDeparture?.sundra_bus_maps;
    const seatBusMap: any = Array.isArray(rawBusMap)
      ? rawBusMap[0]
      : rawBusMap;

    const seatRows: any[] =
      seatBusMap?.sundra_bus_map_seats || [];

    if (seatRows.length > 0) {
      const seatPrices = new Map<string, number>();

      for (const seat of seatRows) {
        const number = String(seat.seat_number || "")
          .trim()
          .toUpperCase();

        if (!number) continue;
        if (seat.is_active === false) continue;
        if (seat.is_blocked === true) continue;
        if (seat.is_selectable === false) continue;

        const price = Number(seat.seat_price ?? 0);

        if (!Number.isFinite(price) || price < 0) {
          return res.status(400).json({
            ok: false,
            error: "Ogiltigt satespris i platskartan.",
          });
        }

        seatPrices.set(number, price);
      }

      passengers = passengers.map((passenger: any) => {
        const number = String(passenger.seat_number || "")
          .trim()
          .toUpperCase();

        if (!seatPrices.has(number)) {
          throw new Error(
            "Vald plats saknas eller ar inte bokningsbar."
          );
        }

        return {
          ...passenger,
          seat_number: number,
          seat_price: 0,
        };
      });
    } else {
      // Utan platskarta far webblasaren inte ange satestillagg.
      passengers = passengers.map((passenger: any) => ({
        ...passenger,
        seat_price: 0,
      }));
    }
    const trip: any = Array.isArray(departure.sundra_trips)
      ? departure.sundra_trips[0]
      : departure.sundra_trips;

    const unitPrice = toNumber(effectivePickupPrice, 0);
    const subtotal = unitPrice * passengersCount;

    const unsafeAmounts = [
      body.options_total,
      body.room_total,
      body.discount_amount,
    ];

    if (
      unsafeAmounts.some(
        (value) =>
          value !== undefined &&
          value !== null &&
          (!Number.isFinite(Number(value)) || Number(value) !== 0)
      )
    ) {
      return res.status(400).json({
        ok: false,
        error:
          "Tillval, hotellkostnad och rabatter mÃ¥ste berÃ¤knas av bokningssystemet.",
      });
    }

    const optionsTotal = 0;
    const roomTotal = toNumber(body.room_total, 0);

    const seatExtraTotal = 0;
    // SEAT-PRICING-OFF:
    // PlatstillÃ¤gg Ã¤r avaktiverat. Platsnummer fÃ¥r fortfarande sparas.

    const discountAmount = toNumber(body.discount_amount, 0);

    const totalAmount = Math.max(
      0,
      subtotal + optionsTotal + roomTotal + seatExtraTotal - discountAmount
    );

    const currency = body.currency || trip?.currency || "SEK";
    // STRIPE-ONLY
    // Helsingbuss Resor anvÃ¤nder endast Stripe.
    {
      const stripeKey = process.env.STRIPE_SECRET_KEY?.trim() || "";

      if (!stripeKey.startsWith("sk_")) {
        return res.status(503).json({
          ok: false,
          error: "Betalningen Ã¤r tillfÃ¤lligt otillgÃ¤nglig. Kontakta Helsingbuss.",
        });
      }

      if (
        passengers.some(
          (p: any) =>
            !String(p.first_name || "").trim() ||
            !String(p.last_name || "").trim()
        )
      ) {
        return res.status(400).json({
          ok: false,
          error: "FÃ¶r- och efternamn krÃ¤vs fÃ¶r varje resenÃ¤r.",
        });
      }

      const { data: result, error: rpcError } =
        await supabaseAdmin.rpc("helsingbuss_create_booking_v2", {
          p_departure_id: body.departure_id,
          p_customer_name: String(body.customer_name).trim(),
          p_customer_email: String(body.customer_email).trim(),
          p_customer_phone: String(body.customer_phone).trim(),
          p_customer_address: body.customer_address || null,
          p_line_stop_id: selectedStop.id,
          p_passengers: passengers.map((p: any) => ({
            first_name: p.first_name,
            last_name: p.last_name,
            passenger_type: p.passenger_type,
            date_of_birth: p.date_of_birth,
            special_requests: p.special_requests,
            seat_number: p.seat_number,
          })),
        });

      if (rpcError) {
        console.error("Helsingbuss V2 booking error:", rpcError);
        return res.status(409).json({
          ok: false,
          error: "Bokningen kunde inte genomfÃ¶ras. Kontrollera platser och avgÃ¥ng.",
        });
      }

      if (!result?.ok || !result.booking_id) {
        throw new Error("Bokningsfunktionen returnerade inget boknings-ID.");
      }

      // STRIPE EMBEDDED CARD PAYMENT
      // Bokningen skapas först. Stripe PaymentIntent använder serverns belopp.
      // Kunden fyller kortuppgifterna direkt på Helsingbuss webbplats.
      const stripe = new Stripe(stripeKey);

      const amountOre = Math.round(
        Number(result.total_amount) * 100
      );

      if (!Number.isSafeInteger(amountOre) || amountOre <= 0) {
        return res.status(500).json({
          ok: false,
          error: "Bokningens betalningsbelopp ar ogiltigt.",
          booking_id: result.booking_id,
          booking_number: result.booking_number,
          payment_pending: true,
          retry_new_booking: false,
        });
      }

      let paymentIntent: Stripe.PaymentIntent;

      try {
        paymentIntent = await stripe.paymentIntents.create({
          amount: amountOre,
          currency: "sek",
          payment_method_types: ["card"],
          receipt_email: String(body.customer_email).trim(),
          description: `${trip?.title || "Helsingbuss resa"} - ${result.booking_number}`,
          metadata: {
            system: "sundra",
            source: "helsingbuss_resor",
            booking_id: String(result.booking_id),
            booking_number: String(result.booking_number),
          },
        });
      } catch (paymentIntentError) {
        console.error("Helsingbuss Stripe PaymentIntent failed:", {
          bookingId: result.booking_id,
          error: paymentIntentError,
        });

        return res.status(503).json({
          ok: false,
          error: "Din bokning har registrerats, men kortbetalningen kunde inte startas. Forsok inte skapa en ny bokning.",
          booking_id: result.booking_id,
          booking_number: result.booking_number,
          payment_pending: true,
          retry_new_booking: false,
        });
      }

      if (!paymentIntent.client_secret) {
        return res.status(503).json({
          ok: false,
          error: "Stripe returnerade ingen betalningsnyckel.",
          booking_id: result.booking_id,
          booking_number: result.booking_number,
          payment_pending: true,
          retry_new_booking: false,
        });
      }

      const { data: savedReference, error: referenceError } =
        await supabaseAdmin
          .from("sundra_bookings")
          .update({
            payment_reference: paymentIntent.id,
            updated_at: new Date().toISOString(),
          })
          .eq("id", result.booking_id)
          .eq("payment_status", "unpaid")
          .select("id")
          .single();

      if (referenceError || !savedReference) {
        console.error("Helsingbuss Stripe reference error:", referenceError);
        throw new Error(
          "Bokningen skapades men Stripe-referensen kunde inte sparas."
        );
      }

      return res.status(201).json({
        ok: true,
        booking_id: result.booking_id,
        booking_number: result.booking_number,
        total_amount: Number(result.total_amount),
        currency: "SEK",
        client_secret: paymentIntent.client_secret,
        payment_intent_id: paymentIntent.id,
        redirect_url: `/boka/bekraftelse/${result.booking_id}`,
      });
    }

  } catch (e: any) {
    console.error("/api/public/sundra/bookings/create error:", e?.message || e);

    return res.status(500).json({
      ok: false,
      error: e?.message || "Kunde inte skapa bokningen.",
    });
  }
}
