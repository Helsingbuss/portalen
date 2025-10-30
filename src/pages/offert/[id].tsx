// src/pages/offert/[id].tsx
import Head from "next/head";
import type { GetServerSideProps } from "next";

// OBS: dina design-komponenter
import OfferInkommen from "@/components/offers/OfferInkommen";
import OfferBesvarad from "@/components/offers/OfferBesvarad";
import OfferGodkand from "@/components/offers/OfferGodkand";
import OfferMakulerad from "@/components/offers/OfferMakulerad";

type Offer = {
  id: string;
  offer_number?: string | null;
  status?: string | null;
  // resten av dina fält – vi skickar vidare allt som finns
  [key: string]: any;
};

type Props = { offer: Offer | null };

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const slug = ctx.params?.id as string;

  const base =
    process.env.NEXT_PUBLIC_BASE_URL ||
    `http://${ctx.req.headers.host as string}`;

  try {
    // Hämtar via nya API:t som stödjer både id & offer_number
    const resp = await fetch(`${base}/api/offers/${encodeURIComponent(slug)}`);
    if (!resp.ok) return { props: { offer: null } };
    const json = await resp.json();
    return { props: { offer: (json?.offer ?? null) as Offer | null } };
  } catch {
    return { props: { offer: null } };
  }
};

export default function OffertPublic({ offer }: Props) {
  if (!offer) {
    return (
      <>
        <Head><title>Offert saknas</title></Head>
        <main className="min-h-screen bg-[#f5f4f0] flex items-center justify-center">
          <div className="text-[#194C66]">Kunde inte hitta offerten.</div>
        </main>
      </>
    );
  }

  const status = (offer.status || "").toLowerCase();
  const title = offer.offer_number
    ? `Offertförfrågan ${offer.offer_number}`
    : "Offertförfrågan";

  // Välj din design-komponent enligt status.
  // Vi sprider hela offer-objektet OCH skickar "offer" ifall komponenten förväntar sig ett offer-prop.
  const commonProps: any = { ...offer, offer };

  let View = OfferInkommen as any;
  if (status === "besvarad") View = OfferBesvarad;
  else if (status === "godkand" || status === "godkänd") View = OfferGodkand;
  else if (status === "makulerad") View = OfferMakulerad;

  return (
    <>
      <Head><title>{title}</title></Head>
      {/* rendera komponenten rakt av – den äger all styling/layout */}
      <View {...commonProps} />
    </>
  );
}
