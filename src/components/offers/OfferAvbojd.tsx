// src/components/offers/OfferAvbojd.tsx
import Image from "next/image";
import OfferTopBar from "@/components/offers/OfferTopBar";
import TripLegGrid from "@/components/offers/TripLegGrid";
import TripLegCard from "@/components/offers/TripLegCard";

const TOPBAR_PX = 64;
const LINE_HEIGHT = 1.5;

type BreakdownLeg = {
  subtotExVat: number;
  vat: number;
  total: number;
  pax?: number | null;
  extra?: string | null;
};

type Breakdown = {
  grandExVat: number;
  grandVat: number;
  grandTotal: number;
  serviceFeeExVat?: number;
  legs?: BreakdownLeg[];
};

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

export default function OfferAvbojd({ offer }: any) {
  const roundTrip = Boolean(
    offer?.round_trip ??
      offer?.return_date ??
      offer?.return_time ??
      offer?.return_departure ??
      offer?.return_destination
  );

  const withinSweden = (offer?.trip_type || "sverige") !== "utrikes";

  const email: string | undefined =
    offer?.contact_email || offer?.customer_email || undefined;

  const breakdown: Breakdown | null =
    typeof offer?.vat_breakdown === "object" && offer?.vat_breakdown
      ? (offer.vat_breakdown as Breakdown)
      : null;

  const totals = {
    ex: offer?.amount_ex_vat ?? breakdown?.grandExVat ?? null,
    vat: offer?.vat_amount ?? breakdown?.grandVat ?? null,
    sum: offer?.total_amount ?? breakdown?.grandTotal ?? null,
  };

  const trips =
    breakdown?.legs && breakdown.legs.length > 0
      ? breakdown.legs.map((leg, idx) => {
          const isFirst = idx === 0;

          const title = roundTrip
            ? isFirst
              ? "Utresa"
              : "Återresa"
            : "Bussresa";

          const date = isFirst
            ? offer?.departure_date
            : offer?.return_date ?? offer?.departure_date;

          const time = isFirst ? offer?.departure_time : offer?.return_time;

          const from = isFirst
            ? offer?.departure_place
            : offer?.destination ?? offer?.departure_place;

          const to = isFirst
            ? offer?.destination
            : offer?.departure_place ?? offer?.destination;

          return {
            title,
            date,
            time,
            from,
            to,
            pax: leg.pax ?? offer?.passengers,
            extra: leg.extra ?? (offer?.notes || "Ingen information."),
          };
        })
      : [
          {
            title: roundTrip ? "Utresa" : "Bussresa",
            date: offer?.departure_date,
            time: offer?.departure_time,
            from: offer?.departure_place,
            to: offer?.destination,
            pax: offer?.passengers,
            extra: offer?.notes || "Ingen information.",
          },
          ...(roundTrip
            ? [
                {
                  title: "Återresa",
                  date: offer?.return_date,
                  time: offer?.return_time,
                  from: offer?.destination,
                  to: offer?.departure_place,
                  pax: offer?.passengers,
                  extra: offer?.notes || "Ingen information.",
                },
              ]
            : []),
        ];

  return (
    <div className="bg-[#eef2f4] overflow-hidden">
      <div style={{ height: TOPBAR_PX }}>
        <OfferTopBar
          offerNumber={offer?.offer_number ?? "HB25XXXX"}
          customerNumber={offer?.customer_number ?? "K10023"}
          customerName={offer?.contact_person ?? "Kund"}
          status="avböjd"
        />
      </div>

      <div
        className="overflow-hidden"
        style={{ height: `calc(100vh - ${TOPBAR_PX}px)` }}
      >
        <div className="grid h-full grid-cols-1 lg:grid-cols-[420px_minmax(0,1fr)_550px] gap-0 overflow-hidden">
          <div className="h-full p-4 lg:p-6 pb-10">
            <DeclinedLeftPanel />
          </div>

          <main className="h-full pl-4 lg:pl-6 pr-2 lg:pr-3 py-4 lg:py-6 overflow-hidden">
            <div className="h-full overflow-hidden rounded-3xl bg-white shadow-[0_18px_50px_rgba(15,23,42,0.08)] border border-white/70 flex flex-col">
              <div className="relative px-6 lg:px-8 pt-7 pb-6 overflow-hidden">
                <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-br from-red-500/10 via-[#fff5f5] to-white pointer-events-none" />

                <div className="relative">
                  <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-5">
                    <div>
                      <div className="inline-flex items-center gap-2 rounded-full bg-red-600 px-3 py-1 text-[12px] font-semibold text-white shadow-sm">
                        Offert avböjd
                      </div>

                      <h1 className="mt-4 text-3xl lg:text-[34px] leading-tight font-semibold tracking-tight text-[#0f172a]">
                        Tack för beskedet
                      </h1>

                      <p className="mt-2 text-sm text-slate-600">
                        Offert{" "}
                        <span className="font-semibold text-[#194C66]">
                          {offer?.offer_number ?? "—"}
                        </span>{" "}
                        är markerad som avböjd.
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
                    className="mt-6 max-w-4xl rounded-2xl border border-red-100 bg-white/85 px-5 py-4 text-[14px] text-[#0f172a]/80 shadow-sm"
                    style={{ lineHeight: LINE_HEIGHT }}
                  >
                    <p>
                      Hej!
                      <br />
                      Vi har registrerat att ni avböjt offerten. Tråkigt att
                      det inte passade denna gång – men ni är varmt välkomna
                      tillbaka när planerna ändras.
                    </p>

                    <p className="mt-3">
                      Behöver ni en ny lösning framåt kan vi snabbt ta fram en
                      uppdaterad offert efter era önskemål. Frågor eller
                      feedback? Maila{" "}
                      <a
                        className="font-medium text-[#194C66] underline decoration-[#194C66]/30 underline-offset-4"
                        href="mailto:kundteam@helsingbuss.se"
                      >
                        kundteam@helsingbuss.se
                      </a>{" "}
                      så återkommer vi direkt.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-6 lg:px-8 pb-40">
                <div className="mb-4 flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-[#0f172a]">
                      Tidigare resedetaljer
                    </h2>
                    <p className="text-sm text-slate-500">
                      Uppgifterna visas som historik eftersom offerten är
                      avböjd.
                    </p>
                  </div>

                  <div className="hidden sm:flex items-center gap-2 rounded-full bg-red-50 px-4 py-2 text-xs font-medium text-red-700">
                    {roundTrip ? "Tur & retur" : "Enkelresa"}
                  </div>
                </div>

                <TripLegGrid>
                  {trips.map((trip, idx) => {
                    const leg = breakdown?.legs?.[idx];

                    return (
                      <div key={idx} className="line-through opacity-60">
                        <TripLegCard
                          title={
                            withinSweden
                              ? `Bussresa inom Sverige • ${trip.title}`
                              : `Bussresa utomlands • ${trip.title}`
                          }
                          subtitle="Tidigare uppgifter"
                          date={trip.date}
                          time={trip.time}
                          from={trip.from}
                          to={trip.to}
                          pax={trip.pax}
                          extra={trip.extra}
                          iconSrc="/busie.png"
                          footer={
                            breakdown?.legs ? (
                              <div className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 mt-3 text-[14px]">
                                <div className="text-[#0f172a]/70">
                                  Pris exkl. moms
                                </div>
                                <div>{money(leg?.subtotExVat)}</div>

                                <div className="text-[#0f172a]/70">Moms</div>
                                <div>{money(leg?.vat)}</div>

                                <div className="text-[#0f172a]/70">Summa</div>
                                <div>{money(leg?.total)}</div>
                              </div>
                            ) : null
                          }
                        />
                      </div>
                    );
                  })}
                </TripLegGrid>

                <div
                  className="mt-6 grid gap-4 lg:grid-cols-2 text-[14px]"
                  style={{ lineHeight: LINE_HEIGHT }}
                >
                  <div className="rounded-2xl border border-[#e2e8f0] bg-[#f8fafc] p-5 text-[#0f172a]/80">
                    <div className="mb-2 text-sm font-semibold text-[#0f172a]">
                      Ärendet är avslutat
                    </div>
                    <p>
                      Inga resurser är reserverade och ingen bokning har
                      skapats utifrån denna offert.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-[#e2e8f0] bg-[#f8fafc] p-5 text-[#0f172a]/80">
                    <div className="mb-2 text-sm font-semibold text-[#0f172a]">
                      Ny offert
                    </div>
                    <p>
                      Om ni vill återuppta ärendet kontrollerar vi
                      tillgänglighet och tar fram ett nytt förslag.
                    </p>
                  </div>
                </div>

                <div
                  className="mt-6 rounded-2xl bg-white border border-[#e2e8f0] p-5 text-[14px] text-[#0f172a]/80"
                  style={{ lineHeight: LINE_HEIGHT }}
                >
                  <p>
                    Våra resevillkor börjar gälla först när en bokning
                    bekräftas skriftligt av oss. Eftersom offerten är avböjd är
                    priser och tidigare uppgifter inte längre aktuella.
                  </p>

                  <p className="mt-3">
                    Behöver ni hjälp? Vardagar kl. 08:00–17:00. För brådskande
                    nya förfrågningar, ring jour:{" "}
                    <strong>010–777 21 58</strong>.
                  </p>

                  <p className="mt-4 rounded-xl bg-red-600 px-4 py-3 text-[12px] uppercase tracking-wide font-semibold text-white">
                    Offerten är avböjd och priserna är inte längre aktuella.
                  </p>
                </div>

                <div className="mt-6 rounded-2xl border border-[#e2e8f0] bg-[#f8fafc] p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-[13px] text-[#0f172a]">
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
                      <div>VAT nr: SE890101391301</div>
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

          <aside className="h-full p-4 lg:p-6">
            <div className="h-full rounded-3xl bg-white shadow-[0_18px_50px_rgba(15,23,42,0.08)] border border-white/70 flex flex-col overflow-hidden">
              <div className="bg-gradient-to-br from-[#194C66] to-[#0f3347] px-6 py-6 text-white">
                <div className="text-xs uppercase tracking-[0.18em] text-white/60">
                  Avböjd offert
                </div>
                <h2 className="mt-2 text-2xl font-semibold">
                  {offer?.contact_person ?? "Kund"}
                </h2>
                <p className="mt-1 text-sm text-white/70">
                  Offerten är avslutad och priserna visas endast som historik.
                </p>
              </div>

              <div className="px-6 pt-6">
                <div className="inline-flex items-center rounded-full bg-red-50 px-3 py-1 text-sm text-red-700 font-medium">
                  Kunduppgifter
                </div>

                <dl className="mt-4 grid grid-cols-[auto,1fr] gap-x-6 gap-y-1 text-[14px] text-[#0f172a] leading-tight">
                  <DT>Offertdatum:</DT>
                  <DD>{v(offer?.offer_date, "—")}</DD>

                  <DT>Er referens:</DT>
                  <DD>{v(offer?.customer_reference, "—")}</DD>

                  <DT>Vår referens:</DT>
                  <DD>{v(offer?.internal_reference, "—")}</DD>

                  <DT>Namn:</DT>
                  <DD>{v(offer?.contact_person, "—")}</DD>

                  <DT>Adress:</DT>
                  <DD>{v(offer?.customer_address, "—")}</DD>

                  <DT>Telefon:</DT>
                  <DD>{v(offer?.contact_phone, "—")}</DD>

                  <DT>E-post:</DT>
                  <DD>{v(email, "—")}</DD>
                </dl>

                <div className="mt-6 rounded-2xl border border-red-100 bg-red-50 p-4">
                  <div className="text-sm font-semibold text-red-700">
                    Status
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-red-700">
                    Avböjd
                  </div>
                  <p className="mt-2 text-sm text-red-700/80">
                    Offerten är inte längre aktiv.
                  </p>
                </div>

                <div className="mt-5">
                  <div className="font-semibold text-[#0f172a]">
                    Offertinformation om kostnad
                  </div>

                  <div className="mt-3 rounded-2xl border border-[#e2e8f0] bg-[#f8fafc] p-4">
                    <div
                      className="grid"
                      style={{
                        gridTemplateColumns: roundTrip
                          ? "1fr 1fr 1fr"
                          : "1fr 1fr",
                      }}
                    >
                      <div className="text-[#0f172a]/70 text-sm"> </div>
                      <div className="text-[#0f172a]/70 text-sm font-semibold">
                        Enkel
                      </div>
                      {roundTrip && (
                        <div className="text-[#0f172a]/70 text-sm font-semibold">
                          Tur&Retur
                        </div>
                      )}
                    </div>

                    <RowStrike
                      roundTrip={roundTrip}
                      label="Summa exkl. moms"
                      enkel={money(
                        breakdown?.legs?.[0]?.subtotExVat ?? totals.ex
                      )}
                      retur={
                        roundTrip
                          ? money(breakdown?.legs?.[1]?.subtotExVat)
                          : undefined
                      }
                    />

                    <RowStrike
                      roundTrip={roundTrip}
                      label="Moms"
                      enkel={money(breakdown?.legs?.[0]?.vat ?? totals.vat)}
                      retur={
                        roundTrip
                          ? money(breakdown?.legs?.[1]?.vat)
                          : undefined
                      }
                    />

                    <RowStrike
                      roundTrip={roundTrip}
                      label="Totalsumma"
                      enkel={money(breakdown?.legs?.[0]?.total ?? totals.sum)}
                      retur={
                        roundTrip
                          ? money(breakdown?.legs?.[1]?.total)
                          : undefined
                      }
                    />

                    <div className="mt-4 grid grid-cols-[1fr_auto] items-baseline line-through opacity-60">
                      <div className="text-[#0f172a]/70 text-sm">
                        Offertkostnad för detta uppdrag
                      </div>
                      <div className="font-medium">{money(totals.sum)}</div>
                    </div>

                    <div className="mt-3 text-[12px] text-[#0f172a]/60">
                      Priserna är inte längre aktuella – offerten är avböjd.
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-auto px-6 pb-6 pt-5">
                <div className="rounded-2xl bg-[#eef5f9] px-4 py-4 text-sm text-[#194C66]">
                  <div className="font-semibold">Vill ni göra en ny resa?</div>
                  <p className="mt-1 leading-relaxed">
                    Kontakta oss så tar vi gärna fram en ny offert.
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

function DeclinedLeftPanel() {
  const steps = [
    "Förfrågan mottagen",
    "Offert skickad",
    "Offert avböjd",
    "Ärendet avslutat",
  ];

  const benefits = [
    "Ni kan alltid skicka ny förfrågan",
    "Vi kan justera upplägg och pris",
    "Personlig hjälp från kundteamet",
    "Snabb ny offert vid behov",
  ];

  return (
    <aside className="h-full rounded-3xl bg-white border border-white/70 shadow-[0_18px_50px_rgba(15,23,42,0.08)] overflow-hidden flex flex-col">
      <div className="bg-gradient-to-br from-red-600 to-[#7f1d1d] px-5 py-6 text-white">
        <div className="text-xs uppercase tracking-[0.18em] text-white/60">
          Helsingbuss
        </div>
        <h2 className="mt-2 text-xl font-semibold">Offerten är avböjd</h2>
        <p className="mt-2 text-sm leading-relaxed text-white/75">
          Tack för beskedet. Ni är varmt välkomna tillbaka med en ny förfrågan.
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
                    index <= 2
                      ? "bg-red-600 text-white"
                      : "bg-red-50 text-red-700"
                  }`}
                >
                  {index + 1}
                </div>
                {index < steps.length - 1 && (
                  <div className="mt-1 h-8 w-px bg-red-100" />
                )}
              </div>

              <div className="pt-1">
                <div className="text-sm font-medium text-[#0f172a]">
                  {step}
                </div>
                {index === 2 && (
                  <div className="mt-1 text-xs text-slate-500">Nuvarande</div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-2xl bg-[#f8fafc] border border-[#e2e8f0] p-4">
          <div className="text-sm font-semibold text-[#0f172a]">
            Nästa möjlighet
          </div>

          <div className="mt-3 space-y-2">
            {benefits.map((item) => (
              <div key={item} className="flex gap-2 text-sm text-slate-600">
                <span className="text-red-600">✓</span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-auto p-5">
        <div className="rounded-2xl bg-red-50 px-4 py-4 text-sm text-red-700">
          <div className="font-semibold">Vill ni återuppta ärendet?</div>
          <p className="mt-1 leading-relaxed">
            Kontakta oss så ser vi över tillgänglighet och skickar ny offert.
          </p>
        </div>
      </div>
    </aside>
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
  return <dd className="text-[#0f172a] break-words">{children}</dd>;
}

function RowStrike({
  roundTrip,
  label,
  enkel,
  retur,
}: {
  roundTrip: boolean;
  label: string;
  enkel: string;
  retur?: string;
}) {
  return (
    <div
      className="mt-2 grid items-baseline text-[14px] line-through opacity-60"
      style={{ gridTemplateColumns: roundTrip ? "1fr 1fr 1fr" : "1fr 1fr" }}
    >
      <div className="text-[#0f172a]/70">{label}</div>
      <div>{enkel}</div>
      {roundTrip && <div>{retur ?? "—"}</div>}
    </div>
  );
}
