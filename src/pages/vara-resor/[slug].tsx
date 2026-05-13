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

type Step = 1 | 2 | 3 | 4 | 5;

function money(n?: number | null) {
  return `${Number(n || 0).toLocaleString("sv-SE", {
    maximumFractionDigits: 0,
  })}:-`;
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
  if (!date) return { day: "–", month: "Datum", weekday: "" };

  const d = new Date(`${date}T00:00:00`);
  return {
    day: new Intl.DateTimeFormat("sv-SE", { day: "numeric" }).format(d),
    month: new Intl.DateTimeFormat("sv-SE", { month: "short" }).format(d),
    weekday: new Intl.DateTimeFormat("sv-SE", { weekday: "short" }).format(d),
  };
}

function fmtTime(time?: string | null) {
  if (!time) return "Tid kommer";
  return String(time).slice(0, 5);
}

function monthTitle(date?: string | null) {
  if (!date) return "Kalender";
  return new Intl.DateTimeFormat("sv-SE", {
    month: "long",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00`));
}

function firstNameFromFullName(fullName: string) {
  return fullName.trim().split(" ")[0] || "";
}

function lastNameFromFullName(fullName: string) {
  const [, ...rest] = fullName.trim().split(" ");
  return rest.join(" ");
}

export default function TripPage() {
  const router = useRouter();
  const { slug } = router.query;

  const [step, setStep] = useState<Step>(1);
  const [trip, setTrip] = useState<Trip | null>(null);
  const [selectedDepartureId, setSelectedDepartureId] = useState("");
  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [error, setError] = useState("");

  const [qty, setQty] = useState(1);
  const [seatChoiceEnabled, setSeatChoiceEnabled] = useState(false);

  const [showTripInfo, setShowTripInfo] = useState(false);
  const [showMoreFacts, setShowMoreFacts] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);

  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerZip, setCustomerZip] = useState("");
  const [customerCity, setCustomerCity] = useState("");

  const [passengerNames, setPassengerNames] = useState<string[]>([""]);

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

  const calendarDays = useMemo(() => {
    const base =
      selectedDeparture?.departure_date || sortedDepartures[0]?.departure_date;

    if (!base) return [];

    const baseDate = new Date(`${base}T00:00:00`);
    const year = baseDate.getFullYear();
    const month = baseDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const departuresByDay = new Map<number, Departure>();

    sortedDepartures.forEach((dep) => {
      if (!dep.departure_date) return;

      const d = new Date(`${dep.departure_date}T00:00:00`);

      if (d.getFullYear() === year && d.getMonth() === month) {
        departuresByDay.set(d.getDate(), dep);
      }
    });

    return Array.from({ length: daysInMonth }).map((_, i) => {
      const day = i + 1;
      return {
        day,
        departure: departuresByDay.get(day) || null,
      };
    });
  }, [selectedDeparture?.departure_date, sortedDepartures]);

  useEffect(() => {
    if (!slug || typeof slug !== "string") return;
    loadTrip(slug);
  }, [slug]);

  useEffect(() => {
    const names = Array.from({ length: qty }).map(
      (_, index) => passengerNames[index] || ""
    );

    setPassengerNames(names);
    setSelectedSeats((prev) => prev.slice(0, qty));
  }, [qty]);

  useEffect(() => {
    if (
      !seatChoiceEnabled ||
      !selectedDeparture?.id ||
      !selectedDeparture.has_seat_map
    ) {
      setSeats([]);
      setSelectedSeats([]);
      return;
    }

    loadSeats(selectedDeparture.id);
  }, [seatChoiceEnabled, selectedDeparture?.id]);

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
  }

  function nextStep() {
    if (step === 1 && !selectedDeparture) {
      alert("Välj ett datum först.");
      return;
    }

    if (
      step === 3 &&
      seatChoiceEnabled &&
      selectedDeparture?.has_seat_map &&
      selectedSeats.length > 0 &&
      selectedSeats.length !== qty
    ) {
      alert(
        `Du har valt ${selectedSeats.length} säte(n), men antal resenärer är ${qty}.`
      );
      return;
    }

    if (step === 4) {
      if (!customerName || !customerEmail || !customerPhone) {
        alert("Fyll i namn, e-post och telefon.");
        return;
      }
    }

    setStep((prev) => Math.min(5, prev + 1) as Step);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function previousStep() {
    setStep((prev) => Math.max(1, prev - 1) as Step);
    window.scrollTo({ top: 0, behavior: "smooth" });
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
        setStep(4);
        return;
      }

      if (
        seatChoiceEnabled &&
        seats.length > 0 &&
        selectedSeats.length > 0 &&
        selectedSeats.length !== qty
      ) {
        alert(
          `Du har valt ${selectedSeats.length} säte(n), men antal resenärer är ${qty}.`
        );
        setStep(3);
        return;
      }

      setBookingLoading(true);

      const passengers = Array.from({ length: qty }).map((_, index) => {
        const passengerName =
          passengerNames[index] || (index === 0 ? customerName : "");

        const seatNumber = selectedSeats[index] || null;
        const seat = seats.find((s) => s.seat_number === seatNumber);

        return {
          first_name: firstNameFromFullName(passengerName),
          last_name: lastNameFromFullName(passengerName),
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
          customer_address: [customerAddress, customerZip, customerCity]
            .filter(Boolean)
            .join(", "),
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
      <div className="min-h-screen bg-white p-8 text-[#006f7f]">
        Laddar resa...
      </div>
    );
  }

  if (error || !trip) {
    return (
      <div className="min-h-screen bg-white p-8 text-red-700">
        {error || "Resan hittades inte."}
      </div>
    );
  }

  const firstDeparture = selectedDeparture || sortedDepartures[0];

  return (
    <>
      <Head>
        <title>{trip.seo_title || trip.title}</title>
        <meta
          name="description"
          content={trip.seo_description || trip.short_description || ""}
        />
      </Head>

      <div className="min-h-screen bg-white text-[#111827]">
        <main className="mx-auto max-w-[1180px] px-4 py-8">
          <Stepper step={step} />

          {step === 1 && (
            <section>
              <h1 className="mb-7 text-4xl font-black tracking-[-0.04em] text-[#1f2937]">
                Välj resa
              </h1>

              <div className="rounded-[22px] border border-gray-200 bg-white p-6 shadow-[0_12px_35px_rgba(15,23,42,.07)]">
                <div className="grid gap-8 lg:grid-cols-[300px_1fr]">
                  <div>
                    <div className="mb-4 inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-[#00866f]">
                      📍 {trip.destination || trip.location || "Destination"}
                    </div>

                    <h2 className="text-3xl font-black tracking-[-0.04em] text-[#111827]">
                      {trip.title}
                    </h2>

                    <div className="mt-4 inline-flex rounded-xl bg-[#00866f] px-5 py-2 text-sm font-black text-white shadow">
                      {trip.category || "Helsingbuss Resor"}
                    </div>

                    <p className="mt-6 text-base leading-8 text-gray-700">
                      {trip.short_description ||
                        "Följ med Helsingbuss på en bekväm resa med tydlig information och trygg bokning från start till mål."}
                    </p>

                    <button
                      type="button"
                      onClick={() => setShowTripInfo((prev) => !prev)}
                      className="mt-5 flex items-center gap-2 text-sm font-black text-[#00866f]"
                    >
                      Läs mer om resan
                      <span>{showTripInfo ? "⌃" : "⌄"}</span>
                    </button>

                    <div className="mt-6 rounded-[22px] bg-[#e2f7f1] p-6">
                      <h3 className="mb-5 text-2xl font-black text-[#5d6670]">
                        Fakta
                      </h3>

                      <FactRow label="Kategori" value={trip.category || "Resa"} />
                      <FactRow
                        label="Destination"
                        value={trip.destination || "Ej angivet"}
                      />
                      <FactRow label="Land" value={trip.country || "Sverige"} />
                      <FactRow
                        label="Avgångar"
                        value={`${sortedDepartures.length}`}
                      />
                      <FactRow label="Pris från" value={money(trip.price_from)} />

                      <button
                        type="button"
                        onClick={() => setShowMoreFacts((prev) => !prev)}
                        className="mt-6 rounded-full bg-[#00866f] px-7 py-3 text-sm font-black text-white shadow"
                      >
                        Mer fakta {showMoreFacts ? "⌃" : "⌄"}
                      </button>
                    </div>
                  </div>

                  <div>
                    <div className="grid gap-4 lg:grid-cols-[1fr_210px]">
                      <button
                        type="button"
                        onClick={() => setGalleryOpen(true)}
                        className="h-[430px] overflow-hidden rounded-xl bg-gray-100"
                      >
                        {trip.image_url ? (
                          <img
                            src={trip.image_url}
                            alt={trip.title}
                            className="h-full w-full object-cover transition duration-500 hover:scale-[1.03]"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-gray-400">
                            Bild saknas
                          </div>
                        )}
                      </button>

                      <div className="grid gap-4">
                        <button
                          type="button"
                          onClick={() => setGalleryOpen(true)}
                          className="overflow-hidden rounded-xl bg-gray-100"
                        >
                          {trip.image_url && (
                            <img
                              src={trip.image_url}
                              alt=""
                              className="h-full w-full object-cover transition duration-500 hover:scale-[1.04]"
                            />
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => setGalleryOpen(true)}
                          className="relative overflow-hidden rounded-xl bg-gray-100"
                        >
                          {trip.image_url && (
                            <img
                              src={trip.image_url}
                              alt=""
                              className="h-full w-full object-cover transition duration-500 hover:scale-[1.04]"
                            />
                          )}

                          <div className="absolute bottom-4 right-4 rounded-xl bg-[#1f2937] px-5 py-3 text-sm font-black text-white shadow">
                            🖼 Fler bilder
                          </div>
                        </button>
                      </div>
                    </div>

                    {trip.campaign_text && (
                      <div className="ml-auto mt-5 max-w-[380px] rounded-2xl bg-white p-5 text-sm italic text-gray-700 shadow-[0_12px_30px_rgba(15,23,42,.12)]">
                        “{trip.campaign_text}”
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {showTripInfo && (
                <InfoAccordion
                  icon="🚌"
                  title="Om resan"
                  text={
                    trip.description ||
                    trip.short_description ||
                    "Här visas mer information om resans upplägg, tider, komfort och vad som är bra att veta inför avresa."
                  }
                />
              )}

              {showMoreFacts && (
                <InfoAccordion
                  icon="ℹ️"
                  title="Mer fakta"
                  text={`Destination: ${trip.destination || "Ej angivet"}\nKategori: ${
                    trip.category || "Resa"
                  }\nLand: ${trip.country || "Sverige"}\nAntal avgångar: ${
                    sortedDepartures.length
                  }\nPris från: ${money(trip.price_from)}`}
                />
              )}

              <div className="mt-8 flex flex-wrap items-center justify-between gap-5">
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#e2f7f1] text-2xl">
                    🌍
                  </div>
                  <div>
                    <div className="font-bold text-[#1f2937]">
                      Res tryggt med Helsingbuss
                    </div>
                    <div>Smidig bokning från start till mål</div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={nextStep}
                  className="rounded-full bg-[#00866f] px-12 py-4 text-base font-black text-white shadow-[0_12px_28px_rgba(0,134,111,.25)] transition hover:translate-y-[-2px]"
                >
                  Nästa steg →
                </button>
              </div>

              {galleryOpen && (
                <ImageGalleryModal
                  title={trip.title}
                  imageUrl={trip.image_url}
                  onClose={() => setGalleryOpen(false)}
                />
              )}
            </section>
          )}

          {step === 2 && (
            <section>
              <h1 className="mb-2 text-3xl font-bold text-[#5d6670]">
                Priskalender
              </h1>

              <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="mb-5 flex items-center justify-between text-[#00879a]">
                  <span className="text-2xl">«</span>
                  <h2 className="text-2xl font-semibold text-[#111827]">
                    {monthTitle(firstDeparture?.departure_date)}
                  </h2>
                  <span className="text-2xl">»</span>
                </div>

                <div className="grid grid-cols-7 gap-3 text-center">
                  {["Mån", "Tis", "Ons", "Tor", "Fre", "Lör", "Sön"].map(
                    (day) => (
                      <div
                        key={day}
                        className="pb-2 text-lg font-semibold text-[#111827]"
                      >
                        {day}
                      </div>
                    )
                  )}

                  {calendarDays.map(({ day, departure }) => {
                    const active = departure?.id === selectedDepartureId;
                    const available = Boolean(departure);

                    return (
                      <button
                        key={day}
                        type="button"
                        disabled={!available}
                        onClick={() => {
                          if (!departure) return;
                          setSelectedDepartureId(departure.id);
                        }}
                        className={`relative min-h-[116px] rounded-xl border p-3 text-center transition ${
                          active
                            ? "border-[#008aa0] bg-[#e4fbff] shadow"
                            : available
                            ? "border-gray-300 bg-white hover:border-[#008aa0]"
                            : "border-gray-200 bg-gray-100 text-gray-400"
                        }`}
                      >
                        {active && (
                          <span className="absolute -right-1 -top-1 rounded bg-[#d83b4a] px-3 py-1 text-xs font-bold text-white">
                            Vald
                          </span>
                        )}

                        <div className="text-xl">{day}</div>

                        {available ? (
                          <>
                            <div className="mt-3 text-xs text-gray-500">fr.</div>
                            <div className="text-lg font-semibold text-[#d83b4a]">
                              {money(departure?.price || trip.price_from)}
                            </div>
                            <div className="mt-1 text-xs text-[#00879a]">
                              {active
                                ? "Vald ✓"
                                : `${departure?.seats_left ?? 0} platser`}
                            </div>
                          </>
                        ) : (
                          <div className="mt-8 text-xs">Ej tillgänglig</div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <TravelOverview
                trip={trip}
                departure={selectedDeparture}
                qty={qty}
                total={total}
              />

              <NavigationButtons
                step={step}
                onPrevious={previousStep}
                onNext={nextStep}
                nextLabel="Nästa steg"
              />
            </section>
          )}

          {step === 3 && (
            <section>
              <h1 className="mb-4 text-3xl font-bold text-[#5d6670]">Tillval</h1>

              <div className="grid gap-5 md:grid-cols-3">
                <AddonCard
                  icon="+"
                  title="Välj sittplats"
                  text="Välj var i bussen du vill sitta. Platskartan visas när du aktiverar tillvalet."
                  active={seatChoiceEnabled}
                  buttonLabel={seatChoiceEnabled ? "Sätesval valt" : "Välj säte"}
                  onClick={() => setSeatChoiceEnabled((prev) => !prev)}
                />

                <AddonCard
                  icon="☕"
                  title="Tilltugg ombord"
                  text="Möjlighet att lägga till enklare tilltugg längre fram."
                  buttonLabel="Kommer snart"
                  disabled
                />

                <AddonCard
                  icon="🛡"
                  title="Avbeställningsskydd"
                  text="Tillval för tryggare bokning kan läggas till i nästa version."
                  buttonLabel="Kommer snart"
                  disabled
                />
              </div>

              {seatChoiceEnabled && (
                <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                  <h2 className="text-2xl font-bold text-[#5d6670]">
                    Välj plats i bussen
                  </h2>
                  <p className="mt-1 text-sm text-gray-600">
                    Du kan välja upp till {qty} plats(er). Om du inte väljer plats
                    placerar vi dig automatiskt.
                  </p>

                  {!selectedDeparture?.has_seat_map ? (
                    <p className="mt-5 rounded-lg bg-gray-100 p-4 text-gray-600">
                      Det finns ingen platskarta kopplad till denna avgång ännu.
                    </p>
                  ) : seatLoading ? (
                    <p className="mt-5 text-sm text-gray-500">
                      Laddar platskarta...
                    </p>
                  ) : seats.length === 0 ? (
                    <p className="mt-5 text-sm text-gray-500">
                      Platskarta saknas för denna avgång.
                    </p>
                  ) : (
                    <div className="mt-5">
                      <SeatMap
                        seats={seats}
                        selectedSeats={selectedSeats}
                        maxSelectable={qty}
                        showLegend
                        showSummary
                        title="Platskarta"
                        subtitle="Välj de säten du vill boka."
                        onSeatClick={toggleSeat}
                      />
                    </div>
                  )}
                </div>
              )}

              <TravelOverview
                trip={trip}
                departure={selectedDeparture}
                qty={qty}
                total={total}
              />

              <NavigationButtons
                step={step}
                onPrevious={previousStep}
                onNext={nextStep}
                nextLabel="Nästa steg"
              />
            </section>
          )}

          {step === 4 && (
            <section>
              <h1 className="mb-8 text-center text-3xl font-bold text-[#5d6670]">
                Personuppgifter
              </h1>

              <TravelOverview
                trip={trip}
                departure={selectedDeparture}
                qty={qty}
                total={total}
              />

              <div className="mt-8 rounded-xl border border-gray-200 bg-[#f7f7f7] p-6">
                <div className="mb-5 inline-flex rounded bg-[#5d6670] px-3 py-1 text-sm font-bold text-white">
                  Personuppgifter
                </div>

                <div className="grid gap-5">
                  <FormRow label="E-post *">
                    <input
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      className="hb-input"
                    />
                  </FormRow>

                  <FormRow label="Mobiltelefon *">
                    <input
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="hb-input"
                    />
                  </FormRow>

                  <FormRow label="Namn *">
                    <input
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="hb-input"
                    />
                  </FormRow>

                  <FormRow label="Adress">
                    <input
                      value={customerAddress}
                      onChange={(e) => setCustomerAddress(e.target.value)}
                      className="hb-input"
                    />
                  </FormRow>

                  <FormRow label="Postnummer">
                    <input
                      value={customerZip}
                      onChange={(e) => setCustomerZip(e.target.value)}
                      className="hb-input"
                    />
                  </FormRow>

                  <FormRow label="Stad">
                    <input
                      value={customerCity}
                      onChange={(e) => setCustomerCity(e.target.value)}
                      className="hb-input"
                    />
                  </FormRow>
                </div>
              </div>

              <div className="mt-8 rounded-xl border border-gray-200 bg-[#f7f7f7] p-6">
                <h2 className="mb-4 text-xl font-bold text-[#5d6670]">
                  Resenärer
                </h2>

                <div className="space-y-4">
                  {Array.from({ length: qty }).map((_, index) => (
                    <div
                      key={index}
                      className="grid gap-3 rounded-lg bg-white p-4 md:grid-cols-[120px_1fr]"
                    >
                      <div className="font-bold text-gray-700">
                        Resenär {index + 1}
                      </div>
                      <input
                        value={passengerNames[index] || ""}
                        onChange={(e) => {
                          const next = [...passengerNames];
                          next[index] = e.target.value;
                          setPassengerNames(next);
                        }}
                        placeholder="För- och efternamn"
                        className="hb-input"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-8 rounded-xl border border-gray-200 bg-[#f7f7f7] p-6">
                <h2 className="mb-3 text-lg font-bold text-[#5d6670]">
                  Bekräftelse
                </h2>
                <label className="flex gap-3 text-sm text-gray-700">
                  <input type="checkbox" className="mt-1" />
                  Jag bekräftar att uppgifterna stämmer och att jag vill fortsätta
                  till betalning.
                </label>
              </div>

              <NavigationButtons
                step={step}
                onPrevious={previousStep}
                onNext={nextStep}
                nextLabel="Nästa steg"
              />
            </section>
          )}

          {step === 5 && (
            <section>
              <div className="mx-auto max-w-[900px]">
                <div className="mb-6 bg-gradient-to-r from-[#41a5ff] to-[#76c7ff] px-8 py-8 text-center text-white">
                  <div className="text-lg">Bokningsöversikt</div>
                  <div className="mt-2 text-2xl font-bold">{trip.title}</div>
                </div>

                <h1 className="mb-3 text-3xl font-bold text-[#111827]">
                  Kontrollera och betala
                </h1>

                <p className="mb-6 text-gray-700">
                  Kontrollera att uppgifterna stämmer. När du går vidare skapas
                  bokningen och du skickas till säker betalning.
                </p>

                <TravelOverview
                  trip={trip}
                  departure={selectedDeparture}
                  qty={qty}
                  total={total}
                  selectedSeats={selectedSeats}
                />

                <div className="mt-8 rounded-xl border border-gray-200 bg-white p-6">
                  <h2 className="mb-4 text-xl font-bold text-[#5d6670]">
                    Betalningsmetod
                  </h2>

                  <div className="grid gap-6 md:grid-cols-[1fr_320px]">
                    <div className="space-y-3">
                      <PaymentOption label="Kortbetalning" checked />
                      <PaymentOption label="Swish / annan betalning via SumUp" />
                    </div>

                    <div className="rounded-xl bg-[#f7fdff] p-6 text-center">
                      <div className="text-sm text-gray-600">
                        Betalningsbelopp
                      </div>
                      <div className="mt-2 text-3xl font-bold text-[#00866f]">
                        {money(total)}
                      </div>

                      <button
                        onClick={createBooking}
                        disabled={bookingLoading}
                        className="mt-6 w-full rounded-full bg-[#00866f] px-6 py-3 font-bold text-white disabled:opacity-50"
                      >
                        {bookingLoading ? "Skapar bokning..." : "Betala"}
                      </button>
                    </div>
                  </div>
                </div>

                <NavigationButtons
                  step={step}
                  onPrevious={previousStep}
                  onNext={createBooking}
                  nextLabel={bookingLoading ? "Skapar bokning..." : "Betala"}
                  hideNext
                />
              </div>
            </section>
          )}
        </main>

        <style jsx global>{`
          .hb-input {
            width: 100%;
            border: 1px solid #d1d5db;
            background: white;
            min-height: 42px;
            border-radius: 4px;
            padding: 8px 12px;
            outline: none;
          }

          .hb-input:focus {
            border-color: #00879a;
            box-shadow: 0 0 0 3px rgba(0, 135, 154, 0.12);
          }
        `}</style>
      </div>
    </>
  );
}

function Stepper({ step }: { step: Step }) {
  const steps = [
    "Välj resa",
    "Resealternativ",
    "Tillval",
    "Personuppgifter",
    "Bekräftelse",
  ];

  return (
    <div className="mb-10 hidden items-center justify-center gap-2 md:flex">
      {steps.map((label, index) => {
        const nr = index + 1;
        const active = step === nr;
        const done = step > nr;

        return (
          <div key={label} className="flex items-center">
            <div className="flex items-center gap-2">
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full border text-xs ${
                  active || done
                    ? "border-[#0094aa] bg-[#0094aa] text-white"
                    : "border-gray-300 bg-white text-gray-500"
                }`}
              >
                {nr}
              </span>
              <span
                className={active ? "font-bold text-[#5d6670]" : "text-gray-500"}
              >
                {label}
              </span>
            </div>

            {index < steps.length - 1 && (
              <div className="mx-4 h-px w-36 bg-gray-300" />
            )}
          </div>
        );
      })}
    </div>
  );
}

