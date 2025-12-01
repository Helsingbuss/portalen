// src/pages/admin/tickets/passengers.tsx
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

type TicketTypeInfo = {
  ticket_type_id: string;
  code: string;
  name: string;
  kind: string;
  quantity: number;
  revenue: number;
};

type BookingItem = {
  ticket_type_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  ticket_type: {
    id?: string;
    code?: string;
    name?: string;
    kind?: string;
  } | null;
};

type BookingRow = {
  id: string;
  customer_name: string;
  customer_email?: string | null;
  customer_phone?: string | null;
  total_price: number;
  currency: string;
  status: string;
  payment_status: string;
  created_at: string;
  internal_note?: string | null;
  passengers?: number;
  items: BookingItem[];
};

type Totals = {
  total_passengers: number;
  total_revenue: number;
  per_type: TicketTypeInfo[];
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

function formatDatePretty(date: string) {
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

function formatDateShort(dateIso: string) {
  if (!dateIso) return "";
  const d = new Date(dateIso);
  if (isNaN(d.getTime())) return dateIso;
  return d.toLocaleString("sv-SE", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function formatMoney(n: number | null | undefined) {
  if (!n || n <= 0) return "0 kr";
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: "SEK",
    maximumFractionDigits: 0,
  }).format(n);
}

export default function AdminPassengerListsPage() {
  const [initLoading, setInitLoading] = useState(true);
  const [trips, setTrips] = useState<TripOption[]>([]);
  const [departures, setDepartures] = useState<DepartureOption[]>([]);

  const [selectedTripId, setSelectedTripId] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>("");

  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [loadingList, setLoadingList] = useState(false);

  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

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

  const departuresForTrip = useMemo(
    () =>
      departures
        .filter((d) => d.trip_id === selectedTripId && d.date)
        .sort((a, b) => (a.date < b.date ? -1 : 1)),
    [departures, selectedTripId]
  );

  const currentTrip = trips.find((t) => t.id === selectedTripId) || null;

  // 2) Hämta passagerarlista när resa + datum är valda
  useEffect(() => {
    if (!selectedTripId || !selectedDate) {
      setBookings([]);
      setTotals(null);
      return;
    }

    (async () => {
      try {
        setLoadingList(true);
        setErr(null);
        setMsg(null);

        const params = new URLSearchParams({
          trip_id: selectedTripId,
          departure_date: selectedDate,
        });

        const r = await fetch(
          `/api/ticket-orders/by-departure?${params.toString()}`
        );
        const j = await r.json();

        if (!r.ok || j.ok === false) {
          throw new Error(j?.error || "Kunde inte hämta passagerarlista.");
        }

        setBookings(j.bookings || []);
        setTotals(j.totals || null);

        if ((j.bookings || []).length === 0) {
          setMsg("Inga bokningar hittades för denna avgång.");
        } else {
          setMsg(null);
        }
      } catch (e: any) {
        setErr(e?.message || "Tekniskt fel vid hämtning av passagerarlista.");
        setBookings([]);
        setTotals(null);
      } finally {
        setLoadingList(false);
      }
    })();
  }, [selectedTripId, selectedDate]);

  const totalBookings = bookings.length;
  const totalPassengers = totals?.total_passengers ?? 0;
  const totalRevenue = totals?.total_revenue ?? 0;

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
                Passagerarlistor
              </h1>
              <p className="text-sm text-slate-600">
                Välj resa och avgång för att se alla bokningar, antal
                passagerare och summeringar.
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
            <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              {msg}
            </div>
          )}

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1.4fr)_minmax(0,1.1fr)] lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1.8fr)]">
            {/* Välj resa + avgång */}
            <section className="bg-white rounded-2xl shadow-sm border border-slate-200/70">
              <div className="px-4 sm:px-5 py-3 border-b">
                <h2 className="text-sm font-semibold tracking-wide text-[#194C66]">
                  Steg 1 – Välj resa & avgång
                </h2>
                <p className="text-[12px] text-slate-500 mt-1">
                  Filtrerar vilken passagerarlista du ser.
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
                      setBookings([]);
                      setTotals(null);
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
                  <Help>Resor hämtas från tabellen trips.</Help>
                </div>

                <div>
                  <FieldLabel>Avgångsdatum</FieldLabel>
                  <select
                    className="border rounded-xl px-3 py-2.5 w-full text-sm focus:outline-none focus:ring-2 focus:ring-[#194C66]/30"
                    value={selectedDate}
                    onChange={(e) => {
                      setSelectedDate(e.target.value);
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
                            {formatDatePretty(d.date)}
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
                      Aktiv avgång
                    </div>
                    <div>{currentTrip.title}</div>
                    <div className="text-[12px] text-slate-600">
                      Avgång: {formatDatePretty(selectedDate)}
                    </div>
                    <div className="text-[12px] text-slate-600 mt-1">
                      Bokningar: {totalBookings} &middot; Passagerare:{" "}
                      {totalPassengers}
                    </div>
                  </div>
                )}

                {loadingList && (
                  <div className="text-[12px] text-slate-500">
                    Laddar passagerarlista…
                  </div>
                )}
              </div>
            </section>

            {/* Summering – totalt & per biljettyp */}
            <section className="bg-white rounded-2xl shadow-sm border border-slate-200/70">
              <div className="px-4 sm:px-5 py-3 border-b">
                <h2 className="text-sm font-semibold tracking-wide text-[#194C66]">
                  Summering för avgången
                </h2>
                <p className="text-[12px] text-slate-500 mt-1">
                  Totalt antal passagerare, intäkter och fördelning per
                  biljettyp.
                </p>
              </div>

              <div className="p-4 sm:p-5 space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-xl bg-slate-50 px-3 py-3">
                    <div className="text-[12px] text-slate-500">
                      Totalt antal passagerare
                    </div>
                    <div className="mt-1 text-2xl font-semibold text-[#194C66]">
                      {totalPassengers}
                    </div>
                  </div>
                  <div className="rounded-xl bg-slate-50 px-3 py-3">
                    <div className="text-[12px] text-slate-500">
                      Totala intäkter (biljetter)
                    </div>
                    <div className="mt-1 text-2xl font-semibold text-[#194C66]">
                      {formatMoney(totalRevenue)}
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-[13px] font-medium text-[#194C66]/80 mb-2">
                    Fördelning per biljettyp
                  </div>
                  {totals && totals.per_type && totals.per_type.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-xs">
                        <thead className="bg-slate-50 text-slate-700">
                          <tr>
                            <th className="px-3 py-2 text-left font-semibold uppercase tracking-wide">
                              Typ
                            </th>
                            <th className="px-3 py-2 text-right font-semibold uppercase tracking-wide">
                              Antal
                            </th>
                            <th className="px-3 py-2 text-right font-semibold uppercase tracking-wide">
                              Intäkt
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {totals.per_type.map((t) => (
                            <tr
                              key={t.ticket_type_id}
                              className="border-t border-slate-100"
                            >
                              <td className="px-3 py-2 align-top">
                                <div className="font-medium text-slate-800">
                                  {t.name || t.code || "Okänd biljettyp"}
                                </div>
                                <div className="text-[11px] text-slate-500">
                                  {t.code
                                    ? `${t.code} · ${
                                        t.kind === "addon"
                                          ? "Tillägg"
                                          : "Biljett"
                                      }`
                                    : t.kind === "addon"
                                    ? "Tillägg"
                                    : "Biljett"}
                                </div>
                              </td>
                              <td className="px-3 py-2 text-right text-slate-800">
                                {t.quantity}
                              </td>
                              <td className="px-3 py-2 text-right text-slate-800">
                                {formatMoney(t.revenue)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-[13px] text-slate-500">
                      Ingen statistik ännu – inga bokningar för denna avgång.
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Bokningslista – rader */}
            <section className="bg-white rounded-2xl shadow-sm border border-slate-200/70">
              <div className="px-4 sm:px-5 py-3 border-b">
                <h2 className="text-sm font-semibold tracking-wide text-[#194C66]">
                  Bokningar & passagerare
                </h2>
                <p className="text-[12px] text-slate-500 mt-1">
                  En rad per bokning – kontaktperson, antal, betalstatus och
                  biljetttyper.
                </p>
              </div>

              {selectedTripId && selectedDate && bookings.length === 0 && !loadingList ? (
                <div className="p-5 text-sm text-slate-500">
                  Inga bokningar hittades för denna avgång.
                </div>
              ) : !selectedTripId || !selectedDate ? (
                <div className="p-5 text-sm text-slate-500">
                  Välj resa och avgång för att visa passagerarlista.
                </div>
              ) : (
                <div className="p-4 sm:p-5 overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50 text-slate-700">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">
                          Kund
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">
                          Kontakt
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">
                          Biljetter
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide">
                          Antal
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide">
                          Belopp
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">
                          Status
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">
                          Skapad
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {bookings.map((b) => {
                        const passengers = b.passengers ?? 0;
                        const itemsText =
                          b.items && b.items.length
                            ? b.items
                                .map((it) => {
                                  const name =
                                    it.ticket_type?.name ||
                                    it.ticket_type?.code ||
                                    "Biljett";
                                  return `${it.quantity}× ${name}`;
                                })
                                .join(", ")
                            : "Inga biljetter";

                        const statusLabel =
                          b.status === "cancelled"
                            ? "Avbokad"
                            : b.status === "confirmed"
                            ? "Bekräftad"
                            : "Preliminär";

                        const paymentLabel =
                          b.payment_status === "paid"
                            ? "Betald"
                            : b.payment_status === "refunded"
                            ? "Återbetald"
                            : "Obetald";

                        return (
                          <tr
                            key={b.id}
                            className="border-t border-slate-100 hover:bg-slate-50/60 transition-colors"
                          >
                            <td className="px-4 py-3 align-top text-slate-900">
                              <div className="font-medium">
                                {b.customer_name}
                              </div>
                              {b.internal_note && (
                                <div className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                                  {b.internal_note}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3 align-top text-slate-700 text-[13px]">
                              {b.customer_email && (
                                <div className="truncate">
                                  {b.customer_email}
                                </div>
                              )}
                              {b.customer_phone && (
                                <div className="truncate">
                                  {b.customer_phone}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3 align-top text-slate-700 text-[13px]">
                              {itemsText}
                            </td>
                            <td className="px-4 py-3 align-top text-right text-slate-900">
                              {passengers}
                            </td>
                            <td className="px-4 py-3 align-top text-right text-slate-900">
                              {formatMoney(b.total_price)}
                            </td>
                            <td className="px-4 py-3 align-top text-[11px]">
                              <div className="inline-flex flex-col gap-1">
                                <span
                                  className={
                                    "inline-flex items-center justify-center rounded-full px-2 py-0.5 " +
                                    (b.status === "cancelled"
                                      ? "bg-red-50 text-red-700 border border-red-200"
                                      : b.status === "confirmed"
                                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                      : "bg-amber-50 text-amber-800 border border-amber-200")
                                  }
                                >
                                  {statusLabel}
                                </span>
                                <span
                                  className={
                                    "inline-flex items-center justify-center rounded-full px-2 py-0.5 " +
                                    (b.payment_status === "paid"
                                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                      : b.payment_status === "refunded"
                                      ? "bg-slate-50 text-slate-700 border border-slate-200"
                                      : "bg-slate-100 text-slate-700 border border-slate-200")
                                  }
                                >
                                  {paymentLabel}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3 align-top text-[12px] text-slate-600 whitespace-nowrap">
                              {formatDateShort(b.created_at)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        </main>
      </div>
    </>
  );
}
