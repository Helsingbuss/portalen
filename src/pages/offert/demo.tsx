// src/pages/offert/demo.tsx
import { useRouter } from "next/router";
import OfferInkommen from "@/components/offers/OfferInkommen";
import OfferBesvarad from "@/components/offers/OfferBesvarad";
import OfferMakulerad from "@/components/offers/OfferMakulerad";
import OfferBokningsbekraftelse from "@/components/offers/OfferBokningsbekraftelse";

// (lägg ev. till OfferGodkand / OfferAvbojd här om du har dem)

function makeOffer(kind: "single" | "roundtrip") {
  const round = kind === "roundtrip";

  // demo-priser per sträcka
  const legs =
    kind === "single"
      ? [{ subtotExVat: 8500, vat: 2125, total: 10625 }]
      : [
          { subtotExVat: 8400, vat: 2100, total: 10500 },
          { subtotExVat: 7800, vat: 1950, total: 9750 },
        ];

  const grandEx = legs.reduce((s, l) => s + l.subtotExVat, 0);
  const grandVat = legs.reduce((s, l) => s + l.vat, 0);
  const grandTot = legs.reduce((s, l) => s + l.total, 0);

  return {
    id: "demo123",
    offer_number: "HB25PREVIEW",
    offer_date: "2025-10-31",
    status: "inkommen",

    // kund
    customer_reference: "Namn Efternamn",
    internal_reference: "Vår referens",
    contact_person: "Namn Efternamn",
    contact_phone: "+46 (0)10-405 38 38",
    contact_email: "info@helsingbuss.se",
    customer_address: "Exempelgatan 12, 123 45 Exempelstad",

    // resa
    passengers: 15,
    notes: "Ingen information.",
    trip_type: "sverige",
    round_trip: round,
    departure_date: "2025-10-31",
    departure_time: "10:00",
    departure_place: "Kristianstad",
    destination: "Malmö C",
    return_date: round ? "2025-10-31" : null,
    return_time: round ? "19:00" : null,

    // totals
    amount_ex_vat: grandEx,
    vat_amount: grandVat,
    total_amount: grandTot,
    vat_breakdown: {
      grandExVat: grandEx,
      grandVat: grandVat,
      grandTotal: grandTot,
      legs,
    },
  };
}

export default function OfferDemoPage() {
  const r = useRouter();
  const view = String(r.query.view || "inkommen").toLowerCase();
  const kind = (String(r.query.kind || "single").toLowerCase() === "roundtrip"
    ? "roundtrip"
    : "single") as "single" | "roundtrip";

  const base = makeOffer(kind);

  if (view === "makulerad") {
    return <OfferMakulerad offer={{ ...base, status: "makulerad" }} />;
  }

  if (view === "besvarad") {
    return <OfferBesvarad offer={{ ...base, status: "besvarad" }} />;
  }

  if (view === "bokning") {
    // demo-data för Bokningsbekräftelse (buss/driver/kommentar)
    const bookingDemo = {
      ...base,
      status: "bokning",
      bus_name: "Mercedes-Benz Tourismo 17.3 RHD",
      bus_reg: "ABC 123",
      driver_name: "Mikael Svensson",
      driver_phone: "+46 (0)70-123 45 67",
      ops_comment:
        "Chauffören kontaktar referens 15 min före avgång. Extra stopp vid Circle K enligt överenskommelse.",
    };
    return <OfferBokningsbekraftelse offer={bookingDemo} />;
  }

  // fallback: inkommet
  return <OfferInkommen offer={{ ...base, status: "inkommen" }} />;
}
