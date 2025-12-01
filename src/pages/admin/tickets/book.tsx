// src/pages/admin/tickets/book.tsx
import { useEffect, useMemo, useState } from "react";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";

type TripOption = {
  id: string;
  title: string;
  year?: number | null;
};

type DepartureOption = {
  trip_id: string;
  date: string; // YYYY-MM-DD
};

type TicketType = {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  kind: "ticket" | "addon" | string;
  sort_order: number;
  is_active: boolean;
};

type PriceRow = {
  id: string;
  ticket_type_id: string;
  price: number;
  currency: string;
};

type TicketWithPrice = TicketType & {
  price: number | null;
};

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[13px] font-medium text-[#194C66]/80 mb-1">
      {children}
    </div>
  );
}

function Help({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[12px] text-[#194C66]/60 mt-1">{children}</div>
  );
}

function formatDate(date: string) {
  if (!date) return "";
  const d = new Date(date + "T00:00:00");
  if (isNaN(d.getTime())) return date;
  return d.toLocaleDateString("sv-SE", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatMoney(n: number) {
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: "SEK",
    maximumFractionDigits: 0,
  }).format(n);
}

export default function AdminTicketBookPage() {
  const [initLoading, setInitLoading] = useState(true);
  const [trips, setTrips] = useState<TripOption[]>([]);
  const [departures, setDepartures] = useState<DepartureOption[]>([]);

  const [selectedTripId, setSelectedTripId] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>("");

  const [tickets, setTickets] = useState<TicketWithPrice[]>([]);
  const [quantities, setQuantities] = useState<Record<string, string>>({});

  const [loadingTickets, setLoadingTickets] = useState(false);
  const [saving, setSaving] = useState(false);

  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<
    "manual" | "swish" | "card" | "invoice"
  >("manual");
  const [markAsPaid, setMarkAsPaid] = useState(false);
  const [internalNote, setInternalNote] = useState("");

  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [createdBookingId, setCreatedBookingId] = useState<string | null>(null);

  // 1) Hämta resor + avgångar
  useEffect(() => {
    (async () => {
      try {
        setInitLoading(true);
        setErr(null);
        setMsg(null);

        const r = await fetch("/api/pricing/init");
        const j = await r.json();
        if (!r.ok || j.ok === false) {
          throw new Error(j?.error || "Kunde inte hämta resor och avgångar.");
        }

        const tripsData: TripOption[] = j.trips || [];
        const depData: DepartureOption[] = j.departures || [];

        setTrips(tripsData);
        setDepartures(depData);

        if (tripsData.length > 0) {
          const firstTripId = tripsData[0].id;
          setSelectedTripId(firstTripId);

          const depsForTrip = depData
            .filter((d) => d.trip_id === firstTripId && d.date)
            .sort((a, b) => (a.date < b.date ? -1 : 1));

          if (depsForTrip.length > 0) {
            setSelectedDate(depsForTrip[0].date);
          }
        }
      } catch (e: any) {
        setErr(e?.message || "Tekniskt fel vid hämtning av grunddata.");
      } finally {
        setInitLoading(false);
      }
    })();
  }, []);

  // Filtrerade avgångar för vald resa
  const departuresForTrip = useMemo(
    () =>
      departures
        .filter((d) => d.trip_id === selectedTripId && d.date)
        .sort((a, b) => (a.date < b.date ? -1 : 1)),
    [departures, selectedTripId]
  );

  const currentTrip = trips.find((t) => t.id === selectedTripId) || null;

  // 2) Hämta biljetttyper + priser för vald resa + avgång
  useEffect(() => {
    if (!selectedTripId || !selectedDate) {
      setTickets([]);
      setQuantities({});
      return;
    }

    (async () => {
      try {
        setLoadingTickets(true);
        setErr(null);
        setMsg(null);
        setCreatedBookingId(null);

        const params = new URLSearchParams({
          trip_id: selectedTripId,
          departure_date: selectedDate,
        });

        const r = await fetch(`/api/pricing/get?${params.toString()}`);
        const j = await r.json();

        if (!r.ok || j.ok === false) {
          throw new Error(j?.error || "Kunde inte hämta biljetttyper/priser.");
        }

        const tt: TicketType[] = j.ticket_types || [];
        const prices: PriceRow[] = j.prices || [];

        const priceMap: Record<string, number> = {};
        for (const p of prices) {
          if (typeof p.price === "number") {
            priceMap[p.ticket_type_id] = p.price;
          }
        }

        const withPrices: TicketWithPrice[] = tt.map((t) => ({
          ...t,
          price: priceMap[t.id] ?? null,
        }));

        setTickets(withPrices);

        const qtyMap: Record<string, string> = {};
        for (const t of withPrices) {
          qtyMap[t.id] = "";
        }
        setQuantities(qtyMap);
      } catch (e: any) {
        setErr(e?.message || "Tekniskt fel vid hämtning av biljetter.");
        setTickets([]);
        setQuantities({});
      } finally {
        setLoadingTickets(false);
      }
    })();
  }, [selectedTripId, selectedDate]);

  function onChangeQuantity(ticketTypeId: string, value: string) {
    const cleaned = value.replace(/[^\d]/g, "");
    setQuantities((prev) => ({ ...prev, [ticketTypeId]: cleaned }));
  }

  const lineTotals = useMemo(() => {
    const out: Record<string, number> = {};
    for (const t of tickets) {
      const qtyStr = (quantities[t.id] || "").trim();
      const qty = qtyStr ? Number(qtyStr) : 0;
      if (!Number.isFinite(qty) || qty <= 0 || t.price == null) {
        out[t.id] = 0;
      } else {
        out[t.id] = qty * t.price;
      }
    }
    return out;
  }, [tickets, quantities]);

  const bookingTotal = useMemo(
    () => Object.values(lineTotals).reduce((sum, v) => sum + v, 0),
    [lineTotals]
  );

  const hasAnyTickets = useMemo(
    () =>
      tickets.some((t) => {
        const qtyStr = (quantities[t.id] || "").trim();
        const qty = qtyStr ? Number(qtyStr) : 0;
        return Number.isFinite(qty) && qty > 0 && t.price != null;
      }),
    [tickets, quantities]
  );

  async function onSave() {
    if (!selectedTripId || !selectedDate) {
      setErr("Välj resa och avgång först.");
      return;
    }
    if (!customerName.trim()) {
      setErr("Ange kundens namn.");
      return;
    }
    if (!hasAnyTickets) {
      setErr("Välj minst en biljettyp med antal och pris.");
      return;
    }

    try {
      setSaving(true);
      setErr(null);
      setMsg(null);
      setCreatedBookingId(null);

      const itemsPayload = tickets
        .map((t) => {
          const qtyStr = (quantities[t.id] || "").trim();
          const qty = qtyStr ? Number(qtyStr) : 0;
          if (!Number.isFinite(qty) || qty <= 0) return null;
          return {
            ticket_type_id: t.id,
            quantity: qty,
          };
        })
        .filter(Boolean);

      const body = {
        trip_id: selectedTripId,
        departure_date: selectedDate,
        customer_name: customerName.trim(),
        customer_email: customerEmail.trim() || null,
        customer_phone: customerPhone.trim() || null,
        payment_method: paymentMethod,
        mark_as_paid: markAsPaid,
        internal_note: internalNote.trim() || null,
        items: itemsPayload,
      };

      const r = await fetch("/api/ticket-orders/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const j = await r.json();
      if (!r.ok || j.ok === false) {
        throw new Error(j?.error || "Kunde inte skapa bokning.");
      }

      setCreatedBookingId(j.booking_id || null);
      setMsg("Bokning skapad.");

      // Nollställ endast antal (kundinfo får ligga kvar om du gör fler bokningar åt samma kund)
      const resetQty: Record<string, string> = {};
      for (const t of tickets) resetQty[t.id] = "";
      setQuantities(resetQty);
    } catch (e: any) {
      setErr(e?.message || "Tekniskt fel vid skapande av bokning.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <AdminMenu />
      <div className="min-h-screen bg-[#f5f4f0] lg:pl-64">
        <Header />

        <main className="px-6 pb-16 pt-14 lg:pt-20">
          {/* Topprad */}
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-xl font-semibold text-[#194C66]">
                Boka biljett (admin)
              </h1>
              <p className="text-sm text-slate-600">
                Används när kunder ringer eller mailar – välj resa, avgång och
                biljetter så skapas en bokning i systemet.
              </p>
            </div>
            {initLoading && (
              <div className="text-[12px] text-slate-500">
                Laddar grunddata…
              </div>
            )}
          </div>

          {err && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {err}
            </div>
          )}
          {msg && (
            <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {msg}{" "}
              {createdBookingId && (
                <span className="block text-[11px] text-emerald-800 mt-1">
                  Boknings-ID: <code>{createdBookingId}</code>
                </span>
              )}
            </div>
          )}

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1.4fr)_minmax(0,1fr)] lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1.8fr)]">
            {/* Steg 1: Resa + avgång */}
            <section className="bg-white rounded-2xl shadow-sm border border-slate-200/70">
              <div className="px-4 sm:px-5 py-3 border-b">
                <h2 className="text-sm font-semibold tracking-wide text-[#194C66]">
                  Steg 1 – Välj resa & avgång
                </h2>
                <p className="text-[12px] text-slate-500 mt-1">
                  Välj först vilken resa och vilket datum kunden vill åka.
                </p>
              </div>
              <div className="p-4 sm:p-5 space-y-4">
                <div>
                  <FieldLabel>Resa</FieldLabel>
                  <select
                    className="border rounded-xl px-3 py-2.5 w-full text-sm focus:outline-none focus:ring-2 focus:ring-[#194C66]/30"
                    value={selectedTripId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setSelectedTripId(id);
                      setSelectedDate("");
                      setTickets([]);
                      setQuantities({});
                      setCreatedBookingId(null);
                      if (!id) return;
                      const depsForTrip = departures
                        .filter((d) => d.trip_id === id && d.date)
                        .sort((a, b) => (a.date < b.date ? -1 : 1));
                      setSelectedDate(depsForTrip[0]?.date || "");
                    }}
                  >
                    {trips.length === 0 && (
                      <option value="">Inga resor ännu</option>
                    )}
                    {trips.length > 0 && (
                      <>
                        <option value="">Välj resa…</option>
                        {trips.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.title}
                            {t.year ? ` (${t.year})` : ""}
                          </option>
                        ))}
                      </>
                    )}
                  </select>
                  <Help>Listan hämtas från tabellen trips.</Help>
                </div>

                <div>
                  <FieldLabel>Avgångsdatum</FieldLabel>
                  <select
                    className="border rounded-xl px-3 py-2.5 w-full text-sm focus:outline-none focus:ring-2 focus:ring-[#194C66]/30"
                    value={selectedDate}
                    onChange={(e) => {
                      setSelectedDate(e.target.value);
                      setCreatedBookingId(null);
                    }}
                    disabled={!selectedTripId || departuresForTrip.length === 0}
                  >
                    {!selectedTripId && (
                      <option value="">Välj en resa först</option>
                    )}
                    {selectedTripId && departuresForTrip.length === 0 && (
                      <option value="">
                        Ingen avgång hittad för denna resa
                      </option>
                    )}
                    {selectedTripId && departuresForTrip.length > 0 && (
                      <>
                        <option value="">Välj avgång…</option>
                        {departuresForTrip.map((d) => (
                          <option key={d.trip_id + d.date} value={d.date}>
                            {formatDate(d.date)}
                          </option>
                        ))}
                      </>
                    )}
                  </select>
                  <Help>Datum hämtas från tabellen trip_departures.</Help>
                </div>

                {currentTrip && selectedDate && (
                  <div className="mt-2 rounded-xl bg-slate-50 px-3 py-3 text-[13px] text-slate-700">
                    <div className="font-semibold text-[#194C66] mb-1">
                      Aktiv resa
                    </div>
                    <div>{currentTrip.title}</div>
                    <div className="text-[12px] text-slate-600">
                      Avgång: {formatDate(selectedDate)}
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Steg 2: Biljetter */}
            <section className="bg-white rounded-2xl shadow-sm border border-slate-200/70">
              <div className="px-4 sm:px-5 py-3 border-b flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold tracking-wide text-[#194C66]">
                    Steg 2 – Välj biljetter
                  </h2>
                  <p className="text-[12px] text-slate-500 mt-1">
                    Antal per biljettyp. Biljetttyper och priser hämtas från
                    Biljetttyper + Prissättning.
                  </p>
                </div>
                {loadingTickets && (
                  <span className="text-[12px] text-slate-500">
                    Laddar biljetter…
                  </span>
                )}
              </div>

              {!selectedTripId || !selectedDate ? (
                <div className="p-5 text-sm text-slate-500">
                  Välj resa och avgång först.
                </div>
              ) : tickets.length === 0 && !loadingTickets ? (
                <div className="p-5 text-sm text-slate-500">
                  Inga biljetttyper hittades. Skapa minst en biljettyp och
                  sätt priser under Biljetttyper och Prissättning.
                </div>
              ) : (
                <div className="p-4 sm:p-5">
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="bg-slate-50 text-slate-700">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">
                            Kod
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">
                            Namn
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">
                            Typ
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide">
                            Pris (SEK)
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide">
                            Antal
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide">
                            Rad-summa
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {tickets.map((t) => {
                          const qtyStr = (quantities[t.id] || "").trim();
                          const rowTotal = lineTotals[t.id] || 0;
                          const priceText =
                            t.price != null ? `${t.price} kr` : "—";

                          return (
                            <tr
                              key={t.id}
                              className="border-t border-slate-100 hover:bg-slate-50/60 transition-colors"
                            >
                              <td className="px-4 py-3 align-top font-mono text-xs text-slate-700">
                                {t.code}
                              </td>
                              <td className="px-4 py-3 align-top text-slate-900">
                                <div className="font-medium">{t.name}</div>
                                {t.description && (
                                  <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">
                                    {t.description}
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-3 align-top text-slate-700">
                                {t.kind === "addon" ? "Tillägg" : "Biljett"}
                              </td>
                              <td className="px-4 py-3 align-top text-right text-slate-900">
                                {priceText}
                              </td>
                              <td className="px-4 py-3 align-top text-right">
                                <input
                                  type="number"
                                  min={0}
                                  className="border rounded-xl px-3 py-2 w-24 text-sm text-right focus:outline-none focus:ring-2 focus:ring-[#194C66]/30"
                                  placeholder={
                                    t.price == null ? "—" : "0"
                                  }
                                  value={qtyStr}
                                  onChange={(e) =>
                                    onChangeQuantity(
                                      t.id,
                                      e.target.value
                                    )
                                  }
                                  disabled={t.price == null}
                                />
                              </td>
                              <td className="px-4 py-3 align-top text-right text-slate-900">
                                {rowTotal > 0 ? formatMoney(rowTotal) : "—"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-4 flex items-center justify-end border-t border-slate-100 pt-3">
                    <div className="text-sm text-slate-700 mr-4">
                      Totalt belopp:
                    </div>
                    <div className="text-base font-semibold text-[#194C66]">
                      {bookingTotal > 0 ? formatMoney(bookingTotal) : "0 kr"}
                    </div>
                  </div>
                </div>
              )}
            </section>

            {/* Steg 3: Kund & bekräfta */}
            <section className="bg-white rounded-2xl shadow-sm border border-slate-200/70">
              <div className="px-4 sm:px-5 py-3 border-b">
                <h2 className="text-sm font-semibold tracking-wide text-[#194C66]">
                  Steg 3 – Kund & bekräftelse
                </h2>
                <p className="text-[12px] text-slate-500 mt-1">
                  Fyll i kunduppgifter och spara bokningen. Betalning kan
                  hanteras manuellt tills vi kopplar på Swish/Klarna.
                </p>
              </div>

              <div className="p-4 sm:p-5 space-y-4">
                <div>
                  <FieldLabel>Kundens namn</FieldLabel>
                  <input
                    className="border rounded-xl px-3 py-2.5 w-full text-sm focus:outline-none focus:ring-2 focus:ring-[#194C66]/30"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="För- och efternamn"
                  />
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <FieldLabel>E-post</FieldLabel>
                    <input
                      className="border rounded-xl px-3 py-2.5 w-full text-sm focus:outline-none focus:ring-2 focus:ring-[#194C66]/30"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="kund@example.com"
                    />
                  </div>
                  <div>
                    <FieldLabel>Telefon</FieldLabel>
                    <input
                      className="border rounded-xl px-3 py-2.5 w-full text-sm focus:outline-none focus:ring-2 focus:ring-[#194C66]/30"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="070-123 45 67"
                    />
                  </div>
                </div>

                <div>
                  <FieldLabel>Betalsätt (internt)</FieldLabel>
                  <div className="flex flex-wrap gap-2 text-sm">
                    {[
                      { value: "manual", label: "Manuell/okänd" },
                      { value: "swish", label: "Swish" },
                      { value: "card", label: "Kort/Apple Pay" },
                      { value: "invoice", label: "Faktura" },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() =>
                          setPaymentMethod(opt.value as any)
                        }
                        className={
                          "px-3 py-1.5 rounded-full border text-xs " +
                          (paymentMethod === opt.value
                            ? "bg-[#194C66] text-white border-[#194C66]"
                            : "bg-white text-slate-700 border-slate-200")
                        }
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  <Help>
                    Används bara som info i admin tills vi kopplar in riktig
                    betal-lösning.
                  </Help>
                </div>

                <div>
                  <FieldLabel>Intern notering</FieldLabel>
                  <textarea
                    className="border rounded-xl px-3 py-2.5 w-full min-h-[80px] text-sm focus:outline-none focus:ring-2 focus:ring-[#194C66]/30"
                    value={internalNote}
                    onChange={(e) => setInternalNote(e.target.value)}
                    placeholder="Ex. önskemål, rullstol, fakturainfo m.m."
                  />
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={markAsPaid}
                      onChange={(e) => setMarkAsPaid(e.target.checked)}
                    />
                    <span>Markera bokningen som betald direkt</span>
                  </label>

                  <button
                    type="button"
                    onClick={onSave}
                    disabled={
                      saving ||
                      !selectedTripId ||
                      !selectedDate ||
                      !customerName.trim() ||
                      !hasAnyTickets ||
                      bookingTotal <= 0
                    }
                    className="inline-flex items-center rounded-[24px] bg-[#194C66] px-5 py-2 text-sm font-medium text-white shadow-sm disabled:opacity-60"
                  >
                    {saving ? "Skapar bokning…" : "Skapa bokning"}
                  </button>
                </div>

                <div className="text-[11px] text-slate-500">
                  Bokningen sparas i tabellerna <b>ticket_bookings</b> och{" "}
                  <b>ticket_booking_items</b>.
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>
    </>
  );
}
