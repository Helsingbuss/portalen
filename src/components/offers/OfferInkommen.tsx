// src/components/offers/OfferInkommen.tsx
import Image from "next/image";
import OfferTopBar from "@/components/offers/OfferTopBar";
import TripLegGrid from "@/components/offers/TripLegGrid";
import TripLegCard from "@/components/offers/TripLegCard";
import OfferFooterTerms from "@/components/offers/OfferFooterTerms";
import RightInfoCard from "@/components/offers/RightInfoCard";

type OfferInkommenProps = { offer: any };

const TOPBAR_PX = 64;
const LINE_HEIGHT = 1.5;

function v(x: any, fallback = "—") {
  if (x === null || x === undefined) return fallback;
  const s = String(x);
  return s.trim() === "" ? fallback : s;
}

function tidyTime(v?: any): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (!s) return null;

  if (s.includes(":")) {
    const [hh, mm = "00"] = s.split(":");
    const HH = String(hh || "00").padStart(2, "0").slice(0, 2);
    const MM = String(mm || "00").padStart(2, "0").slice(0, 2);
    return `${HH}:${MM}`;
  }

  if (/^\d{3,4}$/.test(s)) {
    const pad = s.padStart(4, "0");
    return `${pad.slice(0, 2)}:${pad.slice(2, 4)}`;
  }

  return null;
}

function fmtTime(v?: any, dash = "—") {
  return tidyTime(v) ?? dash;
}

function fmtDateSv(iso?: any, dash = "—") {
  if (!iso) return dash;

  const s =
    typeof iso === "string"
      ? iso.length >= 10
        ? iso.slice(0, 10)
        : iso
      : String(iso ?? "");

  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return dash;

  const dt = new Date(`${s}T00:00:00`);
  if (isNaN(dt.getTime())) return dash;

  try {
    return new Intl.DateTimeFormat("sv-SE", {
      dateStyle: "medium",
    }).format(dt);
  } catch {
    return s || dash;
  }
}

