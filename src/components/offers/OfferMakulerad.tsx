// src/components/offers/OfferMakulerad.tsx
import Image from "next/image";
import OfferTopBar from "@/components/offers/OfferTopBar";
import OfferLeftSidebar from "@/components/offers/OfferLeftSidebar";
import TripLegGrid from "@/components/offers/TripLegGrid";
import TripLegCard from "@/components/offers/TripLegCard";

const TOPBAR_PX = 64;
const LINE_HEIGHT = 1.5;

type Breakdown = {
  grandExVat: number;
  grandVat: number;
  grandTotal: number;
  serviceFeeExVat?: number;
  legs?: { subtotExVat: number; vat: number; total: number }[];
};

function money(n?: number | null) {
  if (n == null) return "—";
  return n.toLocaleString("sv-SE", { style: "currency", currency: "SEK" });
}
function v(x: any, fallback = "—") {
  if (x === null || x === undefined || x === "") return fallback;
  return String(x);
}

export default function OfferMakulerad({ offer }: any) {
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

  const trips = [
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

  const breakdown: Breakdown | null =
    typeof offer?.vat_breakdown === "object" && offer?.vat_breakdown
      ? (offer.vat_breakdown as Breakdown)
      : null;

  const totals = {
    ex: offer?.amount_ex_vat ?? breakdown?.grandExVat ?? null,
    vat: offer?.vat_amount ?? breakdown?.grandVat ?? null,
    sum: offer?.total_amount ?? breakdown?.grandTotal ?? null,
  };

  return (
    <div className="bg-[#f5f4f0] overflow-hidden">
      <div style={{ height: TOPBAR_PX }}>
        <OfferTopBar
          offerNumber={offer?.offer_number ?? "HB25XXXX"}
          customerNumber={offer?.customer_number ?? "K10023"}
          customerName={offer?.contact_person ?? "Kund"}
          status="makulerad"
        />
      </div>

      <div style={{ height: `calc(100vh - ${TOPBAR_PX}px)` }}>
        <div className="grid h-full grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)_550px] gap-0">
          <div className="h-full">
            <OfferLeftSidebar />
          </div>

          <main className="h-full pl-4 lg:pl-6 pr-2 lg:pr-3 py-4 lg:py-6">
            <div className="h-full bg-white rounded-xl shadow flex flex-col">
              <div className="px-6 pt-6">
                <Image
                  src="/mork_logo.png"
                  alt="Helsingbuss"
                  width={360}
                  height={64}
                  priority
                />
                <h1 className="mt-2 text-2xl font-semibold text-[#0f172a]">
                  Offerten är makulerad – tack för beskedet, vi hoppas få köra för er framöver.
                </h1>

                <div
                  className="mt-5 text-[14px] text-[#0f172a]/80"
                  style={{ lineHeight: LINE_HEIGHT }}
                >
                  <p>
                    Hej!<br />
                    Tack för beskedet. Vi har makulerat er offert. Tråkigt att ni valde att tacka nej
                    den här gången – vi hoppas på ett återseende. Om planerna ändras kan vi snabbt
                    återöppna underlaget och ta fram en ny lösning. Har ni frågor eller vill ge
                    feedback? Maila{" "}
                    <a className="underline" href="mailto:kundteam@helsingbuss.se">
                      kundteam@helsingbuss.se
                    </a>{" "}
                    så återkommer vi direkt. Varmt välkomna igen när det passar bättre.
                  </p>
                </div>

                <div className="mt-5">
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
                            subtitle="(tidigare uppgifter)"
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
                                  <div className="text-[#0f172a]/70">Pris exkl. moms</div>
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
                </div>

                <div
                  className="mt-6 text-[14px] text-[#0f172a]/80"
                  style={{ lineHeight: LINE_HEIGHT }}
                >
                  <p>
                    Er offert är nu makulerad och ingen kapacitet är reserverad. Om planerna ändras
                    kan vi snabbt återöppna ärendet, kontrollera tillgänglighet och skicka en
                    uppdaterad offert. Våra resevillkor (läs dem här) börjar gälla först när en
                    bokning bekräftas skriftligt av oss.
                  </p>
                  <p className="mt-3">
                    Vill ni återuppta ärendet eller har frågor/önskemål? Kontakta oss så hjälper vi
                    gärna. Våra öppettider är vardagar kl. 08:00–17:00. För brådskande nya
                    förfrågningar med kortare varsel än två arbetsdagar, ring vårt journummer:{" "}
                    <strong>010–777 21 58</strong>.
                  </p>
                </div>
              </div>

              {/* FOOTER — UPPDATERAD till 4 kolumner */}
              <div className="mt-auto px-6 pb-6">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-[13px] text-[#0f172a]">
                  <div>
                    <div>Helsingbuss</div>
                    <div>Höjderupsgränd 12</div>
                    <div>254 45 Helsingborg</div>
                    <div>helsingbuss.se</div>
                  </div>
                  <div>
                    <div>Tel. +46 (0)10-405 38 38</div>
                    <div>Jour. +46 (0)10-777 21 58</div>
                    <div>info@helsingbuss.se</div>
                  </div>
                  <div>
                    <div>Bankgiro: 9810-01 3931</div>
                    <div>Org.nr: 890101-1391</div>
                    <div>VAT nr: SE890101391301</div>
                  </div>
                  <div>
                    <div>Swedbank</div>
                    <div>IBAN: 2000000000000000</div>
                    <div>Swift/BIC: XXXXX</div>
                  </div>
                </div>
              </div>
            </div>
          </main>

          <aside className="h-full p-4 lg:p-6">
            <div className="h-full bg-white rounded-xl shadow flex flex-col">
              <div className="px-6 pt-6">
                <div className="inline-flex items-center rounded-full bg-[#eef5f9] px-3 py-1 text-sm text-[#194C66] font-medium">
                  Kunduppgifter
                </div>

                <dl className="mt-4 grid grid-cols-[auto,1fr] gap-x-6 gap-y-1 text-[14px] text-[#0f172a] leading-tight">
                  <DT>Offertdatum:</DT><DD>{v(offer?.offer_date, "—")}</DD>
                  <DT>Er referens:</DT><DD>{v(offer?.customer_reference, "—")}</DD>
                  <DT>Vår referens:</DT><DD>{v(offer?.internal_reference, "—")}</DD>
                  <DT>Namn:</DT><DD>{v(offer?.contact_person, "—")}</DD>
                  <DT>Adress:</DT><DD>{v(offer?.customer_address, "—")}</DD>
                  <DT>Telefon:</DT><DD>{v(offer?.contact_phone, "—")}</DD>
                  <DT>E-post:</DT><DD>{v(email, "—")}</DD>
                </dl>

                <div className="mt-6">
                  <div className="font-semibold text-[#0f172a]">
                    Offertinformation om kostnad
                  </div>

                  <div className="mt-3">
                    <div
                      className="grid"
                      style={{ gridTemplateColumns: roundTrip ? "1fr 1fr 1fr" : "1fr 1fr" }}
                    >
                      <div className="text-[#0f172a]/70 text-sm"> </div>
                      <div className="text-[#0f172a]/70 text-sm font-semibold">Enkel</div>
                      {roundTrip && (
                        <div className="text-[#0f172a]/70 text-sm font-semibold">Tur&Retur</div>
                      )}
                    </div>

                    <RowMak
                      roundTrip={roundTrip}
                      label="Summa exkl. moms"
                      enkel={money(breakdown?.legs?.[0]?.subtotExVat ?? totals.ex)}
                      retur={roundTrip ? money(breakdown?.legs?.[1]?.subtotExVat) : undefined}
                    />
                    <RowMak
                      roundTrip={roundTrip}
                      label="Moms"
                      enkel={money(breakdown?.legs?.[0]?.vat ?? totals.vat)}
                      retur={roundTrip ? money(breakdown?.legs?.[1]?.vat) : undefined}
                    />
                    <RowMak
                      roundTrip={roundTrip}
                      label="Totalsumma"
                      enkel={money(breakdown?.legs?.[0]?.total ?? totals.sum)}
                      retur={roundTrip ? money(breakdown?.legs?.[1]?.total) : undefined}
                    />

                    <div className="mt-3 grid grid-cols-[1fr_auto] items-baseline line-through opacity-60">
                      <div className="text-[#0f172a]/70 text-sm">Offertkostnad för detta uppdrag</div>
                      <div className="font-medium">{money(totals.sum)}</div>
                    </div>

                    <div className="mt-2 text-[12px] text-[#0f172a]/60">
                      (Priserna är inte längre giltiga – offerten är makulerad)
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-auto px-6 pb-6" />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function DT({ children }: { children: React.ReactNode }) {
  return <dt className="font-semibold text-[#0f172a]/70 whitespace-nowrap">{children}</dt>;
}
function DD({ children }: { children: React.ReactNode }) {
  return <dd className="text-[#0f172a] break-words">{children}</dd>;
}

function RowMak({
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
      className="mt-1 grid items-baseline text-[14px] line-through opacity-60"
      style={{ gridTemplateColumns: roundTrip ? "1fr 1fr 1fr" : "1fr 1fr" }}
    >
      <div className="text-[#0f172a]/70">{label}</div>
      <div>{enkel}</div>
      {roundTrip && <div>{retur ?? "—"}</div>}
    </div>
  );
}
