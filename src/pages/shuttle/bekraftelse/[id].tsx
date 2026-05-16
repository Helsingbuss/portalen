import { GetServerSideProps } from "next";
import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type Props = {
  booking: any | null;
  ticket: any | null;
  error?: string;
};

function money(value: any) {
  return Number(value || 0).toLocaleString("sv-SE", {
    style: "currency",
    currency: "SEK",
    maximumFractionDigits: 0,
  });
}

function time(value?: string | null) {
  if (!value) return "—";
  return String(value).slice(0, 5);
}

function statusText(status?: string | null) {
  if (status === "paid") return "Betald";
  if (status === "unpaid") return "Ej betald";
  if (status === "pending") return "Väntar på betalning";
  if (status === "failed") return "Betalning misslyckades";
  if (status === "cancelled") return "Avbruten";
  return status || "—";
}

export default function ShuttleConfirmationPage({
  booking,
  ticket,
  error,
}: Props) {
  if (error || !booking) {
    return (
      <main className="min-h-screen bg-[#f5f4f0] p-6">
        <div className="mx-auto mt-20 max-w-2xl rounded-3xl bg-white p-8 shadow">
          <h1 className="text-2xl font-bold text-red-700">
            Bokningen hittades inte
          </h1>
          <p className="mt-3 text-gray-600">
            {error || "Vi kunde inte hitta bokningen."}
          </p>
        </div>
      </main>
    );
  }

  const departure = booking.shuttle_departures;
  const route = booking.shuttle_routes;
  const isPaid = booking.payment_status === "paid";

  return (
    <main className="min-h-screen bg-[#f5f4f0] p-6">
      <div className="mx-auto max-w-4xl pt-10">
        <div className="rounded-3xl bg-white p-8 shadow">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-[#194C66]/70">
                Airport Shuttle
              </p>

              <h1 className="mt-2 text-3xl font-bold text-[#194C66]">
                Bokning mottagen
              </h1>

              <p className="mt-2 text-gray-600">
                Bokningsnummer:{" "}
                <span className="font-semibold text-[#0f172a]">
                  {booking.booking_number}
                </span>
              </p>
            </div>

            <span
              className={`rounded-full px-4 py-2 text-sm font-semibold ${
                isPaid
                  ? "bg-green-100 text-green-700"
                  : "bg-amber-100 text-amber-700"
              }`}
            >
              {statusText(booking.payment_status)}
            </span>
          </div>

          {!isPaid && booking.payment_url && (
            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
              <h2 className="font-semibold text-amber-800">
                Betalning saknas
              </h2>
              <p className="mt-1 text-sm text-amber-700">
                Klicka nedan för att slutföra betalningen.
              </p>

              <a
                href={booking.payment_url}
                className="mt-4 inline-flex rounded-xl bg-[#194C66] px-5 py-3 font-semibold text-white"
              >
                Betala bokningen
              </a>
            </div>
          )}

          {isPaid && (
            <div className="mt-6 rounded-2xl border border-green-200 bg-green-50 p-5 text-green-800">
              Din betalning är registrerad. Biljetten är aktiv.
            </div>
          )}

          <div className="mt-8 grid gap-5 md:grid-cols-2">
            <InfoCard title="Resa">
              <Row label="Rutt" value={route?.name || "—"} />
              <Row label="Datum" value={departure?.departure_date || "—"} />
              <Row label="Tid" value={time(departure?.departure_time)} />
              <Row label="Från" value={booking.pickup_stop_name || "—"} />
              <Row label="Till" value={booking.dropoff_stop_name || route?.name || "—"} />
            </InfoCard>

            <InfoCard title="Kund">
              <Row label="Namn" value={booking.customer_name} />
              <Row label="E-post" value={booking.customer_email || "—"} />
              <Row label="Telefon" value={booking.customer_phone || "—"} />
              <Row label="Antal" value={`${booking.passengers_count || 1} personer`} />
              <Row label="Biljettyp" value={booking.ticket_type || "—"} />
            </InfoCard>

            <InfoCard title="Betalning">
              <Row label="Delsumma" value={money(booking.subtotal)} />
              <Row label="Rabatt" value={money(booking.discount_amount)} />
              <Row label="Totalt" value={money(booking.total_amount)} />
              <Row label="Status" value={statusText(booking.payment_status)} />
            </InfoCard>

            <InfoCard title="Biljett">
              <Row label="Biljettnummer" value={ticket?.ticket_number || "—"} />
              <Row label="Biljettstatus" value={ticket?.ticket_status || "—"} />
              <Row label="Check-in" value={ticket?.checked_in ? "Incheckad" : "Ej incheckad"} />
              <Row label="QR" value={ticket?.qr_code || "Skapas efter betalning"} />
            </InfoCard>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/"
              className="rounded-xl border bg-white px-5 py-3 font-semibold text-[#194C66]"
            >
              Till startsidan
            </Link>

            {booking.payment_url && !isPaid && (
              <a
                href={booking.payment_url}
                className="rounded-xl bg-[#194C66] px-5 py-3 font-semibold text-white"
              >
                Betala nu
              </a>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

function InfoCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border bg-[#f8fafc] p-5">
      <h2 className="mb-4 text-lg font-semibold text-[#194C66]">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex justify-between gap-4 border-b border-gray-200 pb-2 text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="text-right font-medium text-[#0f172a]">{value}</span>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  try {
    const id = String(context.params?.id || "");

    if (!id) {
      return {
        props: {
          booking: null,
          ticket: null,
          error: "Boknings-ID saknas.",
        },
      };
    }

    const { data: booking, error } = await supabaseAdmin
      .from("shuttle_bookings")
      .select(`
        *,
        shuttle_routes (
          id,
          name,
          route_code
        ),
        shuttle_departures (
          id,
          departure_date,
          departure_time,
          return_date,
          return_time
        )
      `)
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;

    if (!booking) {
      return {
        props: {
          booking: null,
          ticket: null,
          error: "Bokningen hittades inte.",
        },
      };
    }

    const { data: ticket } = await supabaseAdmin
      .from("shuttle_tickets")
      .select("*")
      .eq("booking_id", booking.id)
      .maybeSingle();

    return {
      props: {
        booking,
        ticket: ticket || null,
      },
    };
  } catch (e: any) {
    return {
      props: {
        booking: null,
        ticket: null,
        error: e?.message || "Serverfel.",
      },
    };
  }
};
