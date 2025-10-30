// src/pages/offert/[offerId].tsx
import { GetServerSideProps } from "next";
import { supabase } from "@/lib/supabaseClient";

import OfferInkommen from "@/components/offers/OfferInkommen";
import OfferBesvarad from "@/components/offers/OfferBesvarad";
import OfferGodkand from "@/components/offers/OfferGodkand";
import OfferMakulerad from "@/components/offers/OfferMakulerad";

export default function OfferPage({ offer }: any) {
  if (!offer) return <p>Ingen offert hittades</p>;

  // 🟢 Styr vilket UI som ska visas baserat på status
  switch (offer.status) {
    case "inkommen":
      return <OfferInkommen offer={offer} />;
    case "besvarad":
      return <OfferBesvarad offer={offer} />;
    case "godkand":
      return <OfferGodkand offer={offer} />;
    case "makulerad":
      return <OfferMakulerad offer={offer} />;
    default:
      return (
        <p>
          Okänt statusläge <strong>{offer.status}</strong> för offert{" "}
          {offer.offer_number}
        </p>
      );
  }
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { offerId } = context.query;

  // 🔎 Hämta offert från databasen baserat på offer_number (t.ex. HB25007)
  const { data: offer, error } = await supabase
    .from("offers")
    .select("*")
    .eq("offer_number", offerId)
    .single();

  if (error) {
    console.error("Fel vid hämtning av offert:", error.message);
  }

  return {
    props: {
      offer: offer || null,
    },
  };
};
