// src/pages/offert/preview/[id].tsx
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/lib/supabaseClient";

// Kundvyer (oförändrad design)
import OfferInkommen from "@/components/offers/OfferInkommen";
import OfferBesvarad from "@/components/offers/OfferBesvarad";
import OfferGodkand from "@/components/offers/OfferGodkand";

type Offer = {
  id: string;
  offer_number: string | null;
  status: string | null;
  customer_reference: string | null;
  contact_person: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  customer_address?: string | null;

  departure_place: string | null;
  destination: string | null;
  departure_date?: string | null;
  departure_time?: string | null;
  passengers: number | null;

  round_trip?: boolean | null;
  return_departure?: string | null;
  return_destination?: string | null;
  return_date?: string | null;
  return_time?: string | null;

  price_ex_vat?: number | null;
  vat?: number | null;
  price_total?: number | null;

  notes?: string | null;
  trip_type?: "sverige" | "utrikes" | null;
};

const FALLBACK: Offer = {
  id: "demo",
  offer_number: "HB25DEMO",
  status: "besvarad",
  customer_reference: "Andreas Ekelöf",
  contact_person: "Andreas Ekelöf",
  contact_email: "ekelof.andreas@hotmail.com",
  contact_phone: "0729423537",
  customer_address: "Helsingborg",
  departure_place: "Helsingborg C",
  destination: "Göteborg C",
  departure_date: "2025-12-10",
  departure_time: "12:00",
  passengers: 50,
  round_trip: true,
  return_departure: "Göteborg C",
  return_destination: "Helsingborg C",
  return_date: "2025-12-10",
  return_time: "20:00",
  trip_type: "sverige",
  price_ex_vat: 12500,
  vat: 750,
  price_total: 13250,
  notes: "Ingen information.",
};

export default function OfferPreviewPage() {
  const router = useRouter();
  const { id, view, demo } = router.query as {
    id?: string; // <— samma namn som filsegmentet
    view?: "inkommen" | "besvarad" | "godkand";
    demo?: string;
  };

  const [offer, setOffer] = useState<Offer | null>(null);
  const [loading, setLoading] = useState(true);
  const chosenView = (view || "inkommen") as "inkommen" | "besvarad" | "godkand";

  useEffect(() => {
    if (!router.isReady || !id) return;

    if (demo === "1") {
      setOffer(FALLBACK);
      setLoading(false);
      return;
    }

    (async () => {
      setLoading(true);

      // 1) Försök via offer_number (HBxxxx)
      let { data, error } = await supabase
        .from("offers")
        .select("*")
        .eq("offer_number", id)
        .maybeSingle();

      // 2) Fallback via primärnyckeln (UUID)
      if (!data) {
        const tryId = await supabase
          .from("offers")
          .select("*")
          .eq("id", id)
          .maybeSingle();
        data = tryId.data as any;
        error = tryId.error as any;
      }

      if (error) console.error("Preview fetch error:", error);

      setOffer((data as any) ?? null);
      setLoading(false);
    })();
  }, [router.isReady, id, demo]);

  const withinSweden = useMemo(() => {
    const t = (offer?.trip_type || "sverige").toLowerCase();
    return t !== "utrikes";
  }, [offer?.trip_type]);

  if (loading) return <div className="min-h-screen bg-[#f5f4f0] p-6">Laddar…</div>;

  if (!offer) {
    return (
      <div className="min-h-screen bg-[#f5f4f0] p-6">
        <div className="max-w-3xl mx-auto bg-white rounded-lg shadow p-6">
          <h1 className="text-xl font-semibold text-[#0f172a] mb-2">Hittade ingen offert</h1>
          <p className="text-[#0f172a]/70">
            Ingen offert med nummer eller id <strong>{id}</strong>. Lägg till{" "}
            <code>?demo=1</code> för att se layouten utan DB.
          </p>
        </div>
      </div>
    );
  }

  if (chosenView === "besvarad") return <OfferBesvarad offer={offer} />;
  if (chosenView === "godkand") return <OfferGodkand offer={offer} />;
  return <OfferInkommen offer={offer} />;
}
