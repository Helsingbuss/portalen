import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";

type PassengerRow = {
  id: string;
  booking_id?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  passenger_name?: string | null;
  passenger_type?: string | null;
  seat_number?: string | null;
  seat_label_resolved?: string | null;
  special_requests?: string | null;
  created_at?: string | null;
  booking?: {
    id: string;
    booking_number?: string | null;
    customer_name?: string | null;
    customer_email?: string | null;
    customer_phone?: string | null;
    payment_status?: string | null;
    status?: string | null;
  } | null;
  trip?: {
    title?: string | null;
    destination?: string | null;
  } | null;
  departure?: {
    departure_date?: string | null;
    departure_time?: string | null;
    return_time?: string | null;
  } | null;
  pickup_label?: string | null;
};

type ApiResponse = {
  ok: boolean;
  passengers?: PassengerRow[];
  summary?: {
    total: number;
    withSeat: number;
    withoutSeat: number;
    paid: number;
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

function passengerTypeLabel(type?: string | null) {
  const value = String(type || "").toLowerCase();

  if (value === "adult" || value === "vuxen") return "Vuxen";
  if (value === "child" || value === "barn") return "Barn";
  if (value === "youth" || value === "ungdom") return "Ungdom";
  if (value === "student") return "Student";
  if (value === "senior") return "Senior";

  return type || "Resenär";
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

export default function SundraPassagerareAdminPage() {
  const [passengers, setPassengers] = useState<PassengerRow[]>([]);
  const [summary, setSummary] = useState<ApiResponse["summary"]>({
    total: 0,
    withSeat: 0,
    withoutSeat: 0,
    paid: 0,
  });
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [passengerType, setPassengerType] = useState("");
  const [error, setError] = useState("");

  async function loadPassengers() {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();

      if (q.trim()) params.set("q", q.trim());
      if (paymentStatus) params.set("payment_status", paymentStatus);
      if (passengerType) params.set("passenger_type", passengerType);

      const res = await fetch("/api/admin/sundra/passagerare?" + params.toString());
      const json: ApiResponse = await res.json().catch(() => ({ ok: false }));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte hämta passagerare.");
      }

      setPassengers(json.passengers || []);
      setSummary(
        json.summary || {
          total: 0,
          withSeat: 0,
          withoutSeat: 0,
          paid: 0,
        }
      );
    } catch (err: any) {
      setError(err?.message || "Något gick fel.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPassengers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredTotal = useMemo(() => passengers.length, [passengers]);

  return (
    <>
      <AdminMenu />

      <div className="min-h-screen bg-[#f5f4f0] lg:pl-64">
        <Header />

        <main className="px-6 pb-8 pt-10">
          <div className="w-full space-y-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#00645d]">
                  Sundra
                </p>

                <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#194C66]">
                  Passagerare
                </h1>

                <p className="mt-2 max-w-2xl text-sm text-slate-600">
                  Här ser du alla resenärer, deras bokningar, biljettyp, säten och betalstatus.
                </p>
              </div>

              <button
                type="button"
                onClick={loadPassengers}
                className="inline-flex items-center justify-center rounded-xl bg-[#194C66] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0f3548]"
              >
                Uppdatera
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              <SummaryCard label="Totalt" value={summary?.total || 0} />
              <SummaryCard label="Med säte" value={summary?.withSeat || 0} tone="green" />
              <SummaryCard label="Ej valt säte" value={summary?.withoutSeat || 0} tone="amber" />
              <SummaryCard label="Betalda" value={summary?.paid || 0} tone="blue" />
            </div>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="grid gap-4 lg:grid-cols-[1fr_220px_180px_140px]">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Sök
                  </label>
                  <input
                    value={q}
                    onChange={(event) => setQ(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") loadPassengers();
                    }}
                    placeholder="Sök namn, bokningsnummer, kund, resa eller säte..."
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

                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Biljettyp
                  </label>
                  <select
                    value={passengerType}
                    onChange={(event) => setPassengerType(event.target.value)}
                    className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#194C66] focus:ring-2 focus:ring-[#194C66]/10"
                  >
                    <option value="">Alla</option>
                    <option value="Vuxen">Vuxen</option>
                    <option value="Barn">Barn</option>
                    <option value="Ungdom">Ungdom</option>
                    <option value="Student">Student</option>
                    <option value="Senior">Senior</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={loadPassengers}
                    className="w-full rounded-xl bg-[#00645d] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#004f49]"
                  >
                    Filtrera
                  </button>
                </div>
              </div>

              {error && (
                <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                  {error}
                </div>
              )}
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                <div>
                  <h2 className="text-lg font-bold text-[#194C66]">
                    Passagerarlista
                  </h2>
                  <p className="text-sm text-slate-500">
                    Visar {filteredTotal} passagerare
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-[1180px] w-full border-collapse text-left text-sm">
                  <thead className="bg-[#194C66] text-white">
                    <tr>
                      <Th>Passagerare</Th>
                      <Th>Bokning</Th>
                      <Th>Kund</Th>
                      <Th>Resa</Th>
                      <Th>Avgång</Th>
                      <Th>Upphämtning</Th>
                      <Th>Biljettyp</Th>
                      <Th>Säte</Th>
                      <Th>Betalning</Th>
                      <Th>Åtgärder</Th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      <tr>
                        <td colSpan={10} className="px-5 py-8 text-center text-slate-500">
                          Laddar passagerare...
                        </td>
                      </tr>
                    ) : passengers.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="px-5 py-8 text-center text-slate-500">
                          Inga passagerare hittades.
                        </td>
                      </tr>
                    ) : (
                      passengers.map((passenger) => {
                        const booking = passenger.booking;
                        const bookingNumber = booking?.booking_number || "—";

                        const minBookingHref =
                          booking?.booking_number
                            ? "/min-bokning/" + encodeURIComponent(booking.booking_number)
                            : "#";

                        const ticketHref =
                          booking?.id
                            ? "/api/public/sundra/bookings/" +
                              encodeURIComponent(booking.id) +
                              "/ticket"
                            : "#";

                        const bookingListHref =
                          booking?.booking_number
                            ? "/admin/sundra/bokningar?q=" +
                              encodeURIComponent(booking.booking_number)
                            : "/admin/sundra/bokningar";

                        return (
                          <tr key={passenger.id} className="align-top transition hover:bg-slate-50">
                            <Td>
                              <div className="font-bold text-slate-900">
                                {passenger.passenger_name || "Resenär"}
                              </div>
                              {passenger.special_requests && (
                                <div className="mt-1 max-w-[180px] truncate text-xs text-slate-500">
                                  {passenger.special_requests}
                                </div>
                              )}
                            </Td>

                            <Td>
                              <div className="font-bold text-[#194C66]">
                                {bookingNumber}
                              </div>
                              <div className="mt-1 text-xs text-slate-500">
                                {booking?.status || "—"}
                              </div>
                            </Td>

                            <Td>
                              <div className="max-w-[170px] truncate font-semibold text-slate-900">
                                {booking?.customer_name || "—"}
                              </div>
                              <div className="mt-1 max-w-[170px] truncate text-xs text-slate-500">
                                {booking?.customer_email || booking?.customer_phone || "—"}
                              </div>
                            </Td>

                            <Td>
                              <div className="max-w-[230px] truncate font-semibold text-slate-900">
                                {passenger.trip?.title || "—"}
                              </div>
                              {passenger.trip?.destination && (
                                <div className="mt-1 max-w-[230px] truncate text-xs text-slate-500">
                                  {passenger.trip.destination}
                                </div>
                              )}
                            </Td>

                            <Td>
                              <div className="font-semibold text-slate-900">
                                {fmtDate(passenger.departure?.departure_date)}
                              </div>
                              <div className="mt-1 text-xs text-slate-500">
                                kl. {fmtTime(passenger.departure?.departure_time)}
                              </div>
                            </Td>

                            <Td>
                              <div className="max-w-[170px] truncate font-semibold text-slate-900">
                                {passenger.pickup_label || "Ej vald"}
                              </div>
                            </Td>

                            <Td>
                              <span className="rounded-full bg-[#eef8fb] px-3 py-1 text-xs font-semibold text-[#194C66]">
                                {passengerTypeLabel(passenger.passenger_type)}
                              </span>
                            </Td>

                            <Td>
                              <span
                                className={
                                  passenger.seat_label_resolved === "Ej valt"
                                    ? "rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700"
                                    : "rounded-full bg-[#194C66] px-3 py-1 text-xs font-semibold text-white"
                                }
                              >
                                {passenger.seat_label_resolved || "Ej valt"}
                              </span>
                            </Td>

                            <Td>
                              <span
                                className={
                                  "inline-flex rounded-full px-3 py-1 text-xs font-semibold " +
                                  paymentBadgeClass(booking?.payment_status)
                                }
                              >
                                {paymentLabel(booking?.payment_status)}
                              </span>
                            </Td>

                            <Td>
                              <div className="flex min-w-[240px] flex-wrap gap-2">
                                <Link
                                  href={bookingListHref}
                                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-[#194C66] transition hover:bg-slate-50"
                                >
                                  Bokning
                                </Link>

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
                                  className="rounded-lg bg-[#00645d] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#004f49]"
                                >
                                  PDF
                                </a>
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
  tone?: "green" | "amber" | "red" | "blue";
}) {
  const color =
    tone === "green"
      ? "text-emerald-700 bg-emerald-50"
      : tone === "amber"
        ? "text-amber-700 bg-amber-50"
        : tone === "red"
          ? "text-red-700 bg-red-50"
          : tone === "blue"
            ? "text-blue-700 bg-blue-50"
            : "text-[#194C66] bg-white";

  return (
    <div className={"rounded-2xl border border-slate-200 p-5 shadow-sm " + color}>
      <div className="text-sm font-semibold opacity-80">{label}</div>
      <div className="mt-2 text-3xl font-bold">{value}</div>
    </div>
  );
}

function Th({ children }: { children: ReactNode }) {
  return (
    <th className="whitespace-nowrap px-5 py-4 text-xs font-bold uppercase tracking-wide">
      {children}
    </th>
  );
}

function Td({ children }: { children: ReactNode }) {
  return <td className="px-5 py-4">{children}</td>;
}
