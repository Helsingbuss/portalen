import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import Image from "next/image";

type Departure = {
  id: string;
  trip_id: string;
  departure_date: string | null;
  departure_time: string | null;
  return_date: string | null;
  return_time: string | null;
  price: number | null;
  capacity: number | null;
  booked_count: number | null;
  status: string | null;
  sundra_trips?: Trip | null;
};

type Trip = {
  id: string;
  title: string;
  slug: string;
  destination?: string | null;
  country?: string | null;
  image_url?: string | null;
  short_description?: string | null;
  trip_type?: string | null;
  duration_days?: number | null;
  duration_nights?: number | null;
  enable_rooms?: boolean | null;
  enable_options?: boolean | null;
  currency?: string | null;
  booking_intro?: string | null;
  overview_text?: string | null;
};

type Passenger = {
  first_name: string;
  last_name: string;
  passenger_type: string;
  date_of_birth: string;
  special_requests: string;
};

function money(value?: number | null, currency = "SEK") {
  if (value == null) return "—";

  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function fmtDate(date?: string | null) {
  if (!date) return "—";

  try {
    return new Intl.DateTimeFormat("sv-SE", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date(`${date}T00:00:00`));
  } catch {
    return date;
  }
}

function fmtTime(time?: string | null) {
  if (!time) return "—";
  return String(time).slice(0, 5);
}

function seatsLeft(dep?: Departure | null) {
  if (!dep) return 0;
  return Math.max(0, Number(dep.capacity || 0) - Number(dep.booked_count || 0));
}

function emptyPassenger(): Passenger {
  return {
    first_name: "",
    last_name: "",
    passenger_type: "adult",
    date_of_birth: "",
    special_requests: "",
  };
}

export default function SundraBookingPage() {
  const router = useRouter();
  const { departureId } = router.query;

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  const [departure, setDeparture] = useState<Departure | null>(null);
  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [passengersCount, setPassengersCount] = useState(1);
  const [passengers, setPassengers] = useState<Passenger[]>([emptyPassenger()]);

  const [customer, setCustomer] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    address: "",
    postal_code: "",
    city: "",
    country: "Sverige",
    notes: "",
    discount_code: "",
    accept_terms: false,
    accept_marketing: false,
  });

  useEffect(() => {
    if (!departureId || typeof departureId !== "string") return;
    loadDeparture(departureId);
  }, [departureId]);

  async function loadDeparture(id: string) {
    try {
      setLoading(true);
      setError("");

      const res = await fetch(`/api/public/sundra/departures/${id}`);
      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Kunde inte hämta avgången.");
      }

      setDeparture(json.departure);
    } catch (e: any) {
      setError(e?.message || "Något gick fel.");
    } finally {
      setLoading(false);
    }
  }

  function updateCustomer(key: string, value: any) {
    setCustomer((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  function setCount(nextCount: number) {
    const safe = Math.max(1, Math.min(50, Number(nextCount || 1)));
    setPassengersCount(safe);

    setPassengers((prev) => {
      const copy = [...prev];

      while (copy.length < safe) copy.push(emptyPassenger());
      while (copy.length > safe) copy.pop();

      return copy;
    });
  }

  function updatePassenger(index: number, key: keyof Passenger, value: any) {
    setPassengers((prev) => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        [key]: value,
      };
      return copy;
    });
  }

  const trip = departure?.sundra_trips || null;
  const currency = trip?.currency || "SEK";
  const unitPrice = Number(departure?.price || 0);
  const subtotal = unitPrice * passengersCount;
  const total = subtotal;

  const left = seatsLeft(departure);

  const canGoStep2 = Boolean(departure && passengersCount > 0);
  const canGoStep3 = passengers.every(
    (p) => p.first_name.trim() && p.last_name.trim()
  );

  const canSubmit =
    customer.first_name.trim() &&
    customer.last_name.trim() &&
    customer.email.trim() &&
    customer.phone.trim() &&
    customer.accept_terms;

  async function createBooking() {
    if (!departure || !trip) return;

    if (!canSubmit) {
      setError("Fyll i obligatoriska uppgifter och godkänn villkoren.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const payload = {
        trip_id: trip.id,
        departure_id: departure.id,

        passengers_count: passengersCount,
        passengers,

        customer_name: `${customer.first_name} ${customer.last_name}`.trim(),
        customer_email: customer.email,
        customer_phone: customer.phone,
        customer_address: [
          customer.address,
          customer.postal_code,
          customer.city,
          customer.country,
        ]
          .filter(Boolean)
          .join(", "),

        notes: customer.notes,
        discount_code: customer.discount_code,

        subtotal,
        total_amount: total,
        currency,
      };

      const res = await fetch("/api/public/sundra/bookings/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Kunde inte skapa bokningen.");
      }

      if (json.checkout_url) {
        window.location.href = json.checkout_url;
        return;
      }

      if (json.sumup_checkout_url) {
        window.location.href = json.sumup_checkout_url;
        return;
      }

      if (json.payment_url) {
        window.location.href = json.payment_url;
        return;
      }

      router.push(`/boka/bekraftelse/${json.booking?.id || json.booking_id}`);
    } catch (e: any) {
      setError(e?.message || "Något gick fel vid bokningen.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f4f0] p-8">
        <div className="mx-auto max-w-6xl rounded-3xl bg-white p-6 shadow">
          Laddar bokning...
        </div>
      </div>
    );
  }

  if (!departure || !trip) {
    return (
      <div className="min-h-screen bg-[#f5f4f0] p-8">
        <div className="mx-auto max-w-6xl rounded-3xl bg-white p-6 shadow">
          Avgången hittades inte.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f4f0] text-[#0f172a]">
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Stepper step={step} />

        {error && (
          <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <section className="mb-7 overflow-hidden rounded-3xl bg-white shadow">
          <div className="grid lg:grid-cols-[320px_1fr_280px]">
            <div className="relative h-56 bg-[#194C66] lg:h-full">
              {trip.image_url ? (
                <Image
                  src={trip.image_url}
                  alt={trip.title}
                  fill
                  className="object-cover"
                  priority
                />
              ) : null}
            </div>

            <div className="p-6">
              <div className="text-sm font-semibold uppercase tracking-wide text-[#194C66]/70">
                Din resa
              </div>

              <h1 className="mt-1 text-3xl font-bold">{trip.title}</h1>

              <p className="mt-3 text-sm leading-relaxed text-gray-600">
                {trip.booking_intro ||
                  trip.short_description ||
                  "Kontrollera datum, antal resenärer och gå vidare till bokning."}
              </p>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <Info label="Datum" value={fmtDate(departure.departure_date)} />
                <Info label="Avresa" value={fmtTime(departure.departure_time)} />
                <Info label="Retur" value={fmtDate(departure.return_date)} />
                <Info label="Platser kvar" value={`${left} platser`} />
              </div>
            </div>

            <div className="bg-[#eef5f9] p-6">
              <div className="text-sm text-[#194C66]/70">Pris per person</div>
              <div className="mt-1 text-3xl font-bold text-[#194C66]">
                {money(unitPrice, currency)}
              </div>

              <div className="mt-6 space-y-3 text-sm">
                <Summary label="Resenärer" value={`${passengersCount} st`} />
                <Summary label="Totalt" value={money(total, currency)} />
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-7 lg:grid-cols-[1fr_360px]">
          <section className="space-y-6">
            {step === 1 && (
              <Card title="1. Välj resa">
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Antal resenärer">
                    <select
                      value={passengersCount}
                      onChange={(e) => setCount(Number(e.target.value))}
                      className="w-full rounded-xl border px-3 py-3"
                    >
                      {Array.from({ length: Math.min(left || 10, 20) }).map(
                        (_, i) => (
                          <option key={i + 1} value={i + 1}>
                            {i + 1} resenär{i + 1 > 1 ? "er" : ""}
                          </option>
                        )
                      )}
                    </select>
                  </Field>

                  <Field label="Rabattkod / kampanjkod">
                    <div className="flex gap-2">
                      <input
                        value={customer.discount_code}
                        onChange={(e) =>
                          updateCustomer("discount_code", e.target.value)
                        }
                        placeholder="Ex. SOMMAR"
                        className="w-full rounded-xl border px-3 py-3"
                      />
                      <button
                        type="button"
                        className="rounded-xl bg-[#194C66] px-4 text-sm font-semibold text-white"
                      >
                        Aktivera
                      </button>
                    </div>
                  </Field>
                </div>

                {trip.enable_rooms && (
                  <div className="mt-5 rounded-2xl border bg-[#f8fafc] p-4">
                    <div className="font-semibold text-[#194C66]">
                      Rum / boende
                    </div>
                    <p className="mt-1 text-sm text-gray-600">
                      Rumstyper kopplar vi på i nästa steg. Första versionen
                      reserverar plats utan rumsval.
                    </p>
                  </div>
                )}

                {trip.enable_options && (
                  <div className="mt-5 rounded-2xl border bg-[#f8fafc] p-4">
                    <div className="font-semibold text-[#194C66]">
                      Tillval
                    </div>
                    <p className="mt-1 text-sm text-gray-600">
                      Tillval kopplar vi på efter grundbokningen. Exempel:
                      försäkring, mat, entré eller platsval.
                    </p>
                  </div>
                )}

                <div className="mt-6 flex justify-end">
                  <button
                    disabled={!canGoStep2}
                    onClick={() => setStep(2)}
                    className="rounded-full bg-[#194C66] px-6 py-3 font-semibold text-white disabled:opacity-50"
                  >
                    Nästa steg
                  </button>
                </div>
              </Card>
            )}

            {step === 2 && (
              <Card title="2. Resenärer">
                <div className="space-y-5">
                  {passengers.map((p, index) => (
                    <div
                      key={index}
                      className="rounded-2xl border bg-[#f8fafc] p-4"
                    >
                      <div className="mb-3 font-semibold text-[#194C66]">
                        Resenär {index + 1}
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <Field label="Förnamn *">
                          <input
                            value={p.first_name}
                            onChange={(e) =>
                              updatePassenger(
                                index,
                                "first_name",
                                e.target.value
                              )
                            }
                            className="w-full rounded-xl border px-3 py-3"
                          />
                        </Field>

                        <Field label="Efternamn *">
                          <input
                            value={p.last_name}
                            onChange={(e) =>
                              updatePassenger(
                                index,
                                "last_name",
                                e.target.value
                              )
                            }
                            className="w-full rounded-xl border px-3 py-3"
                          />
                        </Field>

                        <Field label="Typ">
                          <select
                            value={p.passenger_type}
                            onChange={(e) =>
                              updatePassenger(
                                index,
                                "passenger_type",
                                e.target.value
                              )
                            }
                            className="w-full rounded-xl border px-3 py-3"
                          >
                            <option value="adult">Vuxen</option>
                            <option value="child">Barn</option>
                            <option value="youth">Ungdom</option>
                            <option value="senior">Senior</option>
                          </select>
                        </Field>

                        <Field label="Födelsedatum">
                          <input
                            type="date"
                            value={p.date_of_birth}
                            onChange={(e) =>
                              updatePassenger(
                                index,
                                "date_of_birth",
                                e.target.value
                              )
                            }
                            className="w-full rounded-xl border px-3 py-3"
                          />
                        </Field>
                      </div>

                      <div className="mt-4">
                        <Field label="Specialkost / önskemål">
                          <input
                            value={p.special_requests}
                            onChange={(e) =>
                              updatePassenger(
                                index,
                                "special_requests",
                                e.target.value
                              )
                            }
                            className="w-full rounded-xl border px-3 py-3"
                          />
                        </Field>
                      </div>
                    </div>
                  ))}
                </div>

                <Buttons
                  back={() => setStep(1)}
                  next={() => setStep(3)}
                  nextDisabled={!canGoStep3}
                />
              </Card>
            )}

            {step === 3 && (
              <Card title="3. Personuppgifter">
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Förnamn *">
                    <input
                      value={customer.first_name}
                      onChange={(e) =>
                        updateCustomer("first_name", e.target.value)
                      }
                      className="w-full rounded-xl border px-3 py-3"
                    />
                  </Field>

                  <Field label="Efternamn *">
                    <input
                      value={customer.last_name}
                      onChange={(e) =>
                        updateCustomer("last_name", e.target.value)
                      }
                      className="w-full rounded-xl border px-3 py-3"
                    />
                  </Field>

                  <Field label="E-post *">
                    <input
                      type="email"
                      value={customer.email}
                      onChange={(e) => updateCustomer("email", e.target.value)}
                      className="w-full rounded-xl border px-3 py-3"
                    />
                  </Field>

                  <Field label="Mobiltelefon *">
                    <input
                      value={customer.phone}
                      onChange={(e) => updateCustomer("phone", e.target.value)}
                      className="w-full rounded-xl border px-3 py-3"
                    />
                  </Field>

                  <Field label="Adress">
                    <input
                      value={customer.address}
                      onChange={(e) =>
                        updateCustomer("address", e.target.value)
                      }
                      className="w-full rounded-xl border px-3 py-3"
                    />
                  </Field>

                  <Field label="Postnummer">
                    <input
                      value={customer.postal_code}
                      onChange={(e) =>
                        updateCustomer("postal_code", e.target.value)
                      }
                      className="w-full rounded-xl border px-3 py-3"
                    />
                  </Field>

                  <Field label="Stad">
                    <input
                      value={customer.city}
                      onChange={(e) => updateCustomer("city", e.target.value)}
                      className="w-full rounded-xl border px-3 py-3"
                    />
                  </Field>

                  <Field label="Land">
                    <input
                      value={customer.country}
                      onChange={(e) =>
                        updateCustomer("country", e.target.value)
                      }
                      className="w-full rounded-xl border px-3 py-3"
                    />
                  </Field>
                </div>

                <div className="mt-4">
                  <Field label="Meddelande / övrigt">
                    <textarea
                      rows={4}
                      value={customer.notes}
                      onChange={(e) => updateCustomer("notes", e.target.value)}
                      className="w-full rounded-xl border px-3 py-3"
                    />
                  </Field>
                </div>

                <div className="mt-5 rounded-2xl border bg-[#f8fafc] p-4 text-sm text-gray-700">
                  <div className="font-semibold text-[#194C66]">
                    Bekräftelse
                  </div>

                  <label className="mt-3 flex gap-2">
                    <input
                      type="checkbox"
                      checked={customer.accept_terms}
                      onChange={(e) =>
                        updateCustomer("accept_terms", e.target.checked)
                      }
                    />
                    <span>
                      Jag bekräftar att jag har läst och godkänner resevillkoren.
                    </span>
                  </label>

                  <label className="mt-2 flex gap-2">
                    <input
                      type="checkbox"
                      checked={customer.accept_marketing}
                      onChange={(e) =>
                        updateCustomer("accept_marketing", e.target.checked)
                      }
                    />
                    <span>
                      Jag vill gärna få erbjudanden och information via e-post.
                    </span>
                  </label>
                </div>

                <Buttons
                  back={() => setStep(2)}
                  next={() => setStep(4)}
                  nextDisabled={!canSubmit}
                  nextLabel="Till översikt"
                />
              </Card>
            )}

            {step === 4 && (
              <Card title="4. Bekräftelse">
                <p className="text-sm leading-relaxed text-gray-600">
                  Kontrollera din bokning innan du går vidare till betalning.
                </p>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <Info label="Resa" value={trip.title} />
                  <Info label="Datum" value={fmtDate(departure.departure_date)} />
                  <Info label="Avresa" value={fmtTime(departure.departure_time)} />
                  <Info label="Antal resenärer" value={`${passengersCount} st`} />
                  <Info
                    label="Beställare"
                    value={`${customer.first_name} ${customer.last_name}`}
                  />
                  <Info label="E-post" value={customer.email} />
                </div>

                <div className="mt-6 flex items-center justify-between rounded-2xl bg-[#eef5f9] p-5">
                  <div>
                    <div className="text-sm text-[#194C66]/70">
                      Att betala
                    </div>
                    <div className="text-3xl font-bold text-[#194C66]">
                      {money(total, currency)}
                    </div>
                  </div>

                  <button
                    onClick={createBooking}
                    disabled={saving}
                    className="rounded-full bg-[#194C66] px-6 py-3 font-semibold text-white disabled:opacity-50"
                  >
                    {saving ? "Skapar bokning..." : "Boka och betala"}
                  </button>
                </div>

                <div className="mt-6">
                  <button
                    onClick={() => setStep(3)}
                    className="rounded-full border bg-white px-5 py-2 text-sm text-[#194C66]"
                  >
                    Föregående steg
                  </button>
                </div>
              </Card>
            )}
          </section>

          <aside className="h-fit rounded-3xl bg-white p-6 shadow sticky top-6">
            <h2 className="text-xl font-bold text-[#194C66]">
              Din resa - översikt
            </h2>

            <div className="mt-4 space-y-3 text-sm">
              <Summary label="Resa" value={trip.title} />
              <Summary label="Destination" value={trip.destination || "—"} />
              <Summary label="Datum" value={fmtDate(departure.departure_date)} />
              <Summary label="Avresa" value={fmtTime(departure.departure_time)} />
              <Summary label="Resenärer" value={`${passengersCount} st`} />
              <Summary label="Pris/person" value={money(unitPrice, currency)} />
              <Summary label="Totalpris" value={money(total, currency)} />
            </div>

            <div className="mt-5 rounded-2xl bg-[#eef5f9] p-4 text-sm text-[#194C66]">
              {trip.overview_text ||
                "När du bokar skapas en reservation och du går vidare till betalning."}
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

function Stepper({ step }: { step: number }) {
  const items = ["Välj resa", "Resenärer", "Personuppgifter", "Bekräftelse"];

  return (
    <div className="mb-6 rounded-3xl bg-white p-4 shadow">
      <div className="grid gap-3 md:grid-cols-4">
        {items.map((item, index) => {
          const active = step === index + 1;
          const done = step > index + 1;

          return (
            <div
              key={item}
              className={`rounded-2xl px-4 py-3 text-sm font-semibold ${
                active
                  ? "bg-[#194C66] text-white"
                  : done
                  ? "bg-green-50 text-green-700"
                  : "bg-[#f8fafc] text-gray-500"
              }`}
            >
              {index + 1}. {item}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl bg-white p-6 shadow">
      <h2 className="text-2xl font-bold text-[#194C66]">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-1 text-sm font-semibold text-[#194C66]">{label}</div>
      {children}
    </label>
  );
}

function Info({ label, value }: { label: string; value: any }) {
  return (
    <div className="rounded-2xl border bg-[#f8fafc] p-4">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="mt-1 font-semibold text-[#0f172a]">{value || "—"}</div>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex justify-between gap-4 border-b pb-2">
      <span className="text-gray-500">{label}</span>
      <span className="text-right font-semibold text-[#0f172a]">
        {value || "—"}
      </span>
    </div>
  );
}

function Buttons({
  back,
  next,
  nextDisabled,
  nextLabel = "Nästa steg",
}: {
  back: () => void;
  next: () => void;
  nextDisabled?: boolean;
  nextLabel?: string;
}) {
  return (
    <div className="mt-6 flex items-center justify-between gap-3">
      <button
        onClick={back}
        className="rounded-full border bg-white px-5 py-2 text-sm text-[#194C66]"
      >
        Föregående steg
      </button>

      <button
        disabled={nextDisabled}
        onClick={next}
        className="rounded-full bg-[#194C66] px-6 py-3 font-semibold text-white disabled:opacity-50"
      >
        {nextLabel}
      </button>
    </div>
  );
}
