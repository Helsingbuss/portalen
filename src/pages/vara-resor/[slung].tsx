import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import SeatMap, { SeatMapSeat } from "@/components/sundra/SeatMap";

type Departure = {
  id: string;
  departure_date?: string | null;
  departure_time?: string | null;
  return_date?: string | null;
  return_time?: string | null;
  departure_location?: string | null;
  destination_location?: string | null;
  price?: number | null;
  capacity?: number | null;
  booked_count?: number | null;
  seats_left?: number | null;
  bus_map_id?: string | null;
  has_seat_map?: boolean;
};

type Trip = {
  id: string;
  title: string;
  slug: string;
  destination?: string | null;
  short_description?: string | null;
  description?: string | null;
  image_url?: string | null;
  price_from?: number | null;
  currency?: string | null;
  campaign_label?: string | null;
  campaign_text?: string | null;
  seo_title?: string | null;
  seo_description?: string | null;
  departures: Departure[];
};

function money(n?: number | null) {
  return Number(n || 0).toLocaleString("sv-SE", {
    style: "currency",
    currency: "SEK",
    maximumFractionDigits: 0,
  });
}

function fmtDate(date?: string | null) {
  if (!date) return "Datum saknas";
  return new Intl.DateTimeFormat("sv-SE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00`));
}

function fmtTime(time?: string | null) {
  if (!time) return "";
  return String(time).slice(0, 5);
}

export default function TripPage() {
  const router = useRouter();
  const { slug } = router.query;

  const [trip, setTrip] = useState<Trip | null>(null);
  const [selectedDepartureId, setSelectedDepartureId] = useState("");
  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [error, setError] = useState("");

  const [qty, setQty] = useState(1);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  const [seatLoading, setSeatLoading] = useState(false);
  const [seats, setSeats] = useState<SeatMapSeat[]>([]);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);

  const selectedDeparture = useMemo(() => {
    return trip?.departures?.find((d) => d.id === selectedDepartureId) || null;
  }, [trip, selectedDepartureId]);

  useEffect(() => {
    if (!slug || typeof slug !== "string") return;
    loadTrip(slug);
  }, [slug]);

  useEffect(() => {
    if (!selectedDeparture?.id || !selectedDeparture.has_seat_map) {
      setSeats([]);
      setSelectedSeats([]);
      return;
    }

    loadSeats(selectedDeparture.id);
  }, [selectedDeparture?.id]);

  async function loadTrip(currentSlug: string) {
    try {
      setLoading(true);
      setError("");

      const res = await fetch(`/api/public/sundra/trips/${currentSlug}`);
      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Kunde inte hämta resan.");
      }

      setTrip(json.trip);

      if (json.trip?.departures?.length) {
        setSelectedDepartureId(json.trip.departures[0].id);
      }
    } catch (e: any) {
      setError(e?.message || "Något gick fel.");
    } finally {
      setLoading(false);
    }
  }

  async function loadSeats(departureId: string) {
    try {
      setSeatLoading(true);
      setSeats([]);
      setSelectedSeats([]);

      const res = await fetch(`/api/public/sundra/departures/${departureId}/seats`);
      const json = await res.json().catch(() => ({}));

      if (res.ok && json?.ok) {
        setSeats(json.seats || []);
      }
    } finally {
      setSeatLoading(false);
    }
  }

  function toggleSeat(seat: SeatMapSeat) {
    setSelectedSeats((prev) => {
      const exists = prev.includes(seat.seat_number);

      if (exists) {
        return prev.filter((s) => s !== seat.seat_number);
      }

      if (prev.length >= qty) {
        alert(`Du kan bara välja ${qty} plats(er).`);
        return prev;
      }

      return [...prev, seat.seat_number];
    });
  }

  function updateQty(value: number) {
    const next = Math.max(1, value || 1);
    setQty(next);
    setSelectedSeats((prev) => prev.slice(0, next));
  }

  const selectedSeatObjects = seats.filter((seat) =>
    selectedSeats.includes(seat.seat_number)
  );

  const seatExtraTotal = selectedSeatObjects.reduce(
    (sum, seat) => sum + Number(seat.seat_price || 0),
    0
  );

  const unitPrice = Number(selectedDeparture?.price || trip?.price_from || 0);
  const subtotal = unitPrice * qty;
  const total = subtotal + seatExtraTotal;

  async function createBooking() {
    try {
      if (!trip || !selectedDeparture) {
        alert("Välj ett datum först.");
        return;
      }

      if (!customerName || !customerEmail || !customerPhone) {
        alert("Fyll i namn, e-post och telefon.");
        return;
      }

      if (seats.length > 0 && selectedSeats.length > 0 && selectedSeats.length !== qty) {
        alert(`Du har valt ${selectedSeats.length} säte(n), men antal resenärer är ${qty}.`);
        return;
      }

      setBookingLoading(true);

      const [firstName, ...lastParts] = customerName.trim().split(" ");
      const lastName = lastParts.join(" ");

      const passengers = Array.from({ length: qty }).map((_, index) => {
        const seatNumber = selectedSeats[index] || null;
        const seat = seats.find((s) => s.seat_number === seatNumber);

        return {
          first_name: index === 0 ? firstName : "",
          last_name: index === 0 ? lastName : "",
          passenger_type: "adult",
          date_of_birth: "",
          special_requests: "",
          seat_number: seatNumber,
          seat_price: Number(seat?.seat_price || 0),
        };
      });

      const res = await fetch("/api/public/sundra/bookings/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          trip_id: trip.id,
          departure_id: selectedDeparture.id,

          passengers_count: qty,
          passengers,

          customer_name: customerName,
          customer_email: customerEmail,
          customer_phone: customerPhone,
          customer_address: null,

          notes: selectedSeats.length
            ? `Valda säten: ${selectedSeats.join(", ")}`
            : null,

          subtotal,
          seat_extra_total: seatExtraTotal,
          total_amount: total,
          currency: trip.currency || "SEK",
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Kunde inte skapa bokning.");
      }

      const link = json.checkout_url || json.payment_url || json.redirect_url;

      if (!link) {
        throw new Error("Ingen betalningslänk skapades.");
      }

      window.location.href = link.startsWith("http")
        ? link
        : `${window.location.origin}${link}`;
    } catch (e: any) {
      alert(e?.message || "Något gick fel vid bokning.");
    } finally {
      setBookingLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f4f0] p-8 text-[#194C66]">
        Laddar resa...
      </div>
    );
  }

  if (error || !trip) {
    return (
      <div className="min-h-screen bg-[#f5f4f0] p-8 text-red-700">
        {error || "Resan hittades inte."}
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>{trip.seo_title || trip.title}</title>
        <meta
          name="description"
          content={trip.seo_description || trip.short_description || ""}
        />
      </Head>

      <div className="min-h-screen bg-[#f5f4f0] text-[#0f172a]">
        <section className="relative min-h-[430px] overflow-hidden bg-[#194C66]">
          {trip.image_url && (
            <img
              src={trip.image_url}
              alt={trip.title}
              className="absolute inset-0 h-full w-full object-cover opacity-55"
            />
          )}

          <div className="absolute inset-0 bg-gradient-to-r from-[#0f172a]/80 via-[#0f172a]/45 to-transparent" />

          <div className="relative mx-auto flex min-h-[430px] max-w-7xl items-end px-6 py-12">
            <div className="max-w-3xl text-white">
              {trip.campaign_label && (
                <div className="mb-4 inline-flex rounded-full bg-white px-4 py-2 text-sm font-bold text-[#A61E22]">
                  {trip.campaign_label}
                </div>
              )}

              <h1 className="text-4xl font-bold md:text-6xl">{trip.title}</h1>

              {trip.short_description && (
                <p className="mt-4 max-w-2xl text-lg text-white/90">
                  {trip.short_description}
                </p>
              )}
            </div>
          </div>
        </section>

        <main className="mx-auto grid max-w-7xl gap-8 px-6 py-10 lg:grid-cols-[1fr_430px]">
          <div className="space-y-6">
            <section className="rounded-3xl bg-white p-6 shadow">
              <h2 className="text-2xl font-bold text-[#194C66]">
                Om resan
              </h2>

              <div className="mt-4 whitespace-pre-line text-base leading-7 text-gray-600">
                {trip.description || trip.short_description || "Beskrivning kommer snart."}
              </div>
            </section>

            <section className="rounded-3xl bg-white p-6 shadow">
              <h2 className="text-2xl font-bold text-[#194C66]">
                Välj datum
              </h2>

              {trip.departures.length === 0 ? (
                <p className="mt-4 text-sm text-gray-500">
                  Inga bokningsbara avgångar finns just nu.
                </p>
              ) : (
                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  {trip.departures.map((dep) => {
                    const active = dep.id === selectedDepartureId;

                    return (
                      <button
                        key={dep.id}
                        onClick={() => setSelectedDepartureId(dep.id)}
                        className={`rounded-2xl border p-4 text-left transition ${
                          active
                            ? "border-[#007764] bg-[#eafaf7]"
                            : "border-gray-200 bg-white hover:bg-gray-50"
                        }`}
                      >
                        <div className="font-bold text-[#194C66]">
                          {fmtDate(dep.departure_date)}
                        </div>

                        <div className="mt-1 text-sm text-gray-600">
                          Avgång {fmtTime(dep.departure_time)}
                          {dep.return_time ? ` · Retur ${fmtTime(dep.return_time)}` : ""}
                        </div>

                        <div className="mt-3 flex items-center justify-between">
                          <span className="text-sm text-gray-500">
                            {dep.seats_left ?? 0} platser kvar
                          </span>

                          <span className="font-bold text-[#194C66]">
                            {money(dep.price || trip.price_from)}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>

            {selectedDeparture?.has_seat_map && (
              <section className="rounded-3xl bg-white p-6 shadow">
                {seatLoading ? (
                  <p className="text-sm text-gray-500">Laddar platskarta...</p>
                ) : seats.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    Platskarta saknas för denna avgång.
                  </p>
                ) : (
                  <SeatMap
                    seats={seats}
                    selectedSeats={selectedSeats}
                    maxSelectable={qty}
                    showLegend
                    showSummary={false}
                    title="Välj plats"
                    subtitle="Du kan välja plats eller låta oss placera dig automatiskt."
                    onSeatClick={toggleSeat}
                  />
                )}
              </section>
            )}
          </div>

          <aside className="h-fit rounded-3xl bg-white p-6 shadow lg:sticky lg:top-6">
            <h2 className="text-2xl font-bold text-[#194C66]">
              Boka resa
            </h2>

            <div className="mt-5 rounded-2xl bg-[#f8fafc] p-4">
              <div className="text-sm text-gray-500">Valt datum</div>
              <div className="mt-1 font-bold text-[#0f172a]">
                {selectedDeparture
                  ? fmtDate(selectedDeparture.departure_date)
                  : "Välj datum"}
              </div>

              {selectedDeparture && (
                <div className="mt-1 text-sm text-gray-500">
                  Avgång {fmtTime(selectedDeparture.departure_time)}
                </div>
              )}
            </div>

            <div className="mt-5">
              <label className="mb-1 block text-sm font-semibold text-[#194C66]">
                Antal resenärer
              </label>

              <input
                type="number"
                min={1}
                max={selectedDeparture?.seats_left || 99}
                value={qty}
                onChange={(e) => updateQty(Number(e.target.value))}
                className="w-full rounded-xl border px-4 py-3"
              />
            </div>

            {selectedSeats.length > 0 && (
              <div className="mt-5 rounded-2xl border border-[#b7e7df] bg-[#eafaf7] p-4 text-sm text-[#006b5b]">
                <div className="font-bold">Valda säten</div>
                <div className="mt-1">{selectedSeats.join(", ")}</div>
              </div>
            )}

            <div className="mt-5 space-y-3">
              <input
                placeholder="Namn"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full rounded-xl border px-4 py-3"
              />

              <input
                placeholder="E-post"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                className="w-full rounded-xl border px-4 py-3"
              />

              <input
                placeholder="Telefon"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="w-full rounded-xl border px-4 py-3"
              />
            </div>

            <div className="mt-6 border-t pt-5">
              <div className="flex justify-between text-sm">
                <span>Resa</span>
                <span>{money(subtotal)}</span>
              </div>

              {seatExtraTotal > 0 && (
                <div className="mt-2 flex justify-between text-sm text-[#194C66]">
                  <span>Sätesval</span>
                  <span>{money(seatExtraTotal)}</span>
                </div>
              )}

              <div className="mt-4 flex justify-between text-xl font-bold">
                <span>Totalt</span>
                <span>{money(total)}</span>
              </div>
            </div>

            <button
              onClick={createBooking}
              disabled={bookingLoading || !selectedDeparture}
              className="mt-6 w-full rounded-full bg-[#007764] px-5 py-4 text-base font-bold text-white shadow disabled:opacity-50"
            >
              {bookingLoading ? "Skapar bokning..." : "Fortsätt till betalning"}
            </button>

            <p className="mt-4 text-center text-xs text-gray-500">
              Betalning sker tryggt via SumUp.
            </p>
          </aside>
        </main>
      </div>
    </>
  );
}
