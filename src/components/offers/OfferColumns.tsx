import Image from "next/image";
import StatusBadge from "@/components/StatusBadge";

import OfferTopBar from "@/components/offers/OfferTopBar";
import TripLegGrid from "@/components/offers/TripLegGrid";
import TripLegCard from "@/components/offers/TripLegCard";
import OfferFooterTerms from "@/components/offers/OfferFooterTerms";
import OfferLeftSidebar from "@/components/offers/OfferLeftSidebar";

type OfferInkommenProps = { offer: any };

const LINE_HEIGHT = 1.5;

function v(x: any, fallback = "—") {
  if (x === null || x === undefined || x === "") return fallback;
  return String(x);
}

export default function OfferInkommen({ offer }: OfferInkommenProps) {
  const roundTrip = Boolean(offer?.round_trip);
  const withinSweden = (offer?.trip_type || "sverige") !== "utrikes";

  const offerNo = v(offer?.offer_number, "HB25XXX");
  const customerNo = v(offer?.customer_number, "K10023");
  const status = v(offer?.status, "inkommen");

  const firstLeg = {
    title: withinSweden ? "Bussresa inom Sverige" : "Bussresa utomlands",
    date: v(offer?.departure_date),
    time: v(offer?.departure_time),
    from: v(offer?.departure_place),
    to: v(offer?.destination),
    pax: v(offer?.passengers),
    extra: v(offer?.notes, "Ingen information."),
  };

  const secondLeg = roundTrip
    ? {
        title: withinSweden ? "Bussresa inom Sverige" : "Bussresa utomlands",
        date: v(offer?.return_date),
        time: v(offer?.return_time),
        from: v(offer?.destination),
        to: v(offer?.departure_place),
        pax: v(offer?.passengers),
        extra: v(offer?.notes, "Ingen information."),
      }
    : null;

  const trips = secondLeg ? [firstLeg, secondLeg] : [firstLeg];

  return (
    /**
     * Hela sidan: lås höjd = 100vh och dölj fönstrets scroll.
     * Inre kolumner (mitten & höger) får egna scrollbars (overflow-auto).
     */
    <div className="h-screen overflow-hidden bg-[#f5f4f0]">
      {/* LÅST topprad – se till att OfferTopBar är 'fixed top-0 left-0 right-0 z-50 h-12' */}
      <OfferTopBar
        offerNumber={offerNo}
        customerNumber={customerNo}
        status={status}
        customerName={v(offer?.contact_person, "")}
      />

      {/* Spacer för att inte hamna under den fixed topbaren (48px = h-12) */}
      <div className="h-12" />

      {/* Grid som fyller hela höjden under topbaren – ingen yttre scroll */}
      <div className="grid lg:grid-cols-[280px_minmax(0,1fr)_550px] h-[calc(100vh-48px)] gap-0 lg:gap-6">
        {/* Vänster – fyll hela höjden, ingen scroll */}
        <OfferLeftSidebar />

        {/* Mitten – egen intern scroll */}
        <main className="bg-white rounded-xl shadow px-6 py-6 h-full overflow-auto">
          {/* Header med logga + status */}
          <div className="flex items-start justify-between">
            <div className="flex items-center">
              <Image
                src="/mork_logo.png"
                alt="Helsingbuss"
                width={360}
                height={64}
                priority
              />
            </div>
            <div className="pt-1 text-right">
              <StatusBadge status={status} />
            </div>
          </div>

          {/* Titel */}
          <h1 className="mt-2 text-2xl font-semibold text-[#0f172a]">
            Offertförfrågan {offerNo}
          </h1>

          {/* Intro */}
          <div className="mt-4 text-[14px] text-[#0f172a]/80" style={{ lineHeight: LINE_HEIGHT }}>
            <p>
              Hej!
              <br />
              Tack för förtroendet. Vi har tagit emot er förfrågan och går nu igenom detaljerna.
              Nedan kan ni dubbelkolla uppgifterna ni skickade in. Utifrån dessa återkommer vi med
              en skräddarsydd offert med tydliga tider, bussmodell och pris. Behöver ni ändra antal
              resenärer, hållplatser, bagage, barnstol/tillgänglighet eller service ombord? Maila
              oss på{" "}
              <a className="underline" href="mailto:kundteam@helsingbuss.se">
                kundteam@helsingbuss.se
              </a>{" "}
              så uppdaterar vi direkt. Luta er tillbaka – vi tar hand om resten.
            </p>
          </div>

          {/* Resor */}
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

          {/* Villkor + kontakt + OBS */}
          <div className="mt-6 text-[14px] text-[#0f172a]/80" style={{ lineHeight: 1.5 }}>
            <p>
              Vid eventuell ändring av uppdragstiden eller körsträckan utöver det som anges i
              offerten tillkommer tilläggs debitering. Vi reserverar oss för flertalet frågor samt
              eventuella ändringar eller pålagor som ligger utanför vår kontroll. Vid behov av
              ombokning ansvarar beställaren för att ombokningstid följer.
            </p>
            <p className="mt-3">
              Har du frågor, funderingar eller vill bekräfta bokningen? Tveka inte att kontakta oss
              på <strong>010-405 38 38</strong> (vardagar kl. 08.00–17.00). För akuta ärenden
              utanför kontorstid når du vår jourtelefon på <strong>010-777 21 58</strong>.
            </p>
            <p className="mt-4 uppercase text-[12px] tracking-wide">
              OBS! detta är endast en offert, välkommen med din bokning!
            </p>
          </div>

          {/* Footeruppgifter */}
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
        </main>

        {/* Höger – egen intern scroll; kompakt radavstånd och symmetrisk kant-luft */}
        <aside className="bg-white rounded-xl shadow p-6 h-full overflow-auto">
          <div className="inline-flex items-center rounded-full bg-[#eef5f9] px-3 py-1 text-sm text-[#194C66] font-medium">
            Kunduppgifter
          </div>

          {/* Två kolumner (etikett | värde) med tight radavstånd */}
          <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-1 text-[14px] leading-[1.2rem] text-[#0f172a]">
            <Label>Offertdatum</Label><Value>{v(offer?.offer_date, "—")}</Value>
            <Label>Er referens</Label><Value>{v(offer?.customer_reference, "—")}</Value>
            <Label>Vår referens</Label><Value>{v(offer?.internal_reference, "—")}</Value>

            <Label>Namn</Label><Value>{v(offer?.contact_person, "—")}</Value>
            <Label>Adress</Label><Value>{v(offer?.customer_address, "—")}</Value>
            <Label>Telefon</Label><Value>{v(offer?.contact_phone, "—")}</Value>
            <Label>E-post</Label><Value>{v(offer?.contact_email, "—")}</Value>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <div className="text-[#0f172a]/70 font-semibold">{children}:</div>;
}
function Value({ children }: { children: React.ReactNode }) {
  return <div className="text-[#0f172a] break-words">{children}</div>;
}
