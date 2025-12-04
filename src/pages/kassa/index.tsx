// src/pages/kassa/index.tsx
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";

type BookingTrip = {
  id: string;
  title: string;
  subtitle?: string | null;
  summary?: string | null;
  city?: string | null;
  country?: string | null;
  hero_image?: string | null;
  slug?: string | null;
};

type BookingDeparture = {
  trip_id: string;
  date: string;
  time: string | null;
  line_name: string | null;
  seats_total: number;
  seats_reserved: number;
  seats_left: number;
};

type BookingTicket = {
  id: number;
  ticket_type_id: number;
  name: string;
  code: string | null;
  price: number;
  currency: string;
  departure_date: string | null;
};

type BookingInitResponse = {
  ok: boolean;
  error?: string;
  trip?: BookingTrip;
  departure?: BookingDeparture;
  tickets?: BookingTicket[];
};

type PassengerForm = {
  firstName: string;
  lastName: string;
  personalNumber: string;
  phone: string;
  boardingStop: string;
  note: string;
};

function money(n?: number | null, currency: string = "SEK") {
  if (n == null) return "—";
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(n);
}

export default function KassaPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [trip, setTrip] = useState<BookingTrip | null>(null);
  const [departure, setDeparture] = useState<BookingDeparture | null>(null);
  const [tickets, setTickets] = useState<BookingTicket[]>([]);

  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
  const [quantity, setQuantity] = useState<number>(1);

  // STEG: 1 = Antal, 2 = Uppgifter, 3 = Bekräfta
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Kontakt / bokningsansvarig
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactStreet, setContactStreet] = useState("");
  const [contactPostalCode, setContactPostalCode] = useState("");
  const [contactCity, setContactCity] = useState("");
  const [contactCountry, setContactCountry] = useState("Sverige");
  const [contactDiscountCode, setContactDiscountCode] = useState("");

  // Resenärer
  const [passengers, setPassengers] = useState<PassengerForm[]>([]);

  useEffect(() => {
    if (!router.isReady) return;

    const { trip_id, date } = router.query;
    if (!trip_id || !date) {
      setErr("Saknar information om resa. Försök boka om från resesidan.");
      setLoading(false);
      return;
    }

    const tripId = String(trip_id);
    const departDate = String(date).slice(0, 10);

    (async () => {
      try {
        setLoading(true);
        setErr(null);

        const r = await fetch(
          `/api/public/booking/init?trip_id=${encodeURIComponent(
            tripId
          )}&date=${encodeURIComponent(departDate)}`
        );
        const j: BookingInitResponse = await r.json();
        if (!r.ok || !j.ok) {
          throw new Error(j.error || "Kunde inte läsa reseinformation.");
        }

        setTrip(j.trip || null);
        setDeparture(j.departure || null);
        setTickets(j.tickets || []);

        if (j.tickets && j.tickets.length > 0) {
          setSelectedTicketId(j.tickets[0].id);
        }
      } catch (e: any) {
        console.error(e);
        setErr(e?.message || "Tekniskt fel.");
      } finally {
        setLoading(false);
      }
    })();
  }, [router.isReady, router.query]);

  const selectedTicket = useMemo(() => {
    if (!tickets.length) return null;
    if (selectedTicketId == null) return tickets[0];
    return tickets.find((t) => t.id === selectedTicketId) || tickets[0];
  }, [tickets, selectedTicketId]);

  const totalPrice = useMemo(() => {
    if (!selectedTicket) return 0;
    return selectedTicket.price * Math.max(quantity, 0);
  }, [selectedTicket, quantity]);

  // Håll resenärslistan i samma längd som quantity
  useEffect(() => {
    setPassengers((prev) => {
      const q = Math.max(1, quantity);
      const next = [...prev];
      if (next.length < q) {
        for (let i = next.length; i < q; i++) {
          next.push({
            firstName: "",
            lastName: "",
            personalNumber: "",
            phone: "",
            boardingStop: "",
            note: "",
          });
        }
      } else if (next.length > q) {
        next.length = q;
      }
      return next;
    });
  }, [quantity]);

  function formatDeparture(departure: BookingDeparture | null) {
    if (!departure) return "";
    const date = departure.date;
    const time = departure.time ? departure.time.slice(0, 5) : "";
    const d = new Date(date + "T00:00:00");
    const pretty = !Number.isNaN(d.getTime())
      ? d.toLocaleDateString("sv-SE", {
          weekday: "short",
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : date;

    return [pretty, time].filter(Boolean).join(" ");
  }

  // ---- Steg-hanterare ----
  function handleNextFromStep1(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTicket) return;
    if (!departure) return;

    if (quantity < 1) {
      alert("Välj minst 1 resenär.");
      return;
    }
    if (departure.seats_left && quantity > departure.seats_left) {
      alert("Det finns inte så många platser kvar på denna avgång.");
      return;
    }
    setStep(2);
  }

  function handleNextFromStep2(e: React.FormEvent) {
    e.preventDefault();
    if (!contactName || !contactEmail || !contactPhone) {
      alert("Fyll i kontaktuppgifter (namn, e-post och telefon).");
      return;
    }
    // enkel koll: första resenären ska ha namn
    if (!passengers[0]?.firstName || !passengers[0]?.lastName) {
      alert("Fyll i uppgifter för minst en resenär.");
      return;
    }
    setStep(3);
  }

  function handleConfirm(e: React.FormEvent) {
    e.preventDefault();
    // Här kommer vi senare lägga in:
    // - skapa bokning i DB
    // - redirect till betalning
    alert("Här kopplar vi betalning och färdig bokning i nästa steg 🙂");
  }

  function handlePassengerChange(
    index: number,
    patch: Partial<PassengerForm>
  ) {
    setPassengers((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  }

  const steps = [
    { id: 1, label: "Antal" },
    { id: 2, label: "Uppgifter" },
    { id: 3, label: "Bekräfta" },
  ];

  return (
    <>
      <Head>
        <title>Kassa – Helsingbuss</title>
      </Head>

      {/* Vit bakgrund på hela sidan */}
      <div className="min-h-screen bg-white py-8 px-4">
        <div className="max-w-5xl mx-auto">
          {/* Topplogo / rubrik + stegindikator */}
          <div className="mb-6 space-y-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-[#194C66]/70">
                Helsingbuss
              </div>
              <h1 className="text-xl font-semibold text-[#0f172a]">
                Kassa – boka din resa
              </h1>
              <p className="text-sm text-slate-600">
                {step === 1 && "Steg 1 av 3 · Välj antal resenärer."}
                {step === 2 &&
                  "Steg 2 av 3 · Fyll i uppgifter för bokningsansvarig och resenärer."}
                {step === 3 &&
                  "Steg 3 av 3 · Kontrollera uppgifterna och bekräfta bokningen."}
              </p>
            </div>

            {/* Steg-indikator (enkel, men i din stil) */}
            <div className="flex flex-wrap gap-2 text-xs font-semibold">
              {steps.map((s, idx) => {
                const active = s.id === step;
                const done = s.id < step;
                const base =
                  "flex-1 min-w-[80px] px-3 py-2 rounded-full border text-center";
                return (
                  <div
                    key={s.id}
                    className={
                      base +
                      " " +
                      (active
                        ? "bg-[#194C66] text-white border-[#194C66]"
                        : done
                        ? "bg-[#e5f0f6] text-[#194C66] border-[#c5d5e0]"
                        : "bg-white text-slate-500 border-slate-200")
                    }
                  >
                    {idx + 1}. {s.label}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Fel / laddning */}
          {loading && (
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-600 shadow-sm">
              Laddar reseinformation…
            </div>
          )}

          {!loading && err && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-6 text-sm text-red-700 shadow-sm">
              {err}
            </div>
          )}

          {!loading && !err && trip && departure && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Vänster: formulär / steg */}
              <div className="lg:col-span-2 space-y-6">
                {/* STEG 1 – ANTAL & BILJETT */}
                {step === 1 && (
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
                    <div className="px-4 sm:px-5 py-3 border-b border-slate-200 flex items-center justify-between">
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wide text-[#194C66]/70">
                          Steg 1
                        </div>
                        <div className="text-sm font-semibold text-slate-900">
                          Antal resenärer & biljettyp
                        </div>
                      </div>
                    </div>
                    <form
                      onSubmit={handleNextFromStep1}
                      className="px-4 sm:px-5 py-4 space-y-5"
                    >
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                          <div className="text-[13px] font-medium text-[#194C66]/80 mb-1">
                            Biljettyp
                          </div>
                          {tickets.length === 0 ? (
                            <div className="text-sm text-slate-500">
                              Inga priser är satta för denna avgång ännu.
                            </div>
                          ) : (
                            <select
                              className="border rounded-xl px-3 py-2.5 w-full text-sm focus:outline-none focus:ring-2 focus:ring-[#194C66]/30"
                              value={
                                selectedTicket
                                  ? String(selectedTicket.id)
                                  : ""
                              }
                              onChange={(e) =>
                                setSelectedTicketId(
                                  e.target.value
                                    ? Number(e.target.value)
                                    : null
                                )
                              }
                            >
                              {tickets.map((t) => (
                                <option key={t.id} value={t.id}>
                                  {t.name} –{" "}
                                  {money(t.price, t.currency)}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>

                        <div>
                          <div className="text-[13px] font-medium text-[#194C66]/80 mb-1">
                            Antal resenärer
                          </div>
                          <input
                            type="number"
                            min={1}
                            max={departure.seats_left || undefined}
                            className="border rounded-xl px-3 py-2.5 w-full text-sm focus:outline-none focus:ring-2 focus:ring-[#194C66]/30"
                            value={quantity}
                            onChange={(e) =>
                              setQuantity(
                                Math.max(1, Number(e.target.value) || 1)
                              )
                            }
                          />
                          <div className="text-[11px] text-slate-500 mt-1">
                            {departure.seats_left > 0
                              ? `Platser kvar: ${departure.seats_left}`
                              : "Inga platser kvar"}
                          </div>
                        </div>
                      </div>

                      <div className="pt-3 flex items-center justify-between gap-3">
                        <button
                          type="button"
                          onClick={() =>
                            router.back()
                          }
                          className="text-xs sm:text-sm px-4 py-2 rounded-full border border-slate-300 text-slate-700 bg-white hover:bg-slate-50"
                        >
                          Avbryt
                        </button>
                        <button
                          type="submit"
                          disabled={!selectedTicket || quantity <= 0}
                          className="text-xs sm:text-sm px-5 py-2 rounded-full bg-[#194C66] text-white font-semibold shadow-sm hover:bg-[#163b4d] disabled:opacity-60"
                        >
                          Nästa steg
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* STEG 2 – UPPGIFTER */}
                {step === 2 && (
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
                    <div className="px-4 sm:px-5 py-3 border-b border-slate-200 flex items-center justify-between">
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wide text-[#194C66]/70">
                          Steg 2
                        </div>
                        <div className="text-sm font-semibold text-slate-900">
                          Uppgifter – bokningsansvarig & resenärer
                        </div>
                      </div>
                    </div>
                    <form
                      onSubmit={handleNextFromStep2}
                      className="px-4 sm:px-5 py-4 space-y-6"
                    >
                      {/* Bokningsansvarig */}
                      <div>
                        <div className="text-sm font-semibold text-[#194C66] mb-2">
                          Bokningsansvarig
                        </div>
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[13px] font-medium text-[#194C66]/80 mb-1">
                              Namn
                            </label>
                            <input
                              className="border rounded-xl px-3 py-2.5 w-full text-sm focus:outline-none focus:ring-2 focus:ring-[#194C66]/30"
                              value={contactName}
                              onChange={(e) =>
                                setContactName(e.target.value)
                              }
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-[13px] font-medium text-[#194C66]/80 mb-1">
                              E-post
                            </label>
                            <input
                              type="email"
                              className="border rounded-xl px-3 py-2.5 w-full text-sm focus:outline-none focus:ring-2 focus:ring-[#194C66]/30"
                              value={contactEmail}
                              onChange={(e) =>
                                setContactEmail(e.target.value)
                              }
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-[13px] font-medium text-[#194C66]/80 mb-1">
                              Telefon
                            </label>
                            <input
                              className="border rounded-xl px-3 py-2.5 w-full text-sm focus:outline-none focus:ring-2 focus:ring-[#194C66]/30"
                              value={contactPhone}
                              onChange={(e) =>
                                setContactPhone(e.target.value)
                              }
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-[13px] font-medium text-[#194C66]/80 mb-1">
                              Rabattkod (valfritt)
                            </label>
                            <input
                              className="border rounded-xl px-3 py-2.5 w-full text-sm focus:outline-none focus:ring-2 focus:ring-[#194C66]/30"
                              value={contactDiscountCode}
                              onChange={(e) =>
                                setContactDiscountCode(e.target.value)
                              }
                            />
                          </div>
                          <div>
                            <label className="block text-[13px] font-medium text-[#194C66]/80 mb-1">
                              Adress
                            </label>
                            <input
                              className="border rounded-xl px-3 py-2.5 w-full text-sm focus:outline-none focus:ring-2 focus:ring-[#194C66]/30"
                              value={contactStreet}
                              onChange={(e) =>
                                setContactStreet(e.target.value)
                              }
                            />
                          </div>
                          <div className="grid grid-cols-[1fr_1.5fr] gap-3">
                            <div>
                              <label className="block text-[13px] font-medium text-[#194C66]/80 mb-1">
                                Postnummer
                              </label>
                              <input
                                className="border rounded-xl px-3 py-2.5 w-full text-sm focus:outline-none focus:ring-2 focus:ring-[#194C66]/30"
                                value={contactPostalCode}
                                onChange={(e) =>
                                  setContactPostalCode(e.target.value)
                                }
                              />
                            </div>
                            <div>
                              <label className="block text-[13px] font-medium text-[#194C66]/80 mb-1">
                                Ort
                              </label>
                              <input
                                className="border rounded-xl px-3 py-2.5 w-full text-sm focus:outline-none focus:ring-2 focus:ring-[#194C66]/30"
                                value={contactCity}
                                onChange={(e) =>
                                  setContactCity(e.target.value)
                                }
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-[13px] font-medium text-[#194C66]/80 mb-1">
                              Land
                            </label>
                            <input
                              className="border rounded-xl px-3 py-2.5 w-full text-sm focus:outline-none focus:ring-2 focus:ring-[#194C66]/30"
                              value={contactCountry}
                              onChange={(e) =>
                                setContactCountry(e.target.value)
                              }
                            />
                          </div>
                        </div>
                      </div>

                      {/* Resenärer */}
                      <div>
                        <div className="text-sm font-semibold text-[#194C66] mb-2">
                          Resenärer
                        </div>
                        <div className="space-y-4">
                          {passengers.map((p, idx) => (
                            <div
                              key={idx}
                              className="border border-slate-200 rounded-xl p-3 space-y-3"
                            >
                              <div className="text-xs font-semibold text-[#194C66]">
                                Resenär {idx + 1}
                              </div>
                              <div className="grid md:grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-[13px] font-medium text-[#194C66]/80 mb-1">
                                    Förnamn
                                  </label>
                                  <input
                                    className="border rounded-xl px-3 py-2.5 w-full text-sm focus:outline-none focus:ring-2 focus:ring-[#194C66]/30"
                                    value={p.firstName}
                                    onChange={(e) =>
                                      handlePassengerChange(idx, {
                                        firstName: e.target.value,
                                      })
                                    }
                                  />
                                </div>
                                <div>
                                  <label className="block text-[13px] font-medium text-[#194C66]/80 mb-1">
                                    Efternamn
                                  </label>
                                  <input
                                    className="border rounded-xl px-3 py-2.5 w-full text-sm focus:outline-none focus:ring-2 focus:ring-[#194C66]/30"
                                    value={p.lastName}
                                    onChange={(e) =>
                                      handlePassengerChange(idx, {
                                        lastName: e.target.value,
                                      })
                                    }
                                  />
                                </div>
                                <div>
                                  <label className="block text-[13px] font-medium text-[#194C66]/80 mb-1">
                                    Personnummer
                                  </label>
                                  <input
                                    className="border rounded-xl px-3 py-2.5 w-full text-sm focus:outline-none focus:ring-2 focus:ring-[#194C66]/30"
                                    value={p.personalNumber}
                                    onChange={(e) =>
                                      handlePassengerChange(idx, {
                                        personalNumber: e.target.value,
                                      })
                                    }
                                  />
                                </div>
                                <div>
                                  <label className="block text-[13px] font-medium text-[#194C66]/80 mb-1">
                                    Telefon
                                  </label>
                                  <input
                                    className="border rounded-xl px-3 py-2.5 w-full text-sm focus:outline-none focus:ring-2 focus:ring-[#194C66]/30"
                                    value={p.phone}
                                    onChange={(e) =>
                                      handlePassengerChange(idx, {
                                        phone: e.target.value,
                                      })
                                    }
                                  />
                                </div>
                                <div>
                                  <label className="block text-[13px] font-medium text-[#194C66]/80 mb-1">
                                    Påstigningsplats
                                  </label>
                                  <input
                                    className="border rounded-xl px-3 py-2.5 w-full text-sm focus:outline-none focus:ring-2 focus:ring-[#194C66]/30"
                                    placeholder="Ex. Helsingborg C"
                                    value={p.boardingStop}
                                    onChange={(e) =>
                                      handlePassengerChange(idx, {
                                        boardingStop: e.target.value,
                                      })
                                    }
                                  />
                                </div>
                                <div>
                                  <label className="block text-[13px] font-medium text-[#194C66]/80 mb-1">
                                    Önskemål / tillval (valfritt)
                                  </label>
                                  <input
                                    className="border rounded-xl px-3 py-2.5 w-full text-sm focus:outline-none focus:ring-2 focus:ring-[#194C66]/30"
                                    value={p.note}
                                    onChange={(e) =>
                                      handlePassengerChange(idx, {
                                        note: e.target.value,
                                      })
                                    }
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="pt-3 flex items-center justify-between gap-3">
                        <button
                          type="button"
                          onClick={() => setStep(1)}
                          className="text-xs sm:text-sm px-4 py-2 rounded-full border border-slate-300 text-slate-700 bg-white hover:bg-slate-50"
                        >
                          Tillbaka
                        </button>
                        <button
                          type="submit"
                          className="text-xs sm:text-sm px-5 py-2 rounded-full bg-[#194C66] text-white font-semibold shadow-sm hover:bg-[#163b4d]"
                        >
                          Nästa steg
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* STEG 3 – BEKRÄFTA */}
                {step === 3 && (
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
                    <div className="px-4 sm:px-5 py-3 border-b border-slate-200 flex items-center justify-between">
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wide text-[#194C66]/70">
                          Steg 3
                        </div>
                        <div className="text-sm font-semibold text-slate-900">
                          Bekräfta bokningen
                        </div>
                      </div>
                    </div>
                    <form
                      onSubmit={handleConfirm}
                      className="px-4 sm:px-5 py-4 space-y-6"
                    >
                      {/* Info-ruta */}
                      <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs text-slate-700">
                        Vi ber våra resenärer att vänligen respektera bussens
                        avgångstid för hemresan. Ibland kan det förekomma långa
                        köer i varuhusets kassor – planera ditt avslut i tid så
                        att du hinner tillbaka till bussen.
                      </div>

                      {/* Bokningsansvarig – read only */}
                      <div>
                        <div className="text-sm font-semibold text-[#194C66] mb-2">
                          Bokningsansvarig
                        </div>
                        <div className="text-sm text-slate-800 space-y-1">
                          <div>{contactName}</div>
                          <div>
                            {contactStreet &&
                              `${contactStreet}, ${contactPostalCode} ${contactCity}`}
                          </div>
                          <div>{contactCountry}</div>
                          <div>{contactPhone}</div>
                          <div>{contactEmail}</div>
                          {contactDiscountCode && (
                            <div>Rabattkod: {contactDiscountCode}</div>
                          )}
                        </div>
                      </div>

                      {/* Resenärer – read only */}
                      <div>
                        <div className="text-sm font-semibold text-[#194C66] mb-2">
                          Resenärer
                        </div>
                        <div className="space-y-2 text-sm text-slate-800">
                          {passengers.map((p, idx) => (
                            <div
                              key={idx}
                              className="border border-slate-200 rounded-xl px-3 py-2"
                            >
                              <div className="flex justify-between">
                                <span className="font-semibold">
                                  Resenär {idx + 1}: {p.firstName}{" "}
                                  {p.lastName}
                                </span>
                                <span>
                                  {money(
                                    selectedTicket?.price || 0,
                                    selectedTicket?.currency || "SEK"
                                  )}
                                </span>
                              </div>
                              <div className="text-xs text-slate-600 mt-1 space-y-0.5">
                                {p.boardingStop && (
                                  <div>
                                    Påstigningsplats: {p.boardingStop}
                                  </div>
                                )}
                                {p.note && (
                                  <div>Önskemål: {p.note}</div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Villkor */}
                      <div className="border-t border-slate-200 pt-3 space-y-2 text-xs text-slate-700">
                        <p>
                          När du bokar resan godkänner du våra
                          resevillkor. Kontrollera att alla uppgifter stämmer
                          innan du går vidare till betalning.
                        </p>
                      </div>

                      <div className="pt-3 flex items-center justify-between gap-3">
                        <button
                          type="button"
                          onClick={() => setStep(2)}
                          className="text-xs sm:text-sm px-4 py-2 rounded-full border border-slate-300 text-slate-700 bg-white hover:bg-slate-50"
                        >
                          Tillbaka
                        </button>
                        <button
                          type="submit"
                          className="text-xs sm:text-sm px-5 py-2 rounded-full bg-[#194C66] text-white font-semibold shadow-sm hover:bg-[#163b4d]"
                        >
                          Boka och betala
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>

              {/* Höger: sammanfattning */}
              <div className="lg:col-span-1 space-y-4">
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  {trip.hero_image && (
                    <div className="h-32 w-full overflow-hidden">
                      <img
                        src={trip.hero_image}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="p-4 space-y-2">
                    <div className="text-xs font-semibold uppercase tracking-wide text-[#194C66]/70">
                      Din resa
                    </div>
                    <div className="text-sm font-semibold text-slate-900">
                      {trip.title}
                    </div>
                    {trip.subtitle && (
                      <div className="text-xs text-slate-600">
                        {trip.subtitle}
                      </div>
                    )}
                    <div className="text-xs text-slate-600 space-y-0.5">
                      {departure.line_name && (
                        <div>Linje: {departure.line_name}</div>
                      )}
                      <div>Avresa: {formatDeparture(departure)}</div>
                      {trip.city || trip.country ? (
                        <div>
                          Destination:{" "}
                          {[trip.city, trip.country]
                            .filter(Boolean)
                            .join(", ")}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-semibold uppercase tracking-wide text-[#194C66]/70">
                      Sammanfattning
                    </div>
                    <div className="text-xs text-slate-500">
                      Steg {step} av 3
                    </div>
                  </div>

                  <div className="mt-2 space-y-1 text-sm text-slate-700">
                    <div className="flex justify-between">
                      <span>Biljettyp</span>
                      <span>
                        {selectedTicket
                          ? selectedTicket.name
                          : "Ej vald"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Antal</span>
                      <span>{quantity}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Pris per biljett</span>
                      <span>
                        {selectedTicket
                          ? money(
                              selectedTicket.price,
                              selectedTicket.currency
                            )
                          : "—"}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 border-t border-slate-200 pt-2 flex justify-between items-center">
                    <span className="text-sm font-semibold text-slate-900">
                      Att betala
                    </span>
                    <span className="text-lg font-semibold text-[#194C66]">
                      {money(
                        totalPrice,
                        selectedTicket?.currency || "SEK"
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
