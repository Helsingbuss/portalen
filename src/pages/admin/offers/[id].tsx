// src/pages/admin/offers/[id].tsx
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Header from "@/components/Header";
import AdminMenu from "@/components/AdminMenu";
import OfferCalculator from "@/components/offers/OfferCalculator";

type Offer = {
  id: string;
  offer_number: string | null;   // HB25xxx
  status: string | null;
  customer_reference: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  departure_place: string | null;
  destination: string | null;
  departure_date: string | null;
  departure_time: string | null;
  passengers: number | null;
  notes: string | null;
};

export default function AdminOfferDetail() {
  const router = useRouter();
  const { id } = router.query as { id?: string };

  const [loading, setLoading] = useState(true);
  const [offer, setOffer] = useState<Offer | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/offers/${id}`);
        if (!res.ok) throw new Error(`API ${res.status}`);
        const json = await res.json();
        setOffer(json?.offer ?? null);
      } catch (e: any) {
        setError(e?.message || "Kunde inte hämta offerten");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const titleSuffix = offer?.offer_number ? ` (${offer.offer_number})` : "";

  // Säkra värden till kalkylatorn (kräver offerId, offerNumber, customerEmail)
  const calculatorProps =
    offer
      ? {
          offerId: offer.id,
          offerNumber: offer.offer_number ?? "",
          // fallback om e-post saknas – skicka tom sträng (komponenten kontrollerar detta)
          customerEmail: offer.contact_email ?? "",
        }
      : null;

  return (
    <>
      <AdminMenu />
      <div className="min-h-screen bg-[#f5f4f0] lg:pl-64">
        <Header />

        <main className="p-6">
          <h1 className="text-xl font-semibold text-[#194C66] mb-4">
            Besvara offert{titleSuffix}
          </h1>

          <div className="bg-white rounded-xl shadow p-4">
            {loading && <div>Laddar…</div>}
            {!loading && error && (
              <div className="text-red-600">Fel: {error}</div>
            )}
            {!loading && !error && !offer && (
              <div>Ingen offert hittades.</div>
            )}

            {!loading && offer && (
              <div className="space-y-6">
                {/* Grundinfo */}
                <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-[#f8fafc] rounded-lg p-4">
                    <div className="text-sm text-[#194C66]/70 mb-1">Offert</div>
                    <div className="text-[#194C66]">
                      {/* ENDAST Offert-ID (HB25xxxx) */}
                      <div>
                        <span className="font-semibold">Offert-ID:</span>{" "}
                        {offer.offer_number || "—"}
                      </div>
                      <div>
                        <span className="font-semibold">Status:</span>{" "}
                        {offer.status || "—"}
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#f8fafc] rounded-lg p-4">
                    <div className="text-sm text-[#194C66]/70 mb-1">Kund</div>
                    <div className="text-[#194C66]">
                      <div>
                        <span className="font-semibold">Kontakt:</span>{" "}
                        {offer.customer_reference || "—"}
                      </div>
                      <div>
                        <span className="font-semibold">E-post:</span>{" "}
                        {offer.contact_email || "—"}
                      </div>
                      <div>
                        <span className="font-semibold">Telefon:</span>{" "}
                        {offer.contact_phone || "—"}
                      </div>
                    </div>
                  </div>
                </section>

                {/* Reseinfo */}
                <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-[#f8fafc] rounded-lg p-4">
                    <div className="text-sm text-[#194C66]/70 mb-1">Reseinformation</div>
                    <div className="text-[#194C66]">
                      <div>
                        <span className="font-semibold">Från:</span>{" "}
                        {offer.departure_place || "—"}
                      </div>
                      <div>
                        <span className="font-semibold">Till:</span>{" "}
                        {offer.destination || "—"}
                      </div>
                      <div>
                        <span className="font-semibold">Datum:</span>{" "}
                        {offer.departure_date || "—"}
                      </div>
                      <div>
                        <span className="font-semibold">Tid:</span>{" "}
                        {offer.departure_time || "—"}
                      </div>
                      <div>
                        <span className="font-semibold">Passagerare:</span>{" "}
                        {offer.passengers ?? "—"}
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#f8fafc] rounded-lg p-4">
                    <div className="text-sm text-[#194C66]/70 mb-1">Övrigt</div>
                    <div className="text-[#194C66] whitespace-pre-wrap">
                      {offer.notes || "Ingen information."}
                    </div>
                  </div>
                </section>

                {/* Kalkyl – aktiv modul */}
                <section className="bg-white border rounded-lg p-4">
                  <div className="text-[#194C66] font-semibold mb-3">Kalkyl</div>
                  {calculatorProps ? (
                    <OfferCalculator
                      offerId={calculatorProps.offerId}
                      offerNumber={calculatorProps.offerNumber}
                      customerEmail={calculatorProps.customerEmail}
                    />
                  ) : (
                    <div className="text-[#194C66]/70">
                      Väntar på offertdata…
                    </div>
                  )}
                </section>
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  );
}
