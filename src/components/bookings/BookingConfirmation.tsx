// src/components/bookings/BookingConfirmation.tsx
import Image from "next/image";

type Booking = {
  id: string;
  booking_number: string | null;
  status: string | null;

  // kontakt
  contact_person: string | null;
  customer_address?: string | null;
  customer_email: string | null;
  contact_phone: string | null;

  // utresa
  departure_place: string | null;
  destination: string | null;
  departure_date: string | null; // YYYY-MM-DD
  departure_time: string | null; // HH:MM
  end_time?: string | null;      // HH:MM (valfritt)
  on_site_minutes?: number | null;
  stopover_places?: string | null;

  // retur
  return_departure?: string | null;
  return_destination?: string | null;
  return_date?: string | null;
  return_time?: string | null;
  return_end_time?: string | null;
  return_on_site_minutes?: number | null;

  passengers?: number | null;
  notes?: string | null;

  // pris (om du vill visa)
  amount_ex_vat?: number | null;
  vat_amount?: number | null;
  total_amount?: number | null;
};

function money(n?: number | null) {
  if (n == null) return "—";
  return n.toLocaleString("sv-SE", { style: "currency", currency: "SEK" });
}

function subMinutes(hhmm?: string | null, mins?: number | null) {
  if (!hhmm || !/^\d{2}:\d{2}$/.test(hhmm) || !mins || mins <= 0) return null;
  const [H, M] = hhmm.split(":").map((s) => parseInt(s, 10));
  const d = new Date(2000, 0, 1, H, M, 0);
  d.setMinutes(d.getMinutes() - mins);
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

export default function BookingConfirmation({ booking }: { booking: Booking }) {
  const roundTrip =
    Boolean(booking?.return_date) ||
    Boolean(booking?.return_time) ||
    Boolean(booking?.return_departure) ||
    Boolean(booking?.return_destination);

  const trips = [
    {
      title: roundTrip ? "Utresa" : "Bokad körning",
      date: booking.departure_date,
      start: booking.departure_time,
      end: booking.end_time,
      onsite: subMinutes(booking.departure_time, booking.on_site_minutes),
      from: booking.departure_place,
      to: booking.destination,
      via: booking.stopover_places || "",
      pax: booking.passengers,
      extra: booking.notes || "Ingen information.",
    },
    ...(roundTrip
      ? [
          {
            title: "Återresa",
            date: booking.return_date,
            start: booking.return_time,
            end: booking.return_end_time,
            onsite: subMinutes(booking.return_time ?? undefined, booking.return_on_site_minutes ?? undefined),
            from: booking.return_departure,
            to: booking.return_destination,
            via: "",
            pax: booking.passengers,
            extra: booking.notes || "Ingen information.",
          },
        ]
      : []),
  ];

  return (
    <div className="min-h-screen bg-[#f5f4f0] py-6">
      <div className="mx-auto w-full max-w-4xl bg-white rounded-lg shadow px-6 py-6">
        {/* Header-rad */}
        <div className="flex items-start justify-between">
          <div className="flex items-center">
            <Image src="/mork_logo.png" alt="Helsingbuss" width={360} height={64} priority />
          </div>
          <div className="pt-1 text-right">
            <span className="inline-block rounded-full px-3 py-1 text-sm bg-[#e5eef3] text-[#194C66]">
              {roundTrip ? "Tur & retur" : "Enkelresa"}
            </span>
          </div>
        </div>

        {/* Titel */}
        <h1 className="mt-2 text-2xl font-semibold text-[#0f172a]">
          Bokningsbekräftelse {booking.booking_number || "—"}
        </h1>

        {/* Övre kort – ev totals + kund */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* (valfritt) Pris-summering om satt */}
          <div className="border rounded-lg p-4">
            <div className="flex items-baseline gap-2">
              <span className="text-sm text-[#0f172a]/70 font-semibold">Status</span>
              <span className="text-[#0f172a] capitalize">{booking.status || "—"}</span>
            </div>

            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-sm text-[#0f172a]/70 font-semibold">Summa exkl. moms</span>
              <span className="text-[#0f172a]">{money(booking.amount_ex_vat)}</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-sm text-[#0f172a]/70 font-semibold">Moms</span>
              <span className="text-[#0f172a]">{money(booking.vat_amount)}</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-sm text-[#0f172a]/70 font-semibold">Totalsumma</span>
              <span className="text-[#0f172a]">{money(booking.total_amount)}</span>
            </div>
          </div>

          {/* Kundkort */}
          <div className="border rounded-lg p-4">
            <div className="grid grid-cols-[110px_1fr] gap-x-2 text-sm">
              <div className="text-[#0f172a]/70 font-semibold">Beställare</div>
              <div className="text-[#0f172a]">{booking.contact_person || "—"}</div>

              <div className="text-[#0f172a]/70 font-semibold">Adress</div>
              <div className="text-[#0f172a]">{booking.customer_address || "—"}</div>

              <div className="text-[#0f172a]/70 font-semibold">Telefon</div>
              <div className="text-[#0f172a]">{booking.contact_phone || "—"}</div>

              <div className="text-[#0f172a]/70 font-semibold">E-post</div>
              <div className="text-[#0f172a] break-all">{booking.customer_email || "—"}</div>
            </div>
          </div>
        </div>

        {/* Intro */}
        <div className="mt-5 text-[15px] leading-relaxed text-[#0f172a]/80">
          <p>
            Tack! Din bokning är registrerad. Nedan ser du tider, adresser och när bussen är på plats.
            Hör av dig om något behöver justeras.
          </p>
        </div>

        {/* Körningar */}
        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          {trips.map((trip, idx) => (
            <div key={idx}>
              <div className="flex items-center gap-2 text-[#0f172a] mb-2">
                <Image src="/maps_pin.png" alt="Pin" width={18} height={18} />
                <span className="font-semibold">{trip.title}</span>
              </div>

              <div className="border rounded-lg p-3 text-[14px] text-[#0f172a] leading-[1.5]">
                <div>
                  <span className="font-semibold">Datum:</span> {trip.date || "—"}
                </div>
                <div>
                  <span className="font-semibold">Start:</span> {trip.start || "—"}
                  {trip.onsite && (
                    <span className="text-[#0f172a]/70"> (bussen på plats {trip.onsite})</span>
                  )}
                </div>
                <div>
                  <span className="font-semibold">Slut (planerad):</span> {trip.end || "—"}
                </div>
                <div className="mt-1">
                  <span className="font-semibold">Från:</span> {trip.from || "—"}
                </div>
                <div>
                  <span className="font-semibold">Till:</span> {trip.to || "—"}
                </div>
                {!!trip.via && (
                  <div>
                    <span className="font-semibold">Via:</span> {trip.via}
                  </div>
                )}
                <div>
                  <span className="font-semibold">Passagerare:</span> {trip.pax ?? "—"}
                </div>
                <div className="mt-2">
                  <span className="font-semibold">Övrig information:</span>{" "}
                  <span className="whitespace-pre-wrap">{trip.extra}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-7 text-[13px] text-[#0f172a]/70 leading-relaxed">
          <p>
            Vid ändringar eller frågor – kontakta oss.{" "}
            <strong>Öppettider: vardagar 08:00–17:00.</strong> För akuta ärenden närmare än två
            arbetsdagar: <strong>jour 010-777 21 58</strong>.
          </p>
        </div>
      </div>
    </div>
  );
}
