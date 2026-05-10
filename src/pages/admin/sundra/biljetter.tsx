import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";

type TicketBooking = {
  id: string;
  booking_number?: string | null;
  customer_name?: string | null;
  customer_email?: string | null;
  customer_phone?: string | null;

  status?: string | null;
  payment_status?: string | null;

  passengers_count?: number | null;
  total_amount?: number | null;
  currency?: string | null;

  created_at?: string | null;

  sundra_trips?: {
    id?: string | null;
    title?: string | null;
    destination?: string | null;
  } | null;

  sundra_departures?: {
    id?: string | null;
    departure_date?: string | null;
    departure_time?: string | null;
    return_date?: string | null;
    return_time?: string | null;
  } | null;

  sundra_booking_passengers?: {
    id: string;
    first_name?: string | null;
    last_name?: string | null;
    passenger_type?: string | null;
    seat_number?: string | null;
  }[];
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
      dateStyle: "medium",
    }).format(new Date(`${date}T00:00:00`));
  } catch {
    return date;
  }
}

function fmtTime(time?: string | null) {
  if (!time) return "—";
  return String(time).slice(0, 5);
}

function paymentLabel(status?: string | null) {
  if (status === "paid") return "Betald";
  if (status === "pending") return "Inväntar";
  if (status === "pending_payment") return "Inväntar";
  if (status === "unpaid") return "Obetald";
  if (status === "cancelled") return "Avbruten";
  return status || "—";
}

function paymentClass(status?: string | null) {
  if (status === "paid") return "bg-green-100 text-green-700";
  if (status === "cancelled") return "bg-red-100 text-red-700";
  if (status === "unpaid") return "bg-red-100 text-red-700";
  return "bg-amber-100 text-amber-700";
}

function bookingStatusLabel(status?: string | null) {
  if (status === "confirmed") return "Bekräftad";
  if (status === "draft") return "Utkast";
  if (status === "cancelled") return "Avbokad";
  return status || "—";
}