function NavigationButtons({
  step,
  onPrevious,
  onNext,
  nextLabel,
  hideNext = false,
}: {
  step: Step;
  onPrevious: () => void;
  onNext: () => void;
  nextLabel: string;
  hideNext?: boolean;
}) {
  return (
    <div className="mt-10 flex items-center justify-between">
      <button
        type="button"
        onClick={onPrevious}
        disabled={step === 1}
        className="rounded-full bg-[#4f7180] px-10 py-4 font-bold text-white shadow disabled:opacity-0"
      >
        Föregående steg
      </button>

      {!hideNext && (
        <button
          type="button"
          onClick={onNext}
          className="rounded-full bg-[#00866f] px-12 py-4 font-bold text-white shadow"
        >
          {nextLabel}
        </button>
      )}
    </div>
  );
}

function TravelOverview({
  trip,
  departure,
  qty,
  total,
  selectedSeats = [],
}: {
  trip: Trip;
  departure: Departure | null;
  qty: number;
  total: number;
  selectedSeats?: string[];
}) {
  return (
    <div className="mt-8">
      <h2 className="mb-5 text-3xl font-bold text-[#5d6670]">
        Din resa - översikt
      </h2>

      <div className="grid gap-8 md:grid-cols-3">
        <div>
          <h3 className="border-b pb-3 text-xl text-[#5d6670]">Resa</h3>
          {trip.image_url && (
            <img
              src={trip.image_url}
              alt={trip.title}
              className="mt-4 h-44 w-full object-cover"
            />
          )}
          <div className="mt-4 font-bold">{trip.title}</div>
          <InfoLine label="Kategori" value={trip.category || "Resa"} />
          <InfoLine label="Resenärer" value={`${qty}`} />
          {selectedSeats.length > 0 && (
            <InfoLine label="Säten" value={selectedSeats.join(", ")} />
          )}
        </div>

        <div>
          <h3 className="border-b pb-3 text-xl text-[#5d6670]">Avgång</h3>
          <div className="mt-4">
            <InfoLine
              label="Datum"
              value={departure ? fmtDate(departure.departure_date) : "Ej valt"}
            />
            <InfoLine
              label="Avresa"
              value={departure ? fmtTime(departure.departure_time) : "Ej valt"}
            />
            <InfoLine
              label="Retur"
              value={
                departure?.return_time ? fmtTime(departure.return_time) : "Ej angivet"
              }
            />
            <InfoLine
              label="Från"
              value={departure?.departure_location || "Meddelas"}
            />
            <InfoLine
              label="Till"
              value={
                departure?.destination_location ||
                trip.destination ||
                "Destination"
              }
            />
          </div>
        </div>

        <div>
          <h3 className="border-b pb-3 text-xl text-[#5d6670]">Pris</h3>
          <div className="mt-4 flex justify-between">
            <span>Totalpris:</span>
            <span className="text-3xl font-bold text-[#d83b4a]">
              {money(total)}
            </span>
          </div>
          <p className="mt-5 text-gray-600">
            Priset kan ändras fram tills att resan är bokad.
          </p>
        </div>
      </div>
    </div>
  );
}

function FactRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[1fr_auto] gap-4 py-1 text-sm">
      <span className="font-medium text-[#111827]">{label}</span>
      <span>{value}</span>
    </div>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[110px_1fr] gap-3 py-1">
      <span className="font-bold">{label}:</span>
      <span>{value}</span>
    </div>
  );
}

function AddonCard({
  icon,
  title,
  text,
  buttonLabel,
  active = false,
  disabled = false,
  onClick,
}: {
  icon: string;
  title: string;
  text: string;
  buttonLabel: string;
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <div
      className={`rounded-xl p-7 text-center shadow ${
        active ? "bg-[#e4fbff]" : "bg-[#4b4f52] text-white"
      }`}
    >
      <div
        className={`mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full border-4 text-3xl ${
          active
            ? "border-[#00879a] text-[#00879a]"
            : "border-[#a7e8ef] text-[#a7e8ef]"
        }`}
      >
        {icon}
      </div>
      <h3 className="text-xl font-bold">{title}</h3>
      <p
        className={`mt-4 min-h-[90px] text-sm leading-6 ${
          active ? "text-gray-700" : "text-white/85"
        }`}
      >
        {text}
      </p>
      <button
        type="button"
        disabled={disabled}
        onClick={onClick}
        className={`mt-5 rounded-full px-6 py-2 text-sm font-bold ${
          active
            ? "bg-[#00866f] text-white"
            : disabled
            ? "bg-gray-500 text-white/60"
            : "bg-[#00866f] text-white"
        }`}
      >
        {buttonLabel}
      </button>
    </div>
  );
}

function FormRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-[180px_1fr] md:items-center">
      <label className="font-medium text-gray-700">{label}</label>
      {children}
    </div>
  );
}

function PaymentOption({
  label,
  checked = false,
}: {
  label: string;
  checked?: boolean;
}) {
  return (
    <label className="flex items-center gap-3 border-b py-3 text-sm">
      <input type="radio" name="payment" defaultChecked={checked} />
      {label}
    </label>
  );
}

function InfoAccordion({
  icon,
  title,
  text,
}: {
  icon: string;
  title: string;
  text: string;
}) {
  return (
    <div className="mt-8 rounded-[22px] border border-gray-200 bg-white p-7 shadow-[0_10px_30px_rgba(15,23,42,.06)]">
      <div className="flex gap-5">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#e2f7f1] text-2xl">
          {icon}
        </div>

        <div>
          <h3 className="text-2xl font-black text-[#1f2937]">{title}</h3>
          <div className="mt-3 whitespace-pre-line text-base leading-8 text-gray-600">
            {text}
          </div>
        </div>
      </div>
    </div>
  );
}

function ImageGalleryModal({
  title,
  imageUrl,
  onClose,
}: {
  title: string;
  imageUrl?: string | null;
  onClose: () => void;
}) {
  if (!imageUrl) return null;

  return (
    <div className="fixed inset-0 z-[99999] bg-[#111827]/90 p-6">
      <button
        type="button"
        onClick={onClose}
        className="absolute right-8 top-8 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white text-2xl font-black text-[#111827]"
      >
        ×
      </button>

      <div className="mx-auto flex h-full max-w-6xl flex-col justify-center">
        <div className="overflow-hidden rounded-2xl bg-black shadow-2xl">
          <img
            src={imageUrl}
            alt={title}
            className="max-h-[72vh] w-full object-contain"
          />
        </div>

        <div className="mt-5 grid grid-cols-5 gap-3">
          {[1, 2, 3, 4, 5].map((item) => (
            <button
              key={item}
              type="button"
              className="h-24 overflow-hidden rounded-xl border-4 border-[#00a896] bg-white"
            >
              <img src={imageUrl} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
