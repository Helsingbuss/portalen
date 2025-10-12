// src/components/offers/OfferGodkand.tsx
import Image from "next/image";
import StatusBadge from "@/components/StatusBadge";

type OfferGodkandProps = {
  offer: any;
};

// Globala rattar för radavstånd
const LINE_HEIGHT = 1.5;   // resten av sidan
const CARD_LH     = 1.25;  // tajtare i korten överst

function v(x: any, fallback = "—") {
  if (x === null || x === undefined || x === "") return fallback;
  return String(x);
}

export default function OfferGodkand({ offer }: OfferGodkandProps) {
  const roundTrip = Boolean(offer?.round_trip);
  const withinSweden = (offer?.trip_type || "sverige") !== "utrikes";
  const offerNo = v(offer?.offer_number, "HB25XXX");

  // Första benet
  const firstLeg = {
    title: withinSweden ? "Bussresa inom Sverige" : "Bussresa utomlands",
    date: v(offer?.departure_date),
    time: v(offer?.departure_time),
    from: v(offer?.departure_place),
    to: v(offer?.destination),
    pax: v(offer?.passengers),
    extra: v(offer?.notes, "Ingen information."),
    onSite: v(offer?.on_site_time, "—"),      // tid när bussen är på plats
    endTime: v(offer?.end_time, "—"),         // sluttid körning
    driver: v(offer?.driver_name, ""),        // t.ex. "Namn, 070-xxx xx xx"
    driverPhone: v(offer?.driver_phone, ""),
    vehicleReg: v(offer?.vehicle_reg, ""),    // t.ex. "ABC123"
    vehicleModel: v(offer?.vehicle_model, ""),// t.ex. "Volvo 9700"
  };

  // Andra benet vid tur/retur (om du har separata fält för retur – använd dem)
  const secondLeg = roundTrip
    ? {
        title: withinSweden ? "Bussresa inom Sverige" : "Bussresa utomlands",
        date: v(offer?.return_date),
        time: v(offer?.return_time),
        from: v(offer?.destination),
        to: v(offer?.departure_place),
        pax: v(offer?.passengers),
        extra: v(offer?.notes, "Ingen information."),
        onSite: v(offer?.return_on_site_time || offer?.on_site_time, "—"),
        endTime: v(offer?.return_end_time || offer?.end_time, "—"),
        driver: v(offer?.return_driver_name || offer?.driver_name, ""),
        driverPhone: v(offer?.return_driver_phone || offer?.driver_phone, ""),
        vehicleReg: v(offer?.return_vehicle_reg || offer?.vehicle_reg, ""),
        vehicleModel: v(offer?.return_vehicle_model || offer?.vehicle_model, ""),
      }
    : null;

  const trips = secondLeg ? [firstLeg, secondLeg] : [firstLeg];

  return (
    <div className="min-h-screen bg-[#f5f4f0] py-6">
      <div className="mx-auto w-full max-w-4xl bg-white rounded-lg shadow px-6 py-6">
        {/* Header-rad: logga + status */}
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
            <StatusBadge status="godkand" />
          </div>
        </div>

        {/* Titel */}
        <h1 className="mt-2 text-2xl font-semibold text-[#0f172a]">
          Bokningen är klar {offerNo ? `(${offerNo})` : ""}
        </h1>

        {/* Övre kort – bokningsinfo & kundinfo */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Bokningsinformation */}
          <div
            className="border rounded-lg p-4 space-y-[2px]"
            style={{ lineHeight: CARD_LH as number }}
          >
            <Row label="Bokningsdatum" value={v(offer?.offer_date, "—")} lh={CARD_LH} />
            <Row label="Er referens" value={v(offer?.customer_reference, "—")} lh={CARD_LH} />
            <Row label="Vår referens" value={v(offer?.internal_reference, "—")} lh={CARD_LH} />
            {/* Betalningsvillkor (om du vill visa) */}
            {offer?.payment_terms && (
              <Row label="Betalningsvillkor" value={v(offer?.payment_terms)} lh={CARD_LH} />
            )}
          </div>

          {/* Kundinformation */}
          <div
            className="border rounded-lg p-4 space-y-[2px]"
            style={{ lineHeight: CARD_LH as number }}
          >
            <Row label="Namn" value={v(offer?.contact_person, "—")} lh={CARD_LH} />
            <Row label="Adress" value={v(offer?.customer_address, "—")} lh={CARD_LH} />
            <Row label="Telefon" value={v(offer?.contact_phone, "—")} lh={CARD_LH} />
            <Row label="E-post" value={v(offer?.contact_email, "—")} wrap lh={CARD_LH} />
          </div>
        </div>

        {/* Meddelande från trafikledningen */}
        <div className="mt-5 border rounded-lg p-4 bg-[#f8fafc]" style={{ lineHeight: LINE_HEIGHT }}>
          <div className="text-[#0f172a] font-semibold mb-1">
            Meddelande från Trafikledningen
          </div>
          <div className="text-[#0f172a]/80">
            {v(offer?.ops_message, "Inget meddelande just nu.")}
          </div>
        </div>

        {/* Reseavsnitt – två kolumner på md+ */}
        <div
          className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4"
          style={{ lineHeight: LINE_HEIGHT }}
        >
          {trips.map((trip, idx) => (
            <div key={idx}>
              <div className="flex items-center gap-2 text-[#0f172a] mb-2" style={{ lineHeight: LINE_HEIGHT }}>
                <Image src="/maps_pin.png" alt="Pin" width={18} height={18} />
                <span className="font-semibold">{trip.title}</span>
                <span className="text-xs text-[#0f172a]/50 ml-2">
                  Avstånd och tider baseras preliminärt
                </span>
              </div>

              <div className="border rounded-lg p-3 text-[14px] text-[#0f172a]" style={{ lineHeight: 1.5 }}>
                <div>
                  <span className="font-semibold">Avgång:</span> {trip.date} kl {trip.time}
                </div>
                <div>
                  <span className="font-semibold">Från:</span> {trip.from}
                </div>
                <div>
                  <span className="font-semibold">Till:</span> {trip.to}
                </div>
                <div>
                  <span className="font-semibold">Antal passagerare:</span> {trip.pax}
                </div>

                {/* Nya fält */}
                <div className="mt-2">
                  <span className="font-semibold">På plats:</span> {trip.onSite}
                </div>
                <div>
                  <span className="font-semibold">Sluttid:</span> {trip.endTime}
                </div>

                {/* Chaufför & fordon – visas bara om något finns */}
                {(trip.driver || trip.driverPhone) && (
                  <div className="mt-2">
                    <span className="font-semibold">Chaufför:</span>{" "}
                    {trip.driver || "—"}
                    {trip.driverPhone ? `, ${trip.driverPhone}` : ""}
                  </div>
                )}
                {(trip.vehicleReg || trip.vehicleModel) && (
                  <div>
                    <span className="font-semibold">Fordon:</span>{" "}
                    {[trip.vehicleReg, trip.vehicleModel].filter(Boolean).join(" – ") || "—"}
                  </div>
                )}

                <div className="mt-2">
                  <span className="font-semibold">Övrig information:</span>{" "}
                  <span className="whitespace-pre-wrap">{trip.extra}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer / villkor (samma textblock som tidigare stil) */}
        <div className="mt-7 text-[14px] text-[#0f172a]/70" style={{ lineHeight: 1.5 }}>
          <p>
            Genom att acceptera denna offert bekräftar ni samtidigt att ni tagit del av våra resevillkor,
            som ni hittar här. Observera att vi reserverar oss för att det aktuella datumet kan vara
            fullbokat. Slutlig kapacitet kontrolleras vid bokningstillfället och bekräftas först genom en
            skriftlig bokningsbekräftelse från oss. Vill du boka resan eller har du frågor och synpunkter?
            Då är du alltid välkommen att kontakta oss – vi hjälper dig gärna. Våra ordinarie öppettider
            är vardagar kl. <strong>08:00–17:00</strong>. För akuta bokningar med kortare varsel än två
            arbetsdagar ber vi dig ringa vårt journummer: <strong>010–777 21 58</strong>.
          </p>
        </div>

        {/* Signaturblock (samma som övriga sidor) */}
        <div
          className="mt-5 grid gap-2 text-xs text-[#0f172a]/60 sm:grid-cols-2 lg:grid-cols-4"
          style={{ lineHeight: LINE_HEIGHT }}
        >
          <div>
            <div>Helsingbuss</div>
            <div>Höjderupsgränd 12</div>
            <div>254 45 Helsingborg</div>
            <div>helsingbuss.se</div>
          </div>
          <div>
            <div>Tel. +46 (0) 405 38 38</div>
            <div>Jour: +46 (0) 777 21 58</div>
            <div>info@helsingbuss.se</div>
          </div>
          <div>
            <div>Bankgiro: 9810-01 3931</div>
            <div>Org.nr: 890101-1391</div>
            <div>VAT nr: SE890101931301</div>
          </div>
          <div>
            <div>Swedbank</div>
            <div>IBAN: 20000000000000000</div>
            <div>Swiftadress/BIC: XXXXXX</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Enkel rad med justerbar line-height (tajta rader i korten) */
function Row({
  label,
  value,
  wrap = false,
  lh = CARD_LH,
}: {
  label: string;
  value: string;
  wrap?: boolean;
  lh?: number;
}) {
  return (
    <div className="flex items-baseline gap-2 py-0" style={{ lineHeight: lh }}>
      <span className="text-sm text-[#0f172a]/70 font-semibold">{label}</span>
      <span className={`text-sm text-[#0f172a] ${wrap ? "break-all" : "whitespace-nowrap"}`}>
        {value}
      </span>
    </div>
  );
}
