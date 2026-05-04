// src/components/offers/OfferGodkand.tsx
import Image from "next/image";
import StatusBadge from "@/components/StatusBadge";
import { useRouter } from "next/router";

type OfferGodkandProps = {
  offer: any;
};

const LINE_HEIGHT = 1.5;

function v(x: any, fallback = "—") {
  if (x === null || x === undefined || x === "") return fallback;
  return String(x);
}

function tidyTime(t?: string | null) {
  if (!t) return "—";
  const s = String(t);
  if (s.includes(":")) return s.slice(0, 5);
  if (s.length >= 4) return `${s.slice(0, 2)}:${s.slice(2, 4)}`;
  return s;
}

function fmtOnSite(value: any) {
  if (value === null || value === undefined || value === "") return "—";
  const n = Number(value);
  if (Number.isFinite(n)) return `${Math.max(0, n)} min före`;
  return String(value);
}

export default function OfferGodkand({ offer }: OfferGodkandProps) {
  const router = useRouter();
  const bookingId = typeof router.query?.bk === "string" ? router.query.bk : "";

  const hasJsonLegs =
    (Array.isArray(offer?.legs) && offer.legs.length > 1) ||
    (Array.isArray(offer?.trip_legs) && offer.trip_legs.length > 1);

  const roundTrip =
    Boolean(offer?.round_trip) ||
    Boolean(
      offer?.return_date ??
        offer?.return_time ??
        offer?.return_departure ??
        offer?.return_destination
    ) ||
    hasJsonLegs;

  const withinSweden = (offer?.trip_type || "sverige") !== "utrikes";
  const offerNo = v(offer?.offer_number, "HB25XXX");

  const firstLeg = {
    title: withinSweden ? "Bussresa inom Sverige" : "Bussresa utomlands",
    date: v(offer?.departure_date),
    time: tidyTime(offer?.departure_time),
    from: v(offer?.departure_place),
    to: v(offer?.destination),
    pax: v(offer?.passengers),
    extra: v(offer?.notes, "Ingen information."),
    onSite: fmtOnSite(offer?.on_site_time ?? offer?.on_site_minutes),
    endTime: tidyTime(offer?.end_time),
    driver: v(offer?.driver_name, ""),
    driverPhone: v(offer?.driver_phone, ""),
    vehicleReg: v(offer?.vehicle_reg, ""),
    vehicleModel: v(offer?.vehicle_model, ""),
  };

  const secondLeg = roundTrip
    ? {
        title: withinSweden ? "Bussresa inom Sverige" : "Bussresa utomlands",
        date: v(offer?.return_date),
        time: tidyTime(offer?.return_time),
        from: v(offer?.destination),
        to: v(offer?.departure_place),
        pax: v(offer?.passengers),
        extra: v(offer?.notes, "Ingen information."),
        onSite: fmtOnSite(
          offer?.return_on_site_time ??
            offer?.return_on_site_minutes ??
            offer?.on_site_time
        ),
        endTime: tidyTime(offer?.return_end_time ?? offer?.end_time),
        driver: v(offer?.return_driver_name || offer?.driver_name, ""),
        driverPhone: v(offer?.return_driver_phone || offer?.driver_phone, ""),
        vehicleReg: v(offer?.return_vehicle_reg || offer?.vehicle_reg, ""),
        vehicleModel: v(
          offer?.return_vehicle_model || offer?.vehicle_model,
          ""
        ),
      }
    : null;

  const rawLegs = (offer?.legs ?? offer?.trip_legs) as any;

  let trips: {
    title: string;
    date: string;
    time: string;
    from: string;
    to: string;
    pax: string;
    extra: string;
    onSite: string;
    endTime: string;
    driver: string;
    driverPhone: string;
    vehicleReg: string;
    vehicleModel: string;
  }[];

  if (Array.isArray(rawLegs) && rawLegs.length > 0) {
    trips = (rawLegs as any[]).map((leg, idx) => {
      const isFirst = idx === 0;
      const baseDate = isFirst
        ? offer?.departure_date
        : offer?.return_date ?? offer?.departure_date;
      const baseFrom = isFirst ? offer?.departure_place : offer?.destination;
      const baseTo = isFirst ? offer?.destination : offer?.departure_place;

      return {
        title: withinSweden ? "Bussresa inom Sverige" : "Bussresa utomlands",
        date: v(leg.date ?? leg.departure_date ?? baseDate),
        time: tidyTime(
          leg.time ??
            leg.start ??
            (isFirst ? offer?.departure_time : offer?.return_time)
        ),
        from: v(leg.from ?? leg.departure_place ?? baseFrom),
        to: v(leg.to ?? leg.destination ?? baseTo),
        pax: v(leg.pax ?? offer?.passengers),
        extra: v(leg.extra ?? offer?.notes, "Ingen information."),
        onSite: fmtOnSite(
          leg.on_site ??
            leg.on_site_minutes ??
            (isFirst
              ? offer?.on_site_time ?? offer?.on_site_minutes
              : offer?.return_on_site_time ??
                offer?.return_on_site_minutes ??
                offer?.on_site_time)
        ),
        endTime: tidyTime(
          leg.end ??
            leg.end_time ??
            (isFirst
              ? offer?.end_time
              : offer?.return_end_time ?? offer?.end_time)
        ),
        driver: v(
          leg.driver_name ??
            (isFirst
              ? offer?.driver_name
              : offer?.return_driver_name ?? offer?.driver_name),
          ""
        ),
        driverPhone: v(
          leg.driver_phone ??
            (isFirst
              ? offer?.driver_phone
              : offer?.return_driver_phone ?? offer?.driver_phone),
          ""
        ),
        vehicleReg: v(
          leg.vehicle_reg ??
            (isFirst
              ? offer?.vehicle_reg
              : offer?.return_vehicle_reg ?? offer?.vehicle_reg),
          ""
        ),
        vehicleModel: v(
          leg.vehicle_model ??
            (isFirst
              ? offer?.vehicle_model
              : offer?.return_vehicle_model ?? offer?.vehicle_model),
          ""
        ),
      };
    });
  } else {
    trips = secondLeg ? [firstLeg, secondLeg] : [firstLeg];
  }

  return (
    <div className="min-h-screen bg-[#eef2f4] p-4 lg:p-6">
      <div className="mx-auto grid min-h-[calc(100vh-48px)] max-w-[1600px] grid-cols-1 gap-4 lg:grid-cols-[420px_minmax(0,1fr)_520px]">
        <ApprovedLeftPanel />

        <main className="min-h-0 overflow-hidden">
          <div className="flex h-full flex-col overflow-hidden rounded-3xl border border-white/70 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
            <div className="relative overflow-hidden px-6 pb-6 pt-7 lg:px-8">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-br from-emerald-500/10 via-[#f0fdf7] to-white" />

              <div className="relative">
                <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-3 py-1 text-[12px] font-semibold text-white shadow-sm">
                      Offert godkänd
                    </div>

                    <h1 className="mt-4 text-3xl font-semibold leading-tight tracking-tight text-[#0f172a] lg:text-[34px]">
                      Bokningen är klar
                    </h1>

                    <p className="mt-2 text-sm text-slate-600">
                      Offert{" "}
                      <span className="font-semibold text-[#194C66]">
                        {offerNo}
                      </span>{" "}
                      är godkänd och går vidare till bokning.
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

                {bookingId && (
                  <div className="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    Bokningen är skapad. Öppna i admin:{" "}
                    <a
                      className="font-semibold underline"
                      href={`/admin/bookings/${encodeURIComponent(bookingId)}`}
                    >
                      {bookingId}
                    </a>
                  </div>
                )}

                <div
                  className="mt-6 max-w-4xl rounded-2xl border border-emerald-100 bg-white/85 px-5 py-4 text-[14px] text-[#0f172a]/80 shadow-sm"
                  style={{ lineHeight: LINE_HEIGHT }}
                >
                  <p>
                    Tack! Offerten är godkänd och vi har registrerat ärendet.
                    Nedan ser ni resans uppgifter och den planering som ligger
                    till grund för bokningen.
                  </p>

                  <p className="mt-3">
                    Om något behöver justeras innan resan kontaktar ni vårt
                    kundteam, så hjälper vi er vidare.
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
                      <span className="font-semibold">
                        {idx === 0
                          ? roundTrip
                            ? "Utresa"
                            : trip.title
                          : "Återresa"}
                      </span>
                    </div>

                    <div className="space-y-2 text-[14px] leading-[1.5] text-[#0f172a]">
                      <InfoLine label="Avgång" value={`${trip.date} kl ${trip.time}`} />
                      <InfoLine label="Från" value={trip.from} />
                      <InfoLine label="Till" value={trip.to} />
                      <InfoLine label="Antal passagerare" value={trip.pax} />
                      <InfoLine label="På plats" value={trip.onSite} />
                      <InfoLine label="Sluttid" value={trip.endTime} />

                      {(trip.driver || trip.driverPhone) && (
                        <InfoLine
                          label="Chaufför"
                          value={`${trip.driver || "—"}${
                            trip.driverPhone ? `, ${trip.driverPhone}` : ""
                          }`}
                        />
                      )}

                      {(trip.vehicleReg || trip.vehicleModel) && (
                        <InfoLine
                          label="Fordon"
                          value={
                            [trip.vehicleReg, trip.vehicleModel]
                              .filter(Boolean)
                              .join(" – ") || "—"
                          }
                        />
                      )}

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
                    Nästa steg
                  </div>
                  <p>
                    Helsingbuss går vidare med bokningen och säkerställer
                    planering, kapacitet och interna uppgifter.
                  </p>
                </div>

                <div className="rounded-2xl border border-[#e2e8f0] bg-[#f8fafc] p-5 text-[#0f172a]/80">
                  <div className="mb-2 text-sm font-semibold text-[#0f172a]">
                    Bekräftelse
                  </div>
                  <p>
                    Slutlig bokningsbekräftelse visas eller skickas när
                    bokningen är färdigställd i systemet.
                  </p>
                </div>
              </div>

              <div
                className="mt-6 rounded-2xl border border-[#e2e8f0] bg-white p-5 text-[14px] text-[#0f172a]/80"
                style={{ lineHeight: LINE_HEIGHT }}
              >
                <p>
                  Vid frågor eller ändringar är ni välkomna att kontakta oss.
                  Våra öppettider är vardagar kl. 08:00–17:00.
                </p>

                <p className="mt-3">
                  För akuta ärenden eller bokningar med kortare varsel än två
                  arbetsdagar, ring jour: <strong>010–777 21 58</strong>.
                </p>

                <p className="mt-4 rounded-xl bg-emerald-600 px-4 py-3 text-[12px] font-semibold uppercase tracking-wide text-white">
                  Offerten är godkänd – bokningen hanteras av Helsingbuss.
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
                Godkänd offert
              </div>
              <h2 className="mt-2 text-2xl font-semibold">
                {v(offer?.contact_person, "Kund")}
              </h2>
              <p className="mt-1 text-sm text-white/70">
                Offerten är godkänd och bokningen hanteras vidare.
              </p>
            </div>

            <div className="px-6 pt-6">
              <div className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700">
                Status
              </div>

              <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                <div className="text-sm font-semibold text-emerald-700">
                  Offertstatus
                </div>
                <div className="mt-2">
                  <StatusBadge status="godkand" />
                </div>
                <p className="mt-2 text-sm text-emerald-700/80">
                  Kunden har godkänt offerten.
                </p>
              </div>

              <div className="mt-5 rounded-2xl border border-[#e2e8f0] bg-[#f8fafc] p-4">
                <div className="font-semibold text-[#0f172a]">
                  Offertuppgifter
                </div>

                <dl className="mt-3 grid grid-cols-[auto,1fr] gap-x-6 gap-y-1 text-[14px] leading-tight text-[#0f172a]">
                  <DT>Offertnr:</DT>
                  <DD>{offerNo}</DD>

                  <DT>Resa:</DT>
                  <DD>{roundTrip ? "Tur & retur" : "Enkelresa"}</DD>

                  <DT>Passagerare:</DT>
                  <DD>{v(offer?.passengers)}</DD>

                  {bookingId && (
                    <>
                      <DT>Bokning:</DT>
                      <DD>
                        <a
                          className="underline"
                          href={`/admin/bookings/${encodeURIComponent(
                            bookingId
                          )}`}
                        >
                          {bookingId}
                        </a>
                      </DD>
                    </>
                  )}
                </dl>
              </div>

              <div className="mt-5 rounded-2xl border border-[#e2e8f0] bg-white p-4">
                <div className="font-semibold text-[#0f172a]">Kund</div>

                <dl className="mt-3 grid grid-cols-[auto,1fr] gap-x-6 gap-y-1 text-[14px] leading-tight text-[#0f172a]">
                  <DT>Namn:</DT>
                  <DD>{v(offer?.contact_person)}</DD>

                  <DT>E-post:</DT>
                  <DD>{v(offer?.customer_email ?? offer?.contact_email)}</DD>

                  <DT>Telefon:</DT>
                  <DD>{v(offer?.contact_phone ?? offer?.customer_phone)}</DD>
                </dl>
              </div>
            </div>

            <div className="mt-auto px-6 pb-6 pt-5">
              <div className="rounded-2xl bg-[#eef5f9] px-4 py-4 text-sm text-[#194C66]">
                <div className="font-semibold">Nästa steg</div>
                <p className="mt-1 leading-relaxed">
                  Gå vidare i portalen och kontrollera att bokningen är skapad
                  och komplett.
                </p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function ApprovedLeftPanel() {
  const steps = [
    "Förfrågan mottagen",
    "Offert skickad",
    "Offert godkänd",
    "Bokning hanteras",
  ];

  const benefits = [
    "Kunden har godkänt digitalt",
    "Ärendet går vidare till bokning",
    "Resedetaljer finns samlade",
    "Adminlänk visas när bokning skapats",
  ];

  return (
    <aside className="flex h-full flex-col overflow-hidden rounded-3xl border border-white/70 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
      <div className="bg-gradient-to-br from-emerald-600 to-[#065f46] px-5 py-6 text-white">
        <div className="text-xs uppercase tracking-[0.18em] text-white/60">
          Helsingbuss
        </div>
        <h2 className="mt-2 text-xl font-semibold">Offerten är godkänd</h2>
        <p className="mt-2 text-sm leading-relaxed text-white/75">
          Kunden har accepterat offerten och bokningen kan hanteras vidare.
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
            Vad händer nu?
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
          <div className="font-semibold">Redo för nästa steg</div>
          <p className="mt-1 leading-relaxed">
            Kontrollera bokningen i admin och komplettera vid behov.
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
