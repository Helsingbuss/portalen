// src/components/bookings/BookingConfirmation.tsx
import Image from "next/image";

type Booking = {
  id: string;
  booking_number: string | null;
  status: string | null;

  contact_person: string | null;
  customer_address?: string | null;
  customer_email: string | null;
  contact_phone: string | null;

  departure_place: string | null;
  destination: string | null;
  departure_date: string | null;
  departure_time: string | null;
  end_time?: string | null;
  on_site_minutes?: number | null;
  stopover_places?: string | null;

  return_departure?: string | null;
  return_destination?: string | null;
  return_date?: string | null;
  return_time?: string | null;
  return_end_time?: string | null;
  return_on_site_minutes?: number | null;

  passengers?: number | null;
  notes?: string | null;

  amount_ex_vat?: number | null;
  vat_amount?: number | null;
  total_amount?: number | null;
  total_price?: number | null;
};

const LINE_HEIGHT = 1.5;

function money(n?: number | null) {
  if (n == null) return "—";
  return n.toLocaleString("sv-SE", {
    style: "currency",
    currency: "SEK",
    maximumFractionDigits: 0,
  });
}

function v(x: any, fallback = "—") {
  if (x === null || x === undefined || x === "") return fallback;
  return String(x);
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

  const bookingNo = v(booking.booking_number, "—");

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
            onsite: subMinutes(
              booking.return_time ?? undefined,
              booking.return_on_site_minutes ?? undefined
            ),
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
    <div className="min-h-screen bg-[#eef2f4] p-4 lg:p-6">
      <div className="mx-auto grid min-h-[calc(100vh-48px)] max-w-[1600px] grid-cols-1 gap-4 lg:grid-cols-[420px_minmax(0,1fr)_520px]">
        <BookingLeftPanel />

        <main className="min-h-0 overflow-hidden">
          <div className="flex h-full flex-col overflow-hidden rounded-3xl border border-white/70 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
            <div className="relative overflow-hidden px-6 pb-6 pt-7 lg:px-8">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-br from-emerald-500/10 via-[#f0fdf7] to-white" />

              <div className="relative">
                <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-3 py-1 text-[12px] font-semibold text-white shadow-sm">
                      Bokning bekräftad
                    </div>

                    <h1 className="mt-4 text-3xl font-semibold leading-tight tracking-tight text-[#0f172a] lg:text-[34px]">
                      Bokningsbekräftelse
                    </h1>

                    <p className="mt-2 text-sm text-slate-600">
                      Bokning{" "}
                      <span className="font-semibold text-[#194C66]">
                        {bookingNo}
                      </span>{" "}
                      är registrerad hos Helsingbuss.
                    </p>
                  </div>

                  <div className="shrink-0 rounded-2xl border border-white bg-white/80 px-5 py-4 shadow-sm">
                    <Image
                      src="/mork_logo.png"
                      alt="Helsingbuss"
                      width={250}
                      height={48}
                      priority
                    />
                  </div>
                </div>

                <div
                  className="mt-6 max-w-4xl rounded-2xl border border-emerald-100 bg-white/85 px-5 py-4 text-[14px] text-[#0f172a]/80 shadow-sm"
                  style={{ lineHeight: LINE_HEIGHT }}
                >
                  <p>
                    Tack! Din bokning är registrerad. Nedan ser du tider,
                    adresser och när bussen är på plats.
                  </p>

                  <p className="mt-3">
                    Hör av dig om något behöver justeras. Vi ser fram emot att
                    köra er!
                  </p>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 pb-40 lg:px-8">
              <div className="mb-4 flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-[#0f172a]">
                    Resedetaljer
                  </h2>
                  <p className="text-sm text-slate-500">
                    Kontrollera datum, tider, platser och antal resenärer.
                  </p>
                </div>

                <div className="hidden items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-xs font-medium text-emerald-700 sm:flex">
                  {roundTrip ? "Tur & retur" : "Enkelresa"}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {trips.map((trip, idx) => (
                  <div
                    key={idx}
                    className="rounded-2xl border border-[#e2e8f0] bg-[#f8fafc] p-5"
                  >
                    <div className="mb-4 flex items-center gap-2 text-[#0f172a]">
                      <Image
                        src="/maps_pin.png"
                        alt="Pin"
                        width={18}
                        height={18}
                      />
                      <span className="font-semibold">{trip.title}</span>
                    </div>

                    <div className="space-y-2 text-[14px] leading-[1.5] text-[#0f172a]">
                      <InfoLine label="Datum" value={trip.date} />
                      <div>
                        <span className="font-semibold">Start:</span>{" "}
                        {v(trip.start)}
                        {trip.onsite && (
                          <span className="text-[#0f172a]/70">
                            {" "}
                            (bussen på plats {trip.onsite})
                          </span>
                        )}
                      </div>
                      <InfoLine label="Slut planerad" value={trip.end} />
                      <InfoLine label="Från" value={trip.from} />
                      <InfoLine label="Till" value={trip.to} />
                      {!!trip.via && <InfoLine label="Via" value={trip.via} />}
                      <InfoLine label="Passagerare" value={trip.pax ?? "—"} />

                      <div className="pt-2">
                        <span className="font-semibold">
                          Övrig information:
                        </span>{" "}
                        <span className="whitespace-pre-wrap">
                          {trip.extra}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div
                className="mt-6 grid gap-4 lg:grid-cols-2 text-[14px]"
                style={{ lineHeight: LINE_HEIGHT }}
              >
                <div className="rounded-2xl border border-[#e2e8f0] bg-[#f8fafc] p-5 text-[#0f172a]/80">
                  <div className="mb-2 text-sm font-semibold text-[#0f172a]">
                    Bokningen är säkrad
                  </div>
                  <p>
                    Bekräftelsen avser ovan angivna uppgifter. Eventuella
                    ändringar bekräftas skriftligt av Helsingbuss.
                  </p>
                </div>

                <div className="rounded-2xl border border-[#e2e8f0] bg-[#f8fafc] p-5 text-[#0f172a]/80">
                  <div className="mb-2 text-sm font-semibold text-[#0f172a]">
                    Inför resan
                  </div>
                  <p>
                    Se gärna över tider, platser och kontaktuppgifter i god tid
                    före avresa.
                  </p>
                </div>
              </div>

              <div
                className="mt-6 rounded-2xl border border-[#e2e8f0] bg-white p-5 text-[14px] text-[#0f172a]/80"
                style={{ lineHeight: LINE_HEIGHT }}
              >
                <p>
                  Vid ändringar eller frågor – kontakta oss.{" "}
                  <strong>Öppettider: vardagar 08:00–17:00.</strong>
                </p>
                <p className="mt-3">
                  För akuta ärenden närmare än två arbetsdagar:{" "}
                  <strong>jour 010-777 21 58</strong>.
                </p>

                <p className="mt-4 rounded-xl bg-emerald-600 px-4 py-3 text-[12px] font-semibold uppercase tracking-wide text-white">
                  Bokningen är bekräftad – vi ser fram emot att köra er.
                </p>
              </div>

              <div className="mt-6 rounded-2xl border border-[#e2e8f0] bg-[#f8fafc] p-4">
                <div className="grid grid-cols-1 gap-4 text-[13px] text-[#0f172a] sm:grid-cols-4">
                  <div>
                    <div>Helsingbuss</div>
                    <div>Hofverbergsgatan 2B</div>
                    <div>254 43 Helsingborg</div>
                    <div>helsingbuss.se</div>
                  </div>
                  <div>
                    <div>Tel. +46 (0)10-405 38 38</div>
                    <div>Jour. +46 (0)10-777 21 58</div>
                    <div>info@helsingbuss.se</div>
                  </div>
                  <div>
                    <div>Bankgiro: 763-4157</div>
                    <div>Org.nr: 890101-3931</div>
                    <div>VAT nr: SE890101393101</div>
                  </div>
                  <div>
                    <div>Swedbank</div>
                    <div>IBAN: SE09 8000 0816 9581 4754 3998</div>
                    <div>Swift/BIC: SWEDSESS</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>

        <aside className="min-h-0 overflow-hidden">
          <div className="flex h-full flex-col overflow-hidden rounded-3xl border border-white/70 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
            <div className="bg-gradient-to-br from-[#194C66] to-[#0f3347] px-6 py-6 text-white">
              <div className="text-xs uppercase tracking-[0.18em] text-white/60">
                Bokningsöversikt
              </div>
              <h2 className="mt-2 text-2xl font-semibold">
                {v(booking.contact_person, "Kund")}
              </h2>
              <p className="mt-1 text-sm text-white/70">
                Här ser ni status, kunduppgifter och kostnad.
              </p>
            </div>

            <div className="px-6 pt-6">
              <div className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700">
                Bokningsuppgifter
              </div>

              <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                <div className="text-sm font-semibold text-emerald-700">
                  Status
                </div>
                <div className="mt-2 text-2xl font-semibold capitalize text-emerald-700">
                  {v(booking.status)}
                </div>
                <p className="mt-2 text-sm text-emerald-700/80">
                  Bokningen är registrerad.
                </p>
              </div>

              <div className="mt-5 rounded-2xl border border-[#e2e8f0] bg-[#f8fafc] p-4">
                <div className="font-semibold text-[#0f172a]">Pris</div>
                <dl className="mt-3 grid grid-cols-[auto,1fr] gap-x-6 gap-y-1 text-[14px] leading-tight text-[#0f172a]">
                  <DT>Summa exkl. moms:</DT>
                  <DD>{money(booking.amount_ex_vat)}</DD>

                  <DT>Moms:</DT>
                  <DD>{money(booking.vat_amount)}</DD>

                  <DT>Totalsumma:</DT>
                  <DD>{money(booking.total_amount ?? booking.total_price)}</DD>
                </dl>
              </div>

              <div className="mt-5 rounded-2xl border border-[#e2e8f0] bg-white p-4">
                <div className="font-semibold text-[#0f172a]">Kund</div>
                <dl className="mt-3 grid grid-cols-[auto,1fr] gap-x-6 gap-y-1 text-[14px] leading-tight text-[#0f172a]">
                  <DT>Beställare:</DT>
                  <DD>{v(booking.contact_person)}</DD>

                  <DT>Adress:</DT>
                  <DD>{v(booking.customer_address)}</DD>

                  <DT>Telefon:</DT>
                  <DD>{v(booking.contact_phone)}</DD>

                  <DT>E-post:</DT>
                  <DD>{v(booking.customer_email)}</DD>
                </dl>
              </div>
            </div>

            <div className="mt-auto px-6 pb-6 pt-5">
              <div className="rounded-2xl bg-[#eef5f9] px-4 py-4 text-sm text-[#194C66]">
                <div className="font-semibold">Behöver ni hjälp?</div>
                <p className="mt-1 leading-relaxed">
                  Kontakta kundteamet om något behöver justeras inför resan.
                </p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function BookingLeftPanel() {
  const steps = [
    "Förfrågan mottagen",
    "Bokning skapad",
    "Bokning bekräftad",
    "Resan genomförs",
  ];

  const benefits = [
    "Bokningen är registrerad",
    "Kapacitet är säkrad",
    "Tydlig resplan för alla parter",
    "Kundteamet finns nära till hands",
  ];

  return (
    <aside className="flex h-full flex-col overflow-hidden rounded-3xl border border-white/70 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
      <div className="bg-gradient-to-br from-emerald-600 to-[#065f46] px-5 py-6 text-white">
        <div className="text-xs uppercase tracking-[0.18em] text-white/60">
          Helsingbuss
        </div>
        <h2 className="mt-2 text-xl font-semibold">Bokningen är bekräftad</h2>
        <p className="mt-2 text-sm leading-relaxed text-white/75">
          Resan är registrerad och planeras enligt bekräftelsen.
        </p>
      </div>

      <div className="p-5">
        <div className="text-sm font-semibold text-[#0f172a]">Processen</div>

        <div className="mt-4 space-y-4">
          {steps.map((step, index) => (
            <div key={step} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                    index <= 2
                      ? "bg-emerald-600 text-white"
                      : "bg-emerald-50 text-emerald-700"
                  }`}
                >
                  {index + 1}
                </div>
                {index < steps.length - 1 && (
                  <div className="mt-1 h-8 w-px bg-emerald-100" />
                )}
              </div>

              <div className="pt-1">
                <div className="text-sm font-medium text-[#0f172a]">
                  {step}
                </div>
                {index === 2 && (
                  <div className="mt-1 text-xs text-slate-500">Just nu</div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-2xl border border-[#e2e8f0] bg-[#f8fafc] p-4">
          <div className="text-sm font-semibold text-[#0f172a]">
            Inför resan
          </div>

          <div className="mt-3 space-y-2">
            {benefits.map((item) => (
              <div key={item} className="flex gap-2 text-sm text-slate-600">
                <span className="text-emerald-600">✓</span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-auto p-5">
        <div className="rounded-2xl bg-emerald-50 px-4 py-4 text-sm text-emerald-700">
          <div className="font-semibold">Vi ser fram emot resan</div>
          <p className="mt-1 leading-relaxed">
            Hör av er om något behöver uppdateras innan avresa.
          </p>
        </div>
      </div>
    </aside>
  );
}

function InfoLine({ label, value }: { label: string; value: any }) {
  return (
    <div>
      <span className="font-semibold">{label}:</span> {v(value)}
    </div>
  );
}

function DT({ children }: { children: React.ReactNode }) {
  return (
    <dt className="font-semibold text-[#0f172a]/70 whitespace-nowrap">
      {children}
    </dt>
  );
}

function DD({ children }: { children: React.ReactNode }) {
  return <dd className="break-words text-[#0f172a]">{children}</dd>;
}
