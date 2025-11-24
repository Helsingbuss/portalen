// src/components/offers/OfferInkommen.tsx
import type { ReactNode } from "react";
import Image from "next/image";
import OfferTopBar from "@/components/offers/OfferTopBar";
import TripLegGrid from "@/components/offers/TripLegGrid";
import TripLegCard from "@/components/offers/TripLegCard";
import OfferFooterTerms from "@/components/offers/OfferFooterTerms";
import OfferLeftSidebar from "@/components/offers/OfferLeftSidebar";

type OfferInkommenProps = { offer: any };

const TOPBAR_PX = 64;
const LINE_HEIGHT = 1.5;

// Visar sträng för allt utom null/undefined/""
function v(x: any, fallback = "—") {
  if (x === null || x === undefined) return fallback;
  const s = String(x);
  return s.trim() === "" ? fallback : s;
}

// HH:MM (tål 800, 08:0, 08:00)
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
  const s = typeof iso === "string" ? iso : String(iso ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return dash;
  const dt = new Date(`${s}T00:00:00`);
  if (isNaN(dt.getTime())) return dash;
  try {
    return new Intl.DateTimeFormat("sv-SE", { dateStyle: "medium" }).format(dt);
  } catch {
    return s || dash;
  }
}

export default function OfferInkommen({ offer }: OfferInkommenProps) {
  // Inrikes/utrikes
  const withinSweden = (offer?.trip_type || "sverige") !== "utrikes";

  // Mer tolerant detektering av tur & retur
  const hasReturn =
    Boolean(offer?.round_trip) ||
    Boolean(offer?.return_date) ||
    Boolean(offer?.return_time) ||
    Boolean(offer?.return_departure) ||
    Boolean(offer?.return_destination);

  const offerNo = v(offer?.offer_number, "HB25XXX");
  const customerNo = v(offer?.customer_number, "K10023");
  const status = v(offer?.status, "inkommen");

  // Fallback till final_destination om destination saknas
  const toOut =
    v(offer?.destination, "").trim() !== ""
      ? v(offer?.destination)
      : v(offer?.final_destination, "—");

  const toRet =
    v(offer?.return_destination, "").trim() !== ""
      ? v(offer?.return_destination)
      : v(offer?.departure_place, "—");

  const firstLeg = {
    title: withinSweden ? "Bussresa inom Sverige" : "Bussresa utomlands",
    date: fmtDateSv(offer?.departure_date),
    time: fmtTime(offer?.departure_time),
    from: v(offer?.departure_place),
    to: toOut,
    pax: v(offer?.passengers),
    extra: v(offer?.notes, "Ingen information."),
  };

  const secondLeg = hasReturn
    ? {
        title: withinSweden ? "Bussresa inom Sverige" : "Bussresa utomlands",
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

  const trips = secondLeg ? [firstLeg, secondLeg] : [firstLeg];

  // ---- Kunduppgifter / högerkolumn ----
  // Offertdatum = offer_date, annars fallback till created_at
  const offerDateIso =
    (offer?.offer_date as string | null | undefined) ||
    (offer?.created_at as string | null | undefined) ||
    null;

  // Er referens = beställaren / kontaktperson
  const customerRef =
    (offer?.customer_reference as string | null | undefined) ||
    (offer?.contact_person as string | null | undefined) ||
    null;

  // Vår referens = intern handläggare (senare kan vi sätta utifrån inloggad användare)
  const ourRef =
    (offer?.internal_reference as string | null | undefined) ||
    (offer?.handled_by_name as string | null | undefined) ||
    null;

  // Telefon / e-post från de fält vi faktiskt använder
  const phone =
    (offer?.contact_phone as string | null | undefined) ||
    (offer?.customer_phone as string | null | undefined) ||
    null;

  const email =
    (offer?.contact_email as string | null | undefined) ||
    (offer?.customer_email as string | null | undefined) ||
    null;

  const displayName =
    (offer?.contact_person as string | null | undefined) ||
    (offer?.foretag_forening as string | null | undefined) ||
    null;

  return (
    <div className="bg-[#f5f4f0] overflow-hidden">
      {/* Topprad */}
      <div style={{ height: TOPBAR_PX }}>
        <OfferTopBar
          offerNumber={offerNo}
          customerNumber={customerNo}
          customerName={offer?.contact_person ?? "Kund"}
          status={status}
        />
      </div>

      {/* Arbetsyta */}
      <div style={{ height: `calc(100vh - ${TOPBAR_PX}px)` }}>
        <div className="grid h-full grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)_550px] gap-0">
          {/* Vänster */}
          <div className="h-full">
            <OfferLeftSidebar />
          </div>

          {/* Mitten */}
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
                  Offertförfrågan {offerNo}
                </h1>

                <div
                  className="mt-5 text-[14px] text-[#0f172a]/80"
                  style={{ lineHeight: LINE_HEIGHT }}
                >
                  <p>
                    Hej!
                    <br />
                    Tack för förtroendet. Vi har tagit emot er förfrågan och
                    går nu igenom detaljerna. Nedan kan ni dubbelkolla
                    uppgifterna ni skickade in. Utifrån dessa återkommer vi med
                    en skräddarsydd offert med tydliga tider, bussmodell och
                    pris. Behöver ni ändra antal resenärer, hållplatser,
                    bagage, barnstol/tillgänglighet eller service ombord? Maila
                    oss på{" "}
                    <a
                      className="underline"
                      href="mailto:kundteam@helsingbuss.se"
                    >
                      kundteam@helsingbuss.se
                    </a>{" "}
                    så uppdaterar vi direkt. Luta er tillbaka – vi tar hand om
                    resten.
                  </p>
                </div>

                <div className="mt-5">
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
                </div>

                <div
                  className="mt-6 text-[14px] text-[#0f172a]/80"
                  style={{ lineHeight: LINE_HEIGHT }}
                >
                  <p>
                    Vid eventuell ändring av uppdragstiden eller körsträckan
                    utöver det som anges i offerten tillkommer tilläggs
                    debitering. Vi reserverar oss för flertalet frågor samt
                    eventuella ändringar eller pålagor som ligger utanför vår
                    kontroll. Vid behov av ombokning ansvarar beställaren för
                    att ombokningstid följer.
                  </p>
                  <p className="mt-3">
                    Har du frågor, funderingar eller vill bekräfta bokningen?
                    Tveka inte att kontakta oss på{" "}
                    <strong>010–405 38 38</strong> (vardagar kl. 08.00–17.00).
                    För akuta ärenden utanför kontorstid når du vår jourtelefon
                    på <strong>010–777 21 58</strong>.
                  </p>
                  <p className="mt-4 uppercase text-[12px] tracking-wide font-semibold">
                    OBS! detta är endast en offert, välkommen med din bokning!
                  </p>
                </div>
              </div>

              <div className="mt-auto px-6 pb-6">
                <OfferFooterTerms
                  termsParagraphs={[]}
                  companyName="Helsingbuss"
                  address1="Höjderupsgränd 12"
                  address2="254 45 Helsingborg"
                  website="helsingbuss.se"
                  phoneMain="+46 (0)10-405 38 38"
                  phoneEmergency="+46 (0)10-777 21 58"
                  email="info@helsingbuss.se"
                  bankgiro="9810-01 3931"
                  orgNumber="890101-1391"
                  vatNumber="SE890101931301"
                  bankName="Swedbank"
                  iban="20000000000000000"
                  bic="XXXXXX"
                />
              </div>
            </div>
          </main>

          {/* Höger – kunduppgifter */}
          <aside className="h-full p-4 lg:p-6">
            <div className="h-full bg-white rounded-xl shadow flex flex-col">
              <div className="px-6 pt-6">
                <div className="inline-flex items-center rounded-full bg-[#eef5f9] px-3 py-1 text-sm text-[#194C66] font-medium">
                  Kunduppgifter
                </div>

                <dl className="mt-4 grid grid-cols-[auto,1fr] gap-x-6 gap-y-1 text-[14px] text-[#0f172a] leading-tight">
                  <DT>Offertdatum:</DT>
                  <DD>{fmtDateSv(offerDateIso, "—")}</DD>

                  <DT>Er referens:</DT>
                  <DD>{v(customerRef, "—")}</DD>

                  <DT>Vår referens:</DT>
                  <DD>{v(ourRef, "Helsingbuss")}</DD>

                  <DT>Namn:</DT>
                  <DD>{v(displayName, "—")}</DD>

                  {/* Adress borttagen enligt önskemål */}

                  <DT>Telefon:</DT>
                  <DD>{v(phone, "—")}</DD>

                  <DT>E-post:</DT>
                  <DD>{v(email, "—")}</DD>
                </dl>
              </div>

              <div className="mt-auto pb-6" />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function DT({ children }: { children: ReactNode }) {
  return (
    <dt className="font-semibold text-[#0f172a]/70 whitespace-nowrap">
      {children}
    </dt>
  );
}

function DD({ children }: { children: ReactNode }) {
  return <dd className="text-[#0f172a] break-words">{children}</dd>;
}
