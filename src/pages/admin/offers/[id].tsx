// src/pages/admin/offers/[id].tsx
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Header from "@/components/Header";
import AdminMenu from "@/components/AdminMenu";
import OfferCalculator from "@/components/offers/OfferCalculator";

type Offer = {
  id: string;
  offer_number: string | null;
  status: string | null;

  customer_reference: string | null;
  contact_email: string | null;
  contact_phone: string | null;

  // Utresa
  departure_place: string | null;
  destination: string | null;
  departure_date: string | null;
  departure_time: string | null;

  // Retur
  return_departure: string | null;
  return_destination: string | null;
  return_date: string | null;
  return_time: string | null;

  passengers: number | null;
  notes: string | null;
};

function toIntOrNull(v: any): number | null {
  if (typeof v === "number") return v;
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Normalisera olika API-svar till Offer */
function normalizeOffer(o: any | null | undefined): Offer | null {
  if (!o) return null;
  return {
    id: o.id,
    offer_number: o.offer_number ?? o.offer_no ?? o.offerId ?? null,
    status: o.status ?? null,

    customer_reference: o.customer_reference ?? o.reference ?? null,
    contact_email: o.contact_email ?? o.customer_email ?? o.email ?? null,
    contact_phone: o.contact_phone ?? o.customer_phone ?? o.phone ?? null,

    // Utresa
    departure_place: o.departure_place ?? o.from ?? o.departure_location ?? null,
    destination: o.destination ?? o.to ?? o.destination_location ?? null,
    departure_date: o.departure_date ?? o.date ?? null,
    departure_time: o.departure_time ?? o.time ?? null,

    // Retur
    return_departure: o.return_departure ?? o.return_from ?? o.ret_from ?? null,
    return_destination: o.return_destination ?? o.return_to ?? o.ret_to ?? null,
    return_date: o.return_date ?? o.ret_date ?? null,
    return_time: o.return_time ?? o.ret_time ?? null,

    passengers: toIntOrNull(o.passengers),
    notes: o.notes ?? o.message ?? o.other_info ?? null,
  };
}

/** Hämtar via vårt API (stöder både UUID och offer_number) */
async function fetchOfferById(id: string): Promise<Offer | null> {
  try {
    const res = await fetch(`/api/offers/${encodeURIComponent(id)}`);
    if (!res.ok) return null;
    const json = await res.json().catch(() => null);
    const raw = json?.offer ?? json;
    return normalizeOffer(raw);
  } catch {
    return null;
  }
}

export default function AdminOfferDetail() {
  const router = useRouter();
  const { id } = router.query as { id?: string };

  const [loading, setLoading] = useState(true);
  const [offer, setOffer] = useState<Offer | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const off = await fetchOfferById(id);
        if (cancelled) return;
        if (!off) throw new Error("Kunde inte hämta offerten (API).");
        setOffer(off);
      } catch (e: any) {
        setError(e?.message || "Kunde inte hämta offerten");
        setOffer(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const titleSuffix = offer?.offer_number ? ` (${offer.offer_number})` : "";
  const hasReturn =
    !!(offer?.return_departure || offer?.return_destination || offer?.return_date || offer?.return_time);

  // OfferCalculator behöver dessa tre:
  const calculatorProps =
    offer
      ? {
          offerId: offer.id,
          offerNumber: offer.offer_number ?? "",
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
              <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 p-3">
                Fel: {error}
              </div>
            )}
            {!loading && !error && !offer && <div>Ingen offert hittades.</div>}

            {!loading && offer && (
              <div className="space-y-6">
                {/* Grundinfo */}
                <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-[#f8fafc] rounded-lg p-4">
                    <div className="text-sm text-[#194C66]/70 mb-1">Offert</div>
                    <div className="text-[#194C66]">
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

                {/* Reseinfo utresa */}
                <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-[#f8fafc] rounded-lg p-4">
                    <div className="text-sm text-[#194C66]/70 mb-1">
                      Reseinformation
                    </div>
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

                {/* Reseinfo retur */}
                {hasReturn && (
                  <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-[#f8fafc] rounded-lg p-4">
                      <div className="text-sm text-[#194C66]/70 mb-1">Retur</div>
                      <div className="text-[#194C66]">
                        <div>
                          <span className="font-semibold">Från:</span>{" "}
                          {offer.return_departure || "—"}
                        </div>
                        <div>
                          <span className="font-semibold">Till:</span>{" "}
                          {offer.return_destination || "—"}
                        </div>
                        <div>
                          <span className="font-semibold">Datum:</span>{" "}
                          {offer.return_date || "—"}
                        </div>
                        <div>
                          <span className="font-semibold">Tid:</span>{" "}
                          {offer.return_time || "—"}
                        </div>
                      </div>
                    </div>

                    <div className="bg-[#f8fafc] rounded-lg p-4 hidden md:block" />
                  </section>
                )}

                {/* Kalkyl (DIN komponent) */}
                <section className="bg-white border rounded-lg p-4">
                  <div className="text-[#194C66] font-semibold mb-3">Kalkyl</div>
                  {calculatorProps ? (
                    <OfferCalculator
                      offerId={calculatorProps.offerId}
                      offerNumber={calculatorProps.offerNumber}
                      customerEmail={calculatorProps.customerEmail}
                    />
                  ) : (
                    <div className="text-[#194C66]/70">Väntar på offertdata…</div>
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
