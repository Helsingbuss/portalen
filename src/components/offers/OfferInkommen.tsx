// src/components/offers/OfferInkommen.tsx
import Image from "next/image";
import StatusBadge from "@/components/StatusBadge";

type OfferInkommenProps = { offer: any };

// Globala rattar fÃ¶r radavstÃ¥nd
const LINE_HEIGHT = 1.5;   // resten av sidan
const CARD_LH     = 1.25;  // tajtare i korten Ã¶verst

function v(x: any, fallback = "â€”") {
  if (x === null || x === undefined || x === "") return fallback;
  return String(x);
}

export default function OfferInkommen({ offer }: OfferInkommenProps) {
  const roundTrip = Boolean(offer?.round_trip);
  const withinSweden = (offer?.trip_type || "sverige") !== "utrikes";

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
  const offerNo = v(offer?.offer_number, "HB25XXX");

  return (
    <div className="min-h-screen bg-[#f5f4f0] py-6">
      <div className="mx-auto w-full max-w-4xl bg-white rounded-lg shadow px-6 py-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center">
            <Image src="/mork_logo.png" alt="Helsingbuss" width={360} height={64} priority />
          </div>
          <div className="pt-1 text-right">
            <StatusBadge status="inkommen" />
          </div>
        </div>

        {/* Titel */}
        <h1 className="mt-2 text-2xl font-semibold text-[#0f172a]">
          OffertfÃ¶rfrÃ¥gan {offerNo}
        </h1>

        {/* Ã–vre kort â€“ tajt layout */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Offertinformation */}
          <div
            className="border rounded-lg p-4 space-y-[0,5px]"
            style={{ lineHeight: CARD_LH as number }}
          >
            <Row label="Offertdatum" value={v(offer?.offer_date, "â€”")} lh={CARD_LH} />
            <Row label="Er referens" value={v(offer?.customer_reference, "â€”")} lh={CARD_LH} />
            <Row label="VÃ¥r referens" value={v(offer?.internal_reference, "â€”")} lh={CARD_LH} />
          </div>

          {/* Kundkort */}
          <div
            className="border rounded-lg p-4 space-y-[0,5px]"
            style={{ lineHeight: CARD_LH as number }}
          >
            <Row label="Namn" value={v(offer?.contact_person, "â€”")} lh={CARD_LH} />
            <Row label="Adress" value={v(offer?.customer_address, "â€”")} lh={CARD_LH} />
            <Row label="Telefon" value={v(offer?.contact_phone, "â€”")} lh={CARD_LH} />
            <Row label="E-post" value={v(offer?.contact_email, "â€”")} lh={CARD_LH} wrap />
          </div>
        </div>

        {/* Intro */}
        <div className="mt-5 text-[14px] text-[#0f172a]/80" style={{ lineHeight: LINE_HEIGHT }}>
          <p>
            Hej!
            <br />
            Tack fÃ¶r att ni kontaktade Helsingbuss â€“ vi ser fram emot att fÃ¥
            ta hand om er resa. Vi har tagit fram ett genomtÃ¤nkt upplÃ¤gg som
            fÃ¶renar bekvÃ¤mlighet, sÃ¤kerhet och smidig planering. I offerten
            nedan hittar ni tydliga specifikationer och pris. SÃ¤g bara till om
            ni vill lÃ¤gga till nÃ¥got, byta tider eller uppgradera komfort â€“ vi
            skrÃ¤ddarsyr gÃ¤rna efter era Ã¶nskemÃ¥l.
          </p>
        </div>

        {/* Reseavsnitt â€“ tvÃ¥ kolumner pÃ¥ md+ */}
        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4" style={{ lineHeight: LINE_HEIGHT }}>
          {trips.map((trip, idx) => (
            <div key={idx}>
              <div className="flex items-center gap-2 text-[#0f172a] mb-2" style={{ lineHeight: LINE_HEIGHT }}>
                <Image src="/maps_pin.png" alt="Pin" width={18} height={18} />
                <span className="font-semibold">{trip.title}</span>
                <span className="text-xs text-[#0f172a]/50 ml-2">
                  AvstÃ¥nd och tider baseras preliminÃ¤rt
                </span>
              </div>

              <div className="border rounded-lg p-3 text-[14px] text-[#0f172a]" style={{ lineHeight: 1.5 }}>
                <div>
                  <span className="font-semibold">AvgÃ¥ng:</span> {v(trip.date)} kl {v(trip.time)}
                </div>
                <div>
                  <span className="font-semibold">FrÃ¥n:</span> {v(trip.from)}
                </div>
                <div>
                  <span className="font-semibold">Till:</span> {v(trip.to)}
                </div>
                <div>
                  <span className="font-semibold">Antal passagerare:</span> {v(trip.pax)}
                </div>
                <div className="mt-1">
                  <span className="font-semibold">Ã–vrig information:</span>{" "}
                  <span className="whitespace-pre-wrap">{trip.extra}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer / villkor */}
        <div className="mt-7 text-[14px] text-[#0f172a]/70" style={{ lineHeight: 1.5 }}>
          <p>
            Vid eventuell Ã¤ndring av uppdragstiden eller kÃ¶rstrÃ¤ckan utÃ¶ver det
            som anges i offerten tillkommer tillÃ¤ggsdebitering. Vi reserverar
            oss fÃ¶r flertalet frÃ¥gor samt eventuella Ã¤ndringar eller pÃ¥lagor som
            ligger utanfÃ¶r vÃ¥r kontroll. Vid behov av ombokning ansvarar
            bestÃ¤llaren fÃ¶r att ombokningstid fÃ¶ljer.
          </p>
          <p className="mt-3">
            Har du frÃ¥gor, funderingar eller vill bekrÃ¤fta bokningen? Tveka inte
            att kontakta oss pÃ¥ <strong>010-405 38 38</strong> (vardagar kl.
            08.00â€“17.00). FÃ¶r akuta Ã¤renden utanfÃ¶r kontorstid nÃ¥r du vÃ¥r
            jourtelefon pÃ¥ <strong>010-777 21 58</strong>.
          </p>
          <p className="mt-4 uppercase text-[12px] tracking-wide">
            Obs: Detta Ã¤r endast en offert. VÃ¤lkommen med din bokning!
          </p>
        </div>

        {/* Signaturblock */}
        <div className="mt-5 grid gap-2 text-xs text-[#0f172a]/60 sm:grid-cols-2 lg:grid-cols-4" style={{ lineHeight: LINE_HEIGHT }}>
          <div>
            <div>Helsingbuss</div>
            <div>HÃ¶jderupsgrÃ¤nd 12</div>
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

/** Enkelradig rad: â€Label VÃ¤rdeâ€ â€“ tajt som standard i korten via lh-prop */
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
      {/* <-- FETSTIL PÃ… ETIKETTERNA */}
      <span className="text-sm font-semibold text-[#0f172a]/70">{label}</span>
      <span className={`text-sm text-[#0f172a] ${wrap ? "break-all" : "whitespace-nowrap"}`}>
        {value}
      </span>
    </div>
  );
}

