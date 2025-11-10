// src/pages/offert/preview.tsx
import Head from "next/head";
import { useRouter } from "next/router";

// Ta in dina visningskomponenter
import OfferInkommen from "@/components/offers/OfferInkommen";
import OfferBesvarad from "@/components/offers/OfferBesvarad";
import OfferGodkand from "@/components/offers/OfferGodkand";
import OfferMakulerad from "@/components/offers/OfferMakulerad";

const baseOffer = {
  id: "preview-id",
  offer_number: "HB25PREVIEW",
  status: "inkommen",
  offer_date: "2025-10-31",

  // referenser/kund
  customer_reference: "Kundens referens",
  internal_reference: "Vår referens",
  contact_person: "Namn Efternamn",
  customer_address: "Gatan 1, 254 45 Helsingborg",
  contact_phone: "+46 (0)10-405 38 38",
  contact_email: "info@helsingbuss.se",

  // resa (ut)
  trip_type: "sverige",               // "sverige" | "utrikes"
  passengers: 15,
  departure_place: "Kristianstad",
  destination: "Malmö C",
  departure_date: "2025-10-31",
  departure_time: "10:00",
  notes: "Ingen information.",

  // retur (läggs på dynamiskt i komponenten nedan)
  return_departure: null,
  return_destination: null,
  return_date: null,
  return_time: null,

  // ev. nytt fält
  customer_number: "K10023",
};

export default function OffertPreview() {
  const { query } = useRouter();

  // Query params:
  // ?status=inkommen|besvarad|godkand|makulerad
  // &round=1 (visa tur & retur)
  // &utrikes=1 (ändra rubrik till "utomlands")
  const status = String(query.status || "inkommen").toLowerCase();
  const roundTrip = query.round === "1";
  const utrikes = query.utrikes === "1";

  const offer = {
    ...baseOffer,
    status,
    trip_type: utrikes ? "utrikes" : "sverige",
    ...(roundTrip
      ? {
          return_departure: baseOffer.destination,
          return_destination: baseOffer.departure_place,
          return_date: baseOffer.departure_date,
          return_time: "19:00",
        }
      : {}),
  };

  const title = `Förhandsvisning – ${status}`;

  // Välj komponent som i riktiga sidan
  let View: any = OfferInkommen;
  if (status === "besvarad") View = OfferBesvarad;
  else if (status === "godkand" || status === "godkänd") View = OfferGodkand;
  else if (status === "makulerad") View = OfferMakulerad;

  return (
    <>
      <Head><title>{title}</title></Head>
      <View offer={offer} />
    </>
  );
}
