import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Image from "next/image";

type Passenger = {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  passenger_type?: string | null;
  date_of_birth?: string | null;
  special_requests?: string | null;
  seat_number?: string | null;
};

type Booking = {
  id: string;
  booking_number?: string | null;
  status?: string | null;
  payment_status?: string | null;
  customer_name?: string | null;
  customer_email?: string | null;
  customer_phone?: string | null;
  passengers_count?: number | null;
  total_amount?: number | null;
  currency?: string | null;
  notes?: string | null;
  sundra_trips?: {
    id: string;
    title?: string | null;
    slug?: string | null;
    destination?: string | null;
    image_url?: string | null;
    currency?: string | null;
  } | null;
  sundra_departures?: {
    id: string;
    departure_date?: string | null;
    departure_time?: string | null;
    return_date?: string | null;
    return_time?: string | null;
    price?: number | null;
  } | null;
  sundra_booking_passengers?: Passenger[];
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

function paymentLabel(status?: string | null) {
  switch (status) {
    case "paid":
      return "Betald";
    case "pending":
    case "pending_payment":
      return "Inväntar betalning";
    case "unpaid":
      return "Obetald";
    case "cancelled":
      return "Avbruten";
    default:
      return status || "—";
  }
}

function statusClass(status?: string | null) {
  switch (status) {
    case "paid":
      return "bg-green-100 text-green-700";
    case "pending":
    case "pending_payment":
    case "unpaid":
      return "bg-amber-100 text-amber-700";
    case "cancelled":
      return "bg-red-100 text-red-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

export default function MyBookingPage() {
  const router = useRouter();
  const { bookingNumber } = router.query;

  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!bookingNumber || typeof bookingNumber !== "string") return;
    loadBooking(bookingNumber);
  }, [bookingNumber]);

  async function loadBooking(number: string) {
    try {
      setLoading(true);
      setError("");

      const res = await fetch(
        `/api/public/sundra/bookings/by-number/${encodeURIComponent(number)}`
      );

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Kunde inte hämta bokningen.");
      }

      setBooking(json.booking);
    } catch (e: any) {
      setError(e?.message || "Något gick fel.");
    } finally {
      setLoading(false);
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

  if (error || !booking) {
    return (
      <div className="min-h-screen bg-[#f5f4f0] p-8">
        <div className="mx-auto max-w-6xl rounded-3xl bg-white p-6 shadow">
          <h1 className="text-xl font-semibold text-red-700">
            {error || "Bokningen hittades inte."}
          </h1>

          <button
            onClick={() => router.push("/vara-resor")}
            className="mt-5 rounded-full bg-[#194C66] px-5 py-3 text-sm font-semibold text-white"
          >
            Tillbaka till resor
          </button>
        </div>
      </div>
    );
  }

  const trip = booking.sundra_trips;
  const departure = booking.sundra_departures;
  const passengers = booking.sundra_booking_passengers || [];
  const currency = booking.currency || trip?.currency || "SEK";
  const ticketUrl = `/api/public/sundra/bookings/${booking.id}/ticket`;

  return (
    <div className="min-h-screen bg-[#f5f4f0] text-[#0f172a]">
      <main className="mx-auto max-w-6xl px-4 py-8">
        <section className="overflow-hidden rounded-3xl bg-white shadow">
          <div className="grid lg:grid-cols-[380px_1fr]">
            <div className="relative h-72 bg-[#194C66] lg:h-auto">
              {trip?.image_url ? (
                <Image
                  src={trip.image_url}
                  alt={trip.title || "Sundra resa"}
                  fill
                  className="object-cover"
                  priority
                />
              ) : (
                <div className="flex h-full items-center justify-center text-white">
                  Sundra by Helsingbuss
                </div>
              )}
            </div>

            <div className="p-6 lg:p-8">
              <div
                className={`inline-flex rounded-full px-4 py-2 text-sm font-semibold ${statusClass(
                  booking.payment_status
                )}`}
              >
                {paymentLabel(booking.payment_status)}
              </div>

              <h1 className="mt-4 text-3xl font-bold leading-tight text-[#194C66]">
                Min bokning
              </h1>

              <p className="mt-2 text-gray-600">
                Bokningsnummer:{" "}
                <strong>{booking.booking_number || "—"}</strong>
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Info label="Resa" value={trip?.title} />
                <Info label="Destination" value={trip?.destination} />
                <Info
                  label="Avresa"
                  value={`${fmtDate(departure?.departure_date)} kl. ${fmtTime(
                    departure?.departure_time
                  )}`}
                />
                <Info
                  label="Retur"
                  value={`${fmtDate(departure?.return_date)} kl. ${fmtTime(
                    departure?.return_time
                  )}`}
                />
              </div>
            </div>
          </div>
        </section>

        <div className="mt-8 grid gap-7 lg:grid-cols-[1fr_360px]">
          <section className="space-y-6">
            <Card title="Reseinformation">
              <div className="grid gap-4 md:grid-cols-2">
                <Info label="Resa" value={trip?.title} />
                <Info label="Destination" value={trip?.destination} />
                <Info
                  label="Avresedatum"
                  value={fmtDate(departure?.departure_date)}
                />
                <Info
                  label="Avresetid"
                  value={fmtTime(departure?.departure_time)}
                />
                <Info
                  label="Returdatum"
                  value={fmtDate(departure?.return_date)}
                />
                <Info label="Returtid" value={fmtTime(departure?.return_time)} />
              </div>
            </Card>

            <Card title="Beställare">
              <div className="grid gap-4 md:grid-cols-2">
                <Info label="Namn" value={booking.customer_name} />
                <Info label="E-post" value={booking.customer_email} />
                <Info label="Telefon" value={booking.customer_phone} />
                <Info
                  label="Betalstatus"
                  value={paymentLabel(booking.payment_status)}
                />
              </div>
            </Card>

            <Card title="Resenärer">
              {passengers.length === 0 ? (
                <div className="rounded-2xl border bg-[#f8fafc] p-4 text-sm text-gray-500">
                  Inga resenärer registrerade.
                </div>
              ) : (
                <div className="space-y-3">
                  {passengers.map((p, index) => (
                    <div
                      key={p.id || index}
                      className="rounded-2xl border bg-[#f8fafc] p-4"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <div className="font-semibold">
                            {p.first_name || "—"} {p.last_name || ""}
                          </div>

                          <div className="mt-1 text-sm text-gray-500">
                            {p.passenger_type || "Vuxen"}
                            {p.seat_number ? ` • Plats ${p.seat_number}` : ""}
                          </div>
                        </div>

                        <div className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#194C66]">
                          Resenär {index + 1}
                        </div>
                      </div>

                      {p.special_requests && (
                        <div className="mt-3 text-sm text-gray-600">
                          Önskemål: {p.special_requests}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </section>

          <aside className="h-fit rounded-3xl bg-white p-6 shadow sticky top-6">
            <h2 className="text-xl font-bold text-[#194C66]">
              Din biljett
            </h2>

            <div className="mt-4 space-y-3 text-sm">
              <Summary
                label="Bokning"
                value={booking.booking_number || "—"}
              />
              <Summary
                label="Resenärer"
                value={`${booking.passengers_count || passengers.length || 0} st`}
              />
              <Summary
                label="Status"
                value={paymentLabel(booking.payment_status)}
              />
              <Summary
                label="Totalt"
                value={money(booking.total_amount, currency)}
              />
            </div>

            <div className="mt-5 space-y-3">
              <a
                href={ticketUrl}
                target="_blank"
                rel="noreferrer"
                className="block w-full rounded-full bg-[#194C66] px-5 py-3 text-center text-sm font-semibold text-white"
              >
                Ladda ner biljett
              </a>

              <button
                onClick={() => window.print()}
                className="w-full rounded-full border bg-white px-5 py-3 text-sm font-semibold text-[#194C66]"
              >
                Skriv ut sidan
              </button>
            </div>

            <div className="mt-5 rounded-2xl bg-[#eef5f9] p-4 text-sm leading-relaxed text-[#194C66]">
              Spara gärna denna sida. Här kan du se bokningen, ladda ner biljett
              och senare hantera tillval.
            </div>
          </aside>
        </div>
      </main>
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
      <h2 className="text-xl font-bold text-[#194C66]">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
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

function Summary({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex justify-between gap-4 border-b pb-2">
      <span className="text-gray-500">{label}</span>
      <span className="text-right font-semibold">{value || "—"}</span>
    </div>
  );
}