export default function SundraTicketsPage() {
  const [bookings, setBookings] = useState<TicketBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("all");

  async function loadTickets() {
    try {
      setLoading(true);
      setError("");

      const res = await fetch("/api/admin/sundra/bookings/tickets");
      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Kunde inte hämta biljetter.");
      }

      setBookings(json.bookings || []);
    } catch (e: any) {
      setError(e?.message || "Kunde inte hämta biljetter.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTickets();
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();

    return bookings.filter((b) => {
      const passengers = b.sundra_booking_passengers || [];

      const matchSearch =
        !q ||
        b.booking_number?.toLowerCase().includes(q) ||
        b.customer_name?.toLowerCase().includes(q) ||
        b.customer_email?.toLowerCase().includes(q) ||
        b.sundra_trips?.title?.toLowerCase().includes(q) ||
        b.sundra_trips?.destination?.toLowerCase().includes(q) ||
        passengers.some((p) =>
          `${p.first_name || ""} ${p.last_name || ""}`
            .toLowerCase()
            .includes(q)
        );

      const matchPayment =
        paymentStatus === "all" || b.payment_status === paymentStatus;

      return matchSearch && matchPayment;
    });
  }, [bookings, search, paymentStatus]);

  const stats = useMemo(() => {
    const paid = bookings.filter((b) => b.payment_status === "paid").length;
    const unpaid = bookings.filter((b) => b.payment_status !== "paid").length;

    const passengers = bookings.reduce(
      (sum, b) =>
        sum +
        Number(
          b.passengers_count ||
            b.sundra_booking_passengers?.length ||
            0
        ),
      0
    );

    return {
      total: bookings.length,
      paid,
      unpaid,
      passengers,
    };
  }, [bookings]);

  return (
    <>
      <AdminMenu />

      <div className="min-h-screen bg-[#f5f4f0] lg:pl-64">
        <Header />

        <main className="space-y-6 p-6 pt-24">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-[#194C66]">
                Biljetter
              </h1>

              <p className="mt-1 text-sm text-[#194C66]/70">
                Hantera Sundra-biljetter, PDF, QR, betalstatus och resenärer.
              </p>
            </div>

            <button
              onClick={loadTickets}
              className="rounded-full border bg-white px-4 py-2 text-sm font-semibold text-[#194C66]"
            >
              Uppdatera
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <Stat title="Biljetter" value={stats.total} />
            <Stat title="Betalda" value={stats.paid} />
            <Stat title="Obetalda" value={stats.unpaid} />
            <Stat title="Resenärer" value={stats.passengers} />
          </div>

          <section className="rounded-3xl bg-white p-5 shadow">
            <div className="grid gap-4 md:grid-cols-[1fr_220px]">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Sök bokning, kund, resa eller resenär..."
                className="w-full rounded-xl border px-4 py-3 text-sm"
              />

              <select
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value)}
                className="w-full rounded-xl border px-4 py-3 text-sm"
              >
                <option value="all">Alla betalstatusar</option>
                <option value="paid">Betalda</option>
                <option value="pending">Inväntar</option>
                <option value="pending_payment">Inväntar betalning</option>
                <option value="unpaid">Obetalda</option>
                <option value="cancelled">Avbrutna</option>
              </select>
            </div>
          </section>

          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          <section className="overflow-hidden rounded-3xl bg-white shadow">
            <div className="border-b p-5">
              <h2 className="text-lg font-semibold text-[#194C66]">
                Alla biljetter
              </h2>
              <p className="text-sm text-gray-500">
                {filtered.length} av {bookings.length} bokningar
              </p>
            </div>

            {loading ? (
              <div className="p-6 text-sm text-gray-500">
                Laddar biljetter...
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-6 text-sm text-gray-500">
                Inga biljetter hittades.
              </div>
            ) : (
              <div className="divide-y">
                {filtered.map((booking) => {
                  const passengers =
                    booking.sundra_booking_passengers || [];

                  const departure = booking.sundra_departures;
                  const trip = booking.sundra_trips;

                  return (
                    <div
                      key={booking.id}
                      className="p-5 hover:bg-[#f8fafc]"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-lg font-semibold text-[#0f172a]">
                              {booking.booking_number || "—"}
                            </h3>

                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${paymentClass(
                                booking.payment_status
                              )}`}
                            >
                              {paymentLabel(booking.payment_status)}
                            </span>

                            <span className="rounded-full bg-[#eef5f9] px-3 py-1 text-xs font-semibold text-[#194C66]">
                              {bookingStatusLabel(booking.status)}
                            </span>
                          </div>

                          <p className="mt-1 text-sm text-gray-500">
                            {booking.customer_name || "—"} ·{" "}
                            {booking.customer_email || "Ingen e-post"}
                          </p>
                        </div>

                        <div className="text-right">
                          <div className="text-xl font-bold text-[#194C66]">
                            {money(
                              booking.total_amount,
                              booking.currency || "SEK"
                            )}
                          </div>
                          <div className="text-xs text-gray-500">
                            {booking.passengers_count ||
                              passengers.length ||
                              0}{" "}
                            resenärer
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-5">
                        <Info
                          label="Resa"
                          value={trip?.title || "Sundra resa"}
                        />

                        <Info
                          label="Destination"
                          value={trip?.destination || "—"}
                        />

                        <Info
                          label="Avgång"
                          value={`${fmtDate(
                            departure?.departure_date
                          )} kl ${fmtTime(departure?.departure_time)}`}
                        />

                        <Info
                          label="Retur"
                          value={`${fmtDate(
                            departure?.return_date
                          )} kl ${fmtTime(departure?.return_time)}`}
                        />

                        <Info
                          label="Telefon"
                          value={booking.customer_phone || "—"}
                        />
                      </div>

                      {passengers.length > 0 && (
                        <div className="mt-5 rounded-2xl border bg-white p-4">
                          <div className="mb-3 text-sm font-semibold text-[#194C66]">
                            Resenärer och säten
                          </div>

                          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                            {passengers.map((p, index) => (
                              <div
                                key={p.id || index}
                                className="rounded-xl bg-[#f8fafc] p-3 text-sm"
                              >
                                <div className="font-semibold text-[#0f172a]">
                                  {p.first_name || "—"} {p.last_name || ""}
                                </div>

                                <div className="mt-1 text-xs text-gray-500">
                                  {p.passenger_type || "Vuxen"} · Plats:{" "}
                                  <strong>
                                    {p.seat_number || "Ej vald"}
                                  </strong>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="mt-5 flex flex-wrap justify-end gap-2">
                        <Link
                          href={`/min-bokning/${booking.booking_number}`}
                          target="_blank"
                          className="rounded-full border bg-white px-4 py-2 text-xs font-semibold text-[#194C66]"
                        >
                          Min bokning
                        </Link>

                        <a
                          href={`/api/public/sundra/bookings/${booking.id}/ticket`}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-full bg-[#194C66] px-4 py-2 text-xs font-semibold text-white"
                        >
                          Ladda ner PDF
                        </a>

                        {departure?.id && (
                          <Link
                            href={`/admin/sundra/boarding/${departure.id}`}
                            className="rounded-full bg-[#0f766e] px-4 py-2 text-xs font-semibold text-white"
                          >
                            Boarding
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </main>
      </div>
    </>
  );
}

function Stat({ title, value }: { title: string; value: any }) {
  return (
    <div className="rounded-3xl bg-white p-5 shadow">
      <div className="text-sm text-gray-500">{title}</div>
      <div className="mt-2 text-3xl font-bold text-[#194C66]">
        {value}
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: any }) {
  return (
    <div className="rounded-2xl border bg-[#f8fafc] p-4">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="mt-1 break-words font-semibold text-[#0f172a]">
        {value || "—"}
      </div>
    </div>
  );
}


