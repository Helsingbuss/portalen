import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";

type BookingRow = {
  id: string;
  booking_number?: string | null;
  status?: string | null;
  customer_name?: string | null;
  customer_email?: string | null;
  customer_phone?: string | null;
  passengers_count?: number | null;
  passengers?: number | null;
  passenger_count_resolved?: number | null;
  total_amount?: number | null;
  total_amount_resolved?: number | null;
  pickup_label?: string | null;
  currency?: string | null;
  payment_status?: string | null;
  created_at?: string | null;
  trip?: {
    title?: string | null;
    destination?: string | null;
    currency?: string | null;
  } | null;
  departure?: {
    departure_date?: string | null;
    departure_time?: string | null;
    return_date?: string | null;
    return_time?: string | null;
  } | null;
  pickup_stop?: {
    stop_name?: string | null;
    stop_city?: string | null;
    departure_time?: string | null;
  } | null;
};

type ApiResponse = {
  ok: boolean;
  bookings?: BookingRow[];
  summary?: {
    total: number;
    paid: number;
    pending: number;
    cancelled: number;
  };
  error?: string;
};

function fmtDate(date?: string | null) {
  if (!date) return "—";

  try {
    return new Intl.DateTimeFormat("sv-SE", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(String(date) + "T00:00:00"));
  } catch {
    return date;
  }
}

function fmtTime(time?: string | null) {
  if (!time) return "—";
  return String(time).slice(0, 5);
}

function fmtMoney(value?: number | null, currency = "SEK") {
  const amount = Number(value || 0);

  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: currency || "SEK",
    maximumFractionDigits: 0,
  }).format(amount);
}

function paymentLabel(status?: string | null) {
  switch (status) {
    case "paid":
      return "Betald";
    case "pending":
    case "pending_payment":
      return "Inväntar";
    case "unpaid":
      return "Obetald";
    case "failed":
      return "Misslyckad";
    case "refunded":
      return "Återbetald";
    default:
      return status || "Okänd";
  }
}

function bookingStatusLabel(status?: string | null) {
  switch (status) {
    case "confirmed":
    case "active":
      return "Bekräftad";
    case "cancelled":
      return "Avbokad";
    case "pending":
      return "Väntar";
    default:
      return status || "—";
  }
}