export default function OfferInkommen({ offer }: OfferInkommenProps) {
  const withinSweden = (offer?.trip_type || "sverige") !== "utrikes";

  const hasReturn =
    Boolean(offer?.round_trip) ||
    Boolean(offer?.return_date) ||
    Boolean(offer?.return_time) ||
    Boolean(offer?.return_departure) ||
    Boolean(offer?.return_destination);

  const offerNo = v(offer?.offer_number, "HB25XXX");
  const customerNo = v(offer?.customer_number, "K10023");
  const status = v(offer?.status, "inkommen");

  const toOut =
    v(offer?.destination, "").trim() !== ""
      ? v(offer?.destination)
      : v(offer?.final_destination, "—");

  const toRet =
    v(offer?.return_destination, "").trim() !== ""
      ? v(offer?.return_destination)
      : v(offer?.departure_place, "—");

  const rawLegs = (offer?.legs ?? offer?.trip_legs) as any;

  let trips:
    | {
        title: string;
        date: string;
        time: string;
        from: string;
        to: string;
        pax: string;
        extra: string;
      }[];

  if (Array.isArray(rawLegs) && rawLegs.length > 0) {
    trips = rawLegs.map((leg: any, index: number) => ({
      title: `${withinSweden ? "Bussresa inom Sverige" : "Bussresa utomlands"} ${
        rawLegs.length > 1 ? `• Del ${index + 1}` : ""
      }`,
      date: fmtDateSv(leg.date ?? leg.departure_date ?? offer?.departure_date),
      time: fmtTime(
        leg.time ?? leg.start ?? leg.departure_time ?? offer?.departure_time
      ),
      from: v(leg.from ?? leg.departure_place ?? offer?.departure_place),
      to: v(
        leg.to ??
          leg.destination ??
          offer?.destination ??
          offer?.final_destination ??
          "—"
      ),
      pax: v(leg.pax ?? offer?.passengers),
      extra: v(leg.extra ?? offer?.notes, "Ingen information."),
    }));
  } else {
    const firstLeg = {
      title: withinSweden
        ? "Bussresa inom Sverige • Utresa"
        : "Bussresa utomlands • Utresa",
      date: fmtDateSv(offer?.departure_date),
      time: fmtTime(offer?.departure_time),
      from: v(offer?.departure_place),
      to: toOut,
      pax: v(offer?.passengers),
      extra: v(offer?.notes, "Ingen information."),
    };

    const secondLeg = hasReturn
      ? {
          title: withinSweden
            ? "Bussresa inom Sverige • Återresa"
            : "Bussresa utomlands • Återresa",
          date: fmtDateSv(offer?.return_date),
          time: fmtTime(offer?.return_time),
          from:
            v(offer?.destination) !== "—"
              ? v(offer?.destination)
              : v(offer?.final_destination, "—"),
          to: toRet,
          pax: v(offer?.passengers),
          extra: v(offer?.notes, "Ingen information."),
        }
      : null;

    trips = secondLeg ? [firstLeg, secondLeg] : [firstLeg];
  }

  const offerDateRaw =
    offer?.offer_date ??
    (typeof offer?.created_at === "string"
      ? offer.created_at.slice(0, 10)
      : undefined);

  const customerName =
    (offer?.contact_person as string | undefined) ??
    (offer?.customer_name as string | undefined) ??
    undefined;

  const customerPhone =
    (offer?.customer_phone as string | undefined) ??
    (offer?.contact_phone as string | undefined) ??
    undefined;

  const customerEmail =
    (offer?.customer_email as string | undefined) ??
    (offer?.contact_email as string | undefined) ??
    undefined;

  const ourRef =
    (offer?.internal_reference as string | undefined) ?? "Helsingbuss";

  const customerRows = [
    {
      label: "Offertdatum:",
      value: offerDateRaw ? fmtDateSv(offerDateRaw) : "—",
    },
    { label: "Er referens:", value: customerName ?? null },
    { label: "Vår referens:", value: ourRef },
    { label: "Namn:", value: customerName ?? null },
    { label: "Telefon:", value: customerPhone ?? null },
    { label: "E-post:", value: customerEmail ?? null },
  ];

  return (
    <div className="bg-[#eef2f4] overflow-hidden">
      <div style={{ height: TOPBAR_PX }}>
        <OfferTopBar
          offerNumber={offerNo}
          customerNumber={customerNo}
          customerName={customerName ?? "Kund"}
          status={status}
        />
      </div>

      <div style={{ height: `calc(100vh - ${TOPBAR_PX}px)` }}>
        <div className="grid h-full grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)_550px] gap-0">
          <div className="h-full p-4 lg:p-6">
            <IncomingLeftPanel />
          </div>

          <main className="h-full pl-4 lg:pl-6 pr-2 lg:pr-3 py-4 lg:py-6">
            <div className="h-full overflow-hidden rounded-3xl bg-white shadow-[0_18px_50px_rgba(15,23,42,0.08)] border border-white/70 flex flex-col">
              <div className="relative px-6 lg:px-8 pt-7 pb-6 overflow-hidden">
                <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-br from-[#194C66]/10 via-[#edf6f8] to-white pointer-events-none" />

                <div className="relative">
                  <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-5">
                    <div>
                      <div className="inline-flex items-center gap-2 rounded-full bg-[#194C66] px-3 py-1 text-[12px] font-semibold text-white shadow-sm">
                        Offertförfrågan mottagen
                      </div>

                      <h1 className="mt-4 text-3xl lg:text-[34px] leading-tight font-semibold tracking-tight text-[#0f172a]">
                        Tack, vi har tagit emot er förfrågan
                      </h1>

                      <p className="mt-2 text-sm text-slate-600">
                        Offertförfrågan{" "}
                        <span className="font-semibold text-[#194C66]">
                          {offerNo}
                        </span>{" "}
                        granskas nu av Helsingbuss.
                      </p>
                    </div>

                    <div className="shrink-0 rounded-2xl bg-white/80 border border-white shadow-sm px-5 py-4">
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
                    className="mt-6 max-w-4xl rounded-2xl border border-[#dbe7ee] bg-white/85 px-5 py-4 text-[14px] text-[#0f172a]/80 shadow-sm"
                    style={{ lineHeight: LINE_HEIGHT }}
                  >
                    <p>
                      Hej!
                      <br />
                      Tack för förtroendet. Vi har tagit emot er förfrågan och
                      går nu igenom detaljerna. Nedan kan ni dubbelkolla
                      uppgifterna ni skickade in. Utifrån dessa återkommer vi
                      med en skräddarsydd offert med tydliga tider, bussmodell
                      och pris.
                    </p>

                    <p className="mt-3">
                      Behöver ni ändra antal resenärer, hållplatser, bagage,
                      barnstol/tillgänglighet eller service ombord? Maila oss
                      på{" "}
                      <a
                        className="font-medium text-[#194C66] underline decoration-[#194C66]/30 underline-offset-4"
                        href="mailto:kundteam@helsingbuss.se"
                      >
                        kundteam@helsingbuss.se
                      </a>{" "}
                      så uppdaterar vi direkt.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-6 lg:px-8 pb-16">
                <div className="mb-4 flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-[#0f172a]">
                      Resedetaljer
                    </h2>
                    <p className="text-sm text-slate-500">
                      Kontrollera datum, tider, platser och antal resenärer.
                    </p>
                  </div>

                  <div className="hidden sm:flex items-center gap-2 rounded-full bg-[#f1f7f9] px-4 py-2 text-xs font-medium text-[#194C66]">
                    {hasReturn ? "Tur & retur" : "Enkelresa"}
                  </div>
                </div>

                <TripLegGrid>
                  {trips.map((trip, idx) => (
                    <TripLegCard
                      key={idx}
                      title={trip.title}
                      subtitle="Avstånd och tider baseras preliminärt"
                      date={trip.date}
                      time={trip.time}
                      from={trip.from}
                      to={trip.to}
                      pax={trip.pax}
                      extra={trip.extra}
                      iconSrc="/busie.png"
                    />
                  ))}
                </TripLegGrid>

                <div
                  className="mt-6 grid gap-4 lg:grid-cols-2 text-[14px]"
                  style={{ lineHeight: LINE_HEIGHT }}
                >
                  <div className="rounded-2xl border border-[#e2e8f0] bg-[#f8fafc] p-5 text-[#0f172a]/80">
                    <div className="mb-2 text-sm font-semibold text-[#0f172a]">
                      Nästa steg
                    </div>
                    <p>
                      Vi kontrollerar kapacitet, rutt, tider och eventuella
                      tillval. Därefter återkommer vi med en tydlig offert som
                      ni kan godkänna digitalt.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-[#e2e8f0] bg-[#f8fafc] p-5 text-[#0f172a]/80">
                    <div className="mb-2 text-sm font-semibold text-[#0f172a]">
                      Viktig information
                    </div>
                    <p>
                      Detta är endast en offertförfrågan. Bokningen är inte
                      bindande förrän ni har fått och godkänt en skriftlig
                      offert/bokningsbekräftelse från oss.
                    </p>
                  </div>
                </div>

                <div
                  className="mt-6 rounded-2xl bg-white border border-[#e2e8f0] p-5 text-[14px] text-[#0f172a]/80"
                  style={{ lineHeight: LINE_HEIGHT }}
                >
                  <p>
                    Vid eventuell ändring av uppdragstiden eller körsträckan
                    utöver det som anges i offerten tillkommer
                    tilläggsdebitering. Vi reserverar oss för flertalet frågor
                    samt eventuella ändringar eller pålagor som ligger utanför
                    vår kontroll.
                  </p>

                  <p className="mt-3">
                    Har du frågor, funderingar eller vill bekräfta bokningen?
                    Kontakta oss på <strong>010–405 38 38</strong> vardagar
                    kl. 08.00–17.00. För akuta ärenden utanför kontorstid når
                    du vår jourtelefon på <strong>010–777 21 58</strong>.
                  </p>

                  <p className="mt-4 rounded-xl bg-[#194C66] px-4 py-3 text-[12px] uppercase tracking-wide font-semibold text-white">
                    OBS! Detta är endast en offertförfrågan – vi återkommer med
                    offert.
                  </p>
                </div>
              </div>

              <div className="px-6 lg:px-8 pb-6">
                <div className="rounded-2xl border border-[#e2e8f0] bg-[#f8fafc] p-4">
                  <OfferFooterTerms
                    termsParagraphs={[]}
                    companyName="Helsingbuss"
                    address1="Hofverbergsgatan 2B"
                    address2="254 43 Helsingborg"
                    website="helsingbuss.se"
                    phoneMain="+46 (0)10-405 38 38"
                    phoneEmergency="+46 (0)10-777 21 58"
                    email="info@helsingbuss.se"
                    bankgiro="763-4157"
                    orgNumber="890101-3931"
                    vatNumber="SE890101393101"
                    bankName="Swedbank"
                    iban="SE09 8000 0816 9581 4754 3998"
                    bic="SWEDSESS"
                  />
                </div>
              </div>
            </div>
          </main>

          <aside className="h-full p-4 lg:p-6">
            <div className="h-full rounded-3xl bg-white shadow-[0_18px_50px_rgba(15,23,42,0.08)] border border-white/70 flex flex-col overflow-hidden">
              <div className="bg-gradient-to-br from-[#194C66] to-[#0f3347] px-6 py-6 text-white">
                <div className="text-xs uppercase tracking-[0.18em] text-white/60">
                  Kundöversikt
                </div>
                <h2 className="mt-2 text-2xl font-semibold">
                  {customerName ?? "Kund"}
                </h2>
                <p className="mt-1 text-sm text-white/70">
                  Vi använder dessa uppgifter när vi återkommer med offerten.
                </p>
              </div>

              <div className="p-5">
                <RightInfoCard title="Kunduppgifter" rows={customerRows} />
              </div>

              <div className="mx-5 mt-1 rounded-2xl border border-[#e2e8f0] bg-[#f8fafc] p-4">
                <div className="text-sm font-semibold text-[#0f172a]">
                  Status
                </div>
                <div className="mt-2 inline-flex rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                  {status}
                </div>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">
                  Förfrågan är mottagen och inväntar offert från Helsingbuss.
                </p>
              </div>

              <div className="mx-5 mt-4 rounded-2xl border border-[#e2e8f0] bg-white p-4">
                <div className="text-sm font-semibold text-[#0f172a]">
                  Snabb kontakt
                </div>
                <div className="mt-3 space-y-2 text-sm text-slate-600">
                  <div>
                    Telefon:{" "}
                    <a
                      href="tel:+46104053838"
                      className="font-medium text-[#194C66]"
                    >
                      010–405 38 38
                    </a>
                  </div>
                  <div>
                    E-post:{" "}
                    <a
                      href="mailto:kundteam@helsingbuss.se"
                      className="font-medium text-[#194C66]"
                    >
                      kundteam@helsingbuss.se
                    </a>
                  </div>
                </div>
              </div>

              <div className="mt-auto p-5">
                <div className="rounded-2xl bg-[#eef5f9] px-4 py-4 text-sm text-[#194C66]">
                  <div className="font-semibold">Vad händer nu?</div>
                  <p className="mt-1 leading-relaxed">
                    Vi tar fram en offert och skickar den till er så snart
                    uppgifterna är kontrollerade.
                  </p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function IncomingLeftPanel() {
  const steps = [
    "Förfrågan mottagen",
    "Vi granskar resan",
    "Offert tas fram",
    "Ni får svar digitalt",
  ];

  const benefits = [
    "Trygga och bekväma fordon",
    "Tydliga priser utan krångel",
    "Personlig hjälp från kundteamet",
    "Planering anpassad efter er resa",
  ];

  return (
    <aside className="h-full rounded-3xl bg-white border border-white/70 shadow-[0_18px_50px_rgba(15,23,42,0.08)] overflow-hidden flex flex-col">
      <div className="bg-gradient-to-br from-[#194C66] to-[#0f3347] px-5 py-6 text-white">
        <div className="text-xs uppercase tracking-[0.18em] text-white/60">
          Helsingbuss
        </div>
        <h2 className="mt-2 text-xl font-semibold">Din resa planeras</h2>
        <p className="mt-2 text-sm leading-relaxed text-white/75">
          Vi går igenom er förfrågan och återkommer med en tydlig offert.
        </p>
      </div>

      <div className="p-5">
        <div className="text-sm font-semibold text-[#0f172a]">Processen</div>

        <div className="mt-4 space-y-4">
          {steps.map((step, index) => (
            <div key={step} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div
                  className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold ${
                    index === 0
                      ? "bg-[#194C66] text-white"
                      : "bg-[#eef5f9] text-[#194C66]"
                  }`}
                >
                  {index + 1}
                </div>
                {index < steps.length - 1 && (
                  <div className="mt-1 h-8 w-px bg-[#dbe7ee]" />
                )}
              </div>

              <div className="pt-1">
                <div className="text-sm font-medium text-[#0f172a]">
                  {step}
                </div>
                {index === 0 && (
                  <div className="mt-1 text-xs text-slate-500">Just nu</div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-2xl bg-[#f8fafc] border border-[#e2e8f0] p-4">
          <div className="text-sm font-semibold text-[#0f172a]">
            Därför väljer kunder oss
          </div>

          <div className="mt-3 space-y-2">
            {benefits.map((item) => (
              <div key={item} className="flex gap-2 text-sm text-slate-600">
                <span className="text-[#194C66]">✓</span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-auto p-5">
        <div className="rounded-2xl bg-[#eef5f9] px-4 py-4 text-sm text-[#194C66]">
          <div className="font-semibold">Behöver ni ändra något?</div>
          <p className="mt-1 leading-relaxed">
            Maila oss så uppdaterar vi förfrågan innan offerten skickas.
          </p>
        </div>
      </div>
    </aside>
  );
}
