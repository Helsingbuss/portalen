import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import SeatMap, { SeatMapSeat } from "@/components/sundra/SeatMap";

const API_BASE = "https://kund.helsingbuss.se";

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
  category?: string | null;
  destination?: string | null;
  location?: string | null;
  country?: string | null;
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

function fmtShortDate(date?: string | null) {
  if (!date) return { day: "–", month: "Datum" };

  const d = new Date(`${date}T00:00:00`);
  return {
    day: new Intl.DateTimeFormat("sv-SE", { day: "numeric" }).format(d),
    month: new Intl.DateTimeFormat("sv-SE", { month: "short" }).format(d),
  };
}

function fmtTime(time?: string | null) {
  if (!time) return "Tid kommer";
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

  const sortedDepartures = useMemo(() => {
    return [...(trip?.departures || [])].sort((a, b) =>
      `${a.departure_date || ""}${a.departure_time || ""}`.localeCompare(
        `${b.departure_date || ""}${b.departure_time || ""}`
      )
    );
  }, [trip]);

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

      const res = await fetch(
        `${API_BASE}/api/public/sundra/trips/${encodeURIComponent(currentSlug)}`
      );

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

      const res = await fetch(
        `${API_BASE}/api/public/sundra/departures/${departureId}/seats`
      );

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

      if (exists) return prev.filter((s) => s !== seat.seat_number);

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

      if (
        seats.length > 0 &&
        selectedSeats.length > 0 &&
        selectedSeats.length !== qty
      ) {
        alert(
          `Du har valt ${selectedSeats.length} säte(n), men antal resenärer är ${qty}.`
        );
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

      const res = await fetch(`${API_BASE}/api/public/sundra/bookings/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
      if (!link) throw new Error("Ingen betalningslänk skapades.");

      window.location.href = link.startsWith("http")
        ? link
        : `${API_BASE}${link}`;
    } catch (e: any) {
      alert(e?.message || "Något gick fel vid bokning.");
    } finally {
      setBookingLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f0e8] p-8 text-[#194C66]">
        Laddar resa...
      </div>
    );
  }

  if (error || !trip) {
    return (
      <div className="min-h-screen bg-[#f5f0e8] p-8 text-red-700">
        {error || "Resan hittades inte."}
      </div>
    );
  }

  const nextDate = selectedDeparture || sortedDepartures[0];
  const short = fmtShortDate(nextDate?.departure_date);

  return (
    <>
      <Head>
        <title>{trip.seo_title || trip.title}</title>
        <meta
          name="description"
          content={trip.seo_description || trip.short_description || ""}
        />
      </Head>

      <div className="min-h-screen bg-[#f5f0e8] text-[#0f172a]">
        <section className="relative min-h-[620px] overflow-hidden bg-[#194C66]">
          {trip.image_url && (
            <img
              src={trip.image_url}
              alt={trip.title}
              className="absolute inset-0 h-full w-full object-cover"
            />
          )}

          <div className="absolute inset-0 bg-gradient-to-r from-[#071923]/90 via-[#071923]/55 to-[#071923]/10" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#071923]/75 via-transparent to-transparent" />

          <div className="relative mx-auto flex min-h-[620px] max-w-7xl items-end px-5 pb-20 pt-32 md:px-8">
            <div className="max-w-4xl text-white">
              <div className="mb-5 inline-flex rounded-full bg-white px-5 py-2 text-sm font-extrabold text-[#A61E22] shadow">
                {trip.campaign_label || trip.category || "Helsingbuss Resor"}
              </div>

              <h1 className="text-5xl font-black leading-[0.98] tracking-[-0.05em] md:text-7xl">
                {trip.title}
              </h1>

              {trip.short_description && (
                <p className="mt-6 max-w-3xl text-lg leading-8 text-white/90 md:text-xl">
                  {trip.short_description}
                </p>
              )}

              <div className="mt-8 flex flex-wrap gap-3">
                <a
                  href="#boka"
                  className="rounded-full bg-[#007764] px-7 py-4 font-extrabold text-white shadow-lg shadow-[#007764]/25"
                >
                  Boka resa
                </a>

                <a
                  href="#datum"
                  className="rounded-full bg-white/15 px-7 py-4 font-extrabold text-white backdrop-blur hover:bg-white/20"
                >
                  Se datum
                </a>
              </div>
            </div>
          </div>
        </section>

        <section className="relative z-10 mx-auto -mt-14 grid max-w-7xl gap-4 px-5 md:grid-cols-4 md:px-8">
          <InfoCard label="Destination" value={trip.destination || "Kommer snart"} />
          <InfoCard label="Nästa datum" value={`${short.day} ${short.month}`} />
          <InfoCard label="Pris från" value={money(nextDate?.price || trip.price_from)} />
          <InfoCard label="Platser kvar" value={`${nextDate?.seats_left ?? "—"}`} />
        </section>

        <main className="mx-auto grid max-w-7xl gap-8 px-5 py-10 md:px-8 lg:grid-cols-[1fr_430px]">
          <div className="space-y-7">
            <section className="rounded-[32px] bg-white p-7 shadow-[0_18px_45px_rgba(15,23,42,.08)] md:p-9">
              <div className="mb-5 flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#eafaf7] text-xl">
                  🚌
                </span>
                <h2 className="text-3xl font-black tracking-[-0.03em] text-[#194C66]">
                  Om resan
                </h2>
              </div>

              <div className="whitespace-pre-line text-base leading-8 text-gray-600">
                {trip.description ||
                  trip.short_description ||
                  "Beskrivning kommer snart."}
              </div>
            </section>

            <section
              id="datum"
              className="rounded-[32px] bg-white p-7 shadow-[0_18px_45px_rgba(15,23,42,.08)] md:p-9"
            >
              <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="text-3xl font-black tracking-[-0.03em] text-[#194C66]">
                    Välj datum
                  </h2>
                  <p className="mt-2 text-sm text-gray-500">
                    Välj den avgång du vill boka. Priset och platserna
                    uppdateras direkt.
                  </p>
                </div>
              </div>

              {sortedDepartures.length === 0 ? (
                <p className="text-sm text-gray-500">
                  Inga bokningsbara avgångar finns just nu.
                </p>
              ) : (
                <div className="grid gap-4">
                  {sortedDepartures.map((dep) => {
                    const active = dep.id === selectedDepartureId;
                    const d = fmtShortDate(dep.departure_date);

                    return (
                      <button
                        key={dep.id}
                        onClick={() => setSelectedDepartureId(dep.id)}
                        className={`grid gap-4 rounded-[26px] border p-5 text-left transition md:grid-cols-[78px_1fr_auto] md:items-center ${
                          active
                            ? "border-[#007764] bg-[#eafaf7] shadow-[0_14px_35px_rgba(0,119,100,.12)]"
                            : "border-gray-200 bg-white hover:border-[#007764] hover:shadow-[0_12px_30px_rgba(15,23,42,.08)]"
                        }`}
                      >
                        <div
                          className={`flex h-[70px] w-[70px] flex-col items-center justify-center rounded-2xl font-black ${
                            active
                              ? "bg-[#007764] text-white"
                              : "bg-[#fce7e7] text-[#A61E22]"
                          }`}
                        >
                          <span className="text-2xl leading-none">{d.day}</span>
                          <span className="mt-1 text-xs uppercase">
                            {d.month}
                          </span>
                        </div>

                        <div>
                          <div className="text-lg font-black text-[#0f172a]">
                            {fmtDate(dep.departure_date)}
                          </div>

                          <div className="mt-1 text-sm text-gray-600">
                            Avgång {fmtTime(dep.departure_time)}
                            {dep.return_time
                              ? ` · Retur ${fmtTime(dep.return_time)}`
                              : ""}
                          </div>

                          <div className="mt-2 text-sm text-gray-500">
                            {dep.departure_location || "Påstigning meddelas"} →{" "}
                            {dep.destination_location ||
                              trip.destination ||
                              "Destination"}
                          </div>
                        </div>

                        <div className="text-left md:text-right">
                          <div className="text-2xl font-black text-[#194C66]">
                            {money(dep.price || trip.price_from)}
                          </div>
                          <div className="mt-1 text-xs font-bold text-gray-500">
                            {dep.seats_left ?? 0} platser kvar
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>

            {selectedDeparture?.has_seat_map && (
              <section className="rounded-[32px] bg-white p-7 shadow-[0_18px_45px_rgba(15,23,42,.08)] md:p-9">
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

            <section className="grid gap-4 md:grid-cols-3">
              <MiniCard
                icon="✓"
                title="Trygg bokning"
                text="Tydlig bekräftelse och säker betalning."
              />
              <MiniCard
                icon="🚌"
                title="Bekväm resa"
                text="Planerad resa med fokus på trygghet."
              />
              <MiniCard
                icon="📩"
                title="Biljett digitalt"
                text="Du får din bokning och information digitalt."
              />
            </section>
          </div>

          <aside
            id="boka"
            className="h-fit rounded-[32px] bg-white p-7 shadow-[0_20px_55px_rgba(15,23,42,.12)] lg:sticky lg:top-8"
          >
            <div className="mb-5">
              <div className="text-sm font-bold uppercase tracking-wide text-gray-500">
                Boka resa
              </div>
              <h2 className="mt-1 text-3xl font-black tracking-[-0.04em] text-[#194C66]">
                {money(total)}
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Totalt för {qty} resenär{qty > 1 ? "er" : ""}
              </p>
            </div>

            <div className="rounded-3xl bg-[#f8fafc] p-5">
              <div className="text-xs font-bold uppercase tracking-wide text-gray-500">
                Valt datum
              </div>
              <div className="mt-1 font-black text-[#0f172a]">
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
              <label className="mb-2 block text-sm font-bold text-[#194C66]">
                Antal resenärer
              </label>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => updateQty(qty - 1)}
                  className="h-12 w-12 rounded-2xl border bg-white text-xl font-black"
                >
                  −
                </button>

                <input
                  type="number"
                  min={1}
                  max={selectedDeparture?.seats_left || 99}
                  value={qty}
                  onChange={(e) => updateQty(Number(e.target.value))}
                  className="h-12 min-w-0 flex-1 rounded-2xl border px-4 text-center font-black"
                />

                <button
                  type="button"
                  onClick={() => updateQty(qty + 1)}
                  className="h-12 w-12 rounded-2xl border bg-white text-xl font-black"
                >
                  +
                </button>
              </div>
            </div>

            {selectedSeats.length > 0 && (
              <div className="mt-5 rounded-3xl border border-[#b7e7df] bg-[#eafaf7] p-4 text-sm text-[#006b5b]">
                <div className="font-black">Valda säten</div>
                <div className="mt-1">{selectedSeats.join(", ")}</div>
              </div>
            )}

            <div className="mt-5 space-y-3">
              <input
                placeholder="Namn"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full rounded-2xl border px-4 py-3"
              />

              <input
                placeholder="E-post"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                className="w-full rounded-2xl border px-4 py-3"
              />

              <input
                placeholder="Telefon"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="w-full rounded-2xl border px-4 py-3"
              />
            </div>

            <div className="mt-6 space-y-2 border-t pt-5">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Resa</span>
                <span>{money(subtotal)}</span>
              </div>

              {seatExtraTotal > 0 && (
                <div className="flex justify-between text-sm text-[#194C66]">
                  <span>Sätesval</span>
                  <span>{money(seatExtraTotal)}</span>
                </div>
              )}

              <div className="flex justify-between text-xl font-black">
                <span>Totalt</span>
                <span>{money(total)}</span>
              </div>
            </div>

            <button
              onClick={createBooking}
              disabled={bookingLoading || !selectedDeparture}
              className="mt-6 w-full rounded-full bg-[#007764] px-5 py-4 text-base font-black text-white shadow-lg shadow-[#007764]/20 disabled:opacity-50"
            >
              {bookingLoading ? "Skapar bokning..." : "Fortsätt till betalning"}
            </button>

            <div className="mt-5 rounded-3xl bg-[#eafaf7] p-4 text-sm font-bold leading-6 text-[#006b5b]">
              Betalning sker tryggt via SumUp. Din bokning skapas först när
              betalningen startas.
            </div>
          </aside>
        </main>
      </div>
    </>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[26px] bg-white p-5 shadow-[0_16px_40px_rgba(15,23,42,.12)]">
      <div className="text-xs font-bold uppercase tracking-wide text-gray-500">
        {label}
      </div>
      <div className="mt-2 text-xl font-black text-[#0f172a]">{value}</div>
    </div>
  );
}

function MiniCard({
  icon,
  title,
  text,
}: {
  icon: string;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-[28px] bg-white p-6 shadow-[0_14px_35px_rgba(15,23,42,.08)]">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eafaf7] text-xl">
        {icon}
      </div>
      <h3 className="text-lg font-black text-[#194C66]">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-gray-500">{text}</p>
    </div>
  );
}