function paymentBadgeClass(status?: string | null) {
  switch (status) {
    case "paid":
      return "bg-emerald-100 text-emerald-700";
    case "pending":
    case "pending_payment":
    case "unpaid":
      return "bg-amber-100 text-amber-700";
    case "failed":
    case "cancelled":
      return "bg-red-100 text-red-700";
    case "refunded":
      return "bg-blue-100 text-blue-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

export default function SundraBokningarAdminPage() {
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [summary, setSummary] = useState<ApiResponse["summary"]>({
    total: 0,
    paid: 0,
    pending: 0,
    cancelled: 0,
  });
  const [loading, setLoading] = useState(true);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [q, setQ] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");

  async function loadBookings() {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();

      if (q.trim()) params.set("q", q.trim());
      if (paymentStatus) params.set("payment_status", paymentStatus);

      const res = await fetch("/api/admin/sundra/bokningar?" + params.toString());
      const json: ApiResponse = await res.json().catch(() => ({ ok: false }));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte hämta bokningar.");
      }

      setBookings(json.bookings || []);
      setSummary(json.summary || { total: 0, paid: 0, pending: 0, cancelled: 0 });
    } catch (err: any) {
      setError(err?.message || "Något gick fel.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBookings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredTotal = useMemo(() => bookings.length, [bookings]);

  async function sendTicket(bookingId: string) {
    try {
      setSendingId(bookingId);
      setMessage("");
      setError("");

      let res = await fetch("/api/admin/sundra/bookings/send-ticket", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ bookingId }),
      });

      if (!res.ok) {
        res = await fetch("/api/admin/sundra/bookings/send-ticket", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ id: bookingId }),
        });
      }

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(json?.error || "Kunde inte skicka biljett.");
      }

      setMessage("Biljettlänken skickades till kunden.");
    } catch (err: any) {
      setError(err?.message || "Kunde inte skicka biljett.");
    } finally {
      setSendingId(null);
    }
  }

  return (
    <>
      <AdminMenu />

      <div className="min-h-screen bg-[#f5f4f0] lg:pl-64">
        <Header />

        <main className="px-6 pb-8 pt-10">
        <div className="">
          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#00645d]">
                Sundra
              </p>

              <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#194C66]">
                Bokningar
              </h1>

              <p className="mt-2 max-w-2xl text-sm text-slate-600">
                Här ser du alla bokningar, betalstatus, resenärer och länkar till kundens biljett.
              </p>
            </div>

            <button
              type="button"
              onClick={loadBookings}
              className="inline-flex items-center justify-center rounded-xl bg-[#194C66] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0f3548]"
            >
              Uppdatera
            </button>
          </div>

          <div className="mb-6 grid gap-4 md:grid-cols-4">
            <SummaryCard label="Totalt" value={summary?.total || 0} />
            <SummaryCard label="Betalda" value={summary?.paid || 0} tone="green" />
            <SummaryCard label="Inväntar" value={summary?.pending || 0} tone="amber" />
            <SummaryCard label="Avbokade" value={summary?.cancelled || 0} tone="red" />
          </div>

          <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="grid gap-4 lg:grid-cols-[1fr_220px_140px]">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Sök
                </label>
                <input
                  value={q}
                  onChange={(event) => setQ(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") loadBookings();
                  }}
                  placeholder="Sök bokningsnummer, kund, resa eller hållplats..."
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#194C66] focus:ring-2 focus:ring-[#194C66]/10"
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Betalstatus
                </label>
                <select
                  value={paymentStatus}
                  onChange={(event) => setPaymentStatus(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#194C66] focus:ring-2 focus:ring-[#194C66]/10"
                >
                  <option value="">Alla</option>
                  <option value="paid">Betald</option>
                  <option value="pending">Pending</option>
                  <option value="pending_payment">Inväntar betalning</option>
                  <option value="unpaid">Obetald</option>
                  <option value="refunded">Återbetald</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={loadBookings}
                  className="w-full rounded-xl bg-[#00645d] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#004f49]"
                >
                  Filtrera
                </button>
              </div>
            </div>

            {(message || error) && (
              <div
                className={
                  "mt-4 rounded-xl px-4 py-3 text-sm font-semibold " +
                  (error
                    ? "bg-red-50 text-red-700"
                    : "bg-emerald-50 text-emerald-700")
                }
              >
                {error || message}
              </div>
            )}
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h2 className="text-lg font-bold text-[#194C66]">
                  Bokningslista
                </h2>
                <p className="text-sm text-slate-500">
                  Visar {filteredTotal} bokningar
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-[1180px] w-full border-collapse text-left text-sm">
                <thead className="bg-[#194C66] text-white">
                  <tr>
                    <Th>Bokning</Th>
                    <Th>Kund</Th>
                    <Th>Resa</Th>
                    <Th>Avgång</Th>
                    <Th>Upphämtning</Th>
                    <Th>Resenärer</Th>
                    <Th>Betalning</Th>
                    <Th>Totalpris</Th>
                    <Th>Åtgärder</Th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="px-5 py-8 text-center text-slate-500">
                        Laddar bokningar...
                      </td>
                    </tr>
                  ) : bookings.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-5 py-8 text-center text-slate-500">
                        Inga bokningar hittades.
                      </td>
                    </tr>
                  ) : (
                    bookings.map((booking) => {
                      const tripTitle = booking.trip?.title || "—";
                      const destination = booking.trip?.destination || "";
                      const departureText =
                        fmtDate(booking.departure?.departure_date) +
                        " kl. " +
                        fmtTime(booking.departure?.departure_time);

                      const pickupText =
                        booking.pickup_label ||
                        (booking.pickup_stop?.stop_name
                          ? booking.pickup_stop.stop_name +
                            (booking.pickup_stop.stop_city
                              ? ", " + booking.pickup_stop.stop_city
                              : "")
                          : "Ej vald");

                      const minBookingHref = booking.booking_number
                        ? "/min-bokning/" + encodeURIComponent(booking.booking_number)
                        : "#";

                      const ticketHref =
                        "/api/public/sundra/bookings/" +
                        encodeURIComponent(booking.id) +
                        "/ticket";

                      return (
                        <tr key={booking.id} className="align-top transition hover:bg-slate-50">
                          <Td>
                            <div className="font-bold text-[#194C66]">
                              {booking.booking_number || "—"}
                            </div>
                            <div className="mt-1 text-xs text-slate-500">
                              {bookingStatusLabel(booking.status)}
                            </div>
                          </Td>

                          <Td>
                            <div className="font-semibold text-slate-900">
                              {booking.customer_name || "—"}
                            </div>
                            <div className="mt-1 max-w-[190px] truncate text-xs text-slate-500">
                              {booking.customer_email || booking.customer_phone || "—"}
                            </div>
                          </Td>

                          <Td>
                            <div className="max-w-[230px] truncate font-semibold text-slate-900">
                              {tripTitle}
                            </div>
                            {destination && (
                              <div className="mt-1 max-w-[230px] truncate text-xs text-slate-500">
                                {destination}
                              </div>
                            )}
                          </Td>

                          <Td>
                            <div className="font-semibold text-slate-900">
                              {departureText}
                            </div>
                            <div className="mt-1 text-xs text-slate-500">
                              Retur {fmtTime(booking.departure?.return_time)}
                            </div>
                          </Td>

                          <Td>
                            <div className="max-w-[170px] truncate font-semibold text-slate-900">
                              {pickupText}
                            </div>
                          </Td>

                          <Td>
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                              {booking.passenger_count_resolved || 0} st
                            </span>
                          </Td>

                          <Td>
                            <span
                              className={
                                "inline-flex rounded-full px-3 py-1 text-xs font-semibold " +
                                paymentBadgeClass(booking.payment_status)
                              }
                            >
                              {paymentLabel(booking.payment_status)}
                            </span>
                          </Td>

                          <Td>
                            <div className="font-bold text-slate-900">
                              {fmtMoney(
                                (booking.total_amount_resolved ?? booking.total_amount),
                                booking.currency || booking.trip?.currency || "SEK"
                              )}
                            </div>
                          </Td>

                          <Td>
                            <div className="flex min-w-[220px] flex-wrap gap-2">
                              <Link
                                href={minBookingHref}
                                target="_blank"
                                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-[#194C66] transition hover:bg-slate-50"
                              >
                                Min bokning
                              </Link>

                              <a
                                href={ticketHref}
                                target="_blank"
                                rel="noreferrer"
                                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-[#194C66] transition hover:bg-slate-50"
                              >
                                PDF
                              </a>

                              <button
                                type="button"
                                onClick={() => sendTicket(booking.id)}
                                disabled={sendingId === booking.id}
                                className="rounded-lg bg-[#00645d] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#004f49] disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {sendingId === booking.id ? "Skickar..." : "Skicka"}
                              </button>
                            </div>
                          </Td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
        </main>
      </div>
    </>
  );
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "green" | "amber" | "red";
}) {
  const color =
    tone === "green"
      ? "text-emerald-700 bg-emerald-50"
      : tone === "amber"
        ? "text-amber-700 bg-amber-50"
        : tone === "red"
          ? "text-red-700 bg-red-50"
          : "text-[#194C66] bg-white";

  return (
    <div className={"rounded-2xl border border-slate-200 p-5 shadow-sm " + color}>
      <div className="text-sm font-semibold opacity-80">{label}</div>
      <div className="mt-2 text-3xl font-bold">{value}</div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="whitespace-nowrap px-5 py-4 text-xs font-bold uppercase tracking-wide">
      {children}
    </th>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-5 py-4">{children}</td>;
}
