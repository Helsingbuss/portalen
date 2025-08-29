// src/pages/offert/[offerId].tsx
import { GetServerSideProps } from "next";
import { supabase } from "@/lib/supabaseClient";

import OfferInkommen from "@/components/offers/OfferInkommen";
import OfferBesvarad from "@/components/offers/OfferBesvarad";
import OfferGodkand from "@/components/offers/OfferGodkand";
import OfferMakulerad from "@/components/offers/OfferMakulerad";

export default function OfferPage({ offer }: any) {
  if (!offer) return <p>Ingen offert hittades</p>;

  switch (offer.status) {
    case "inkommen":
      return <OfferInkommen offer={offer} />;
    case "besvarad":
      return <OfferBesvarad offer={offer} />;
    case "godkänd":
      return <OfferGodkand offer={offer} />;
    case "makulerad":
      return <OfferMakulerad offer={offer} />;
    default:
      return <p>Okänd status</p>;
  }
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { offerId } = context.query;

  const { data: offer, error } = await supabase
    .from("offers")
    .select("*")
    .eq("offer_number", offerId)
    .single();

  return {
    props: {
      offer,
    },
  };
};
