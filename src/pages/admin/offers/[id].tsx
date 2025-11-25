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

  // Kontakt/kund
  customer_reference: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  company_name: string | null;
  po_reference: string | null;
  org_number: string | null;

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

  // Nya fält (formuläret)
  passengers: number | null;
  stopover_places: string | null; // via / stopp
  extra_stops: string | null;
  trip_kind: string | null; // enkel / tur_ret
  final_destination: string | null;
  need_bus_on_site: string | null;
  site_notes: string | null;
  base_at_destination: string | null;
  last_day_on_site: string | null;
  end_time: string | null;
  local_runs: string | null;
  standby_hours: string | null;
  parking: string | null;
  onboard_contact: string | null;
  more_trip_info: string | null;

  notes: string | null; // legacy
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

    // Kontakt/kund
    customer_reference:
      o.customer_reference ?? o.reference ?? o.contact_person ?? null,
    contact_email: o.contact_email ?? o.customer_email ?? o.email ?? null,
    contact_phone: o.contact_phone ?? o.customer_phone ?? o.phone ?? null,
    company_name: o.company_name ?? o.foretag_forening ?? null,
    po_reference: o.po_reference ?? o.referens_po_nummer ?? null,
    org_number: o.org_number ?? null,

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

    // Nya fält
    passengers: toIntOrNull(o.passengers),
    stopover_places: o.stopover_places ?? o.via ?? null,
    extra_stops: o.stop ?? null,
    trip_kind: o.trip_kind ?? o.enkel_tur_retur ?? null,
    final_destination: o.final_destination ?? null,
    need_bus_on_site: o.need_bus_on_site ?? o.behov_er_buss ?? null,
    site_notes: o.site_notes ?? o.notis_pa_plats ?? null,
    base_at_destination: o.base_at_destination ?? o.basplats_pa_destination ?? null,
    last_day_on_site: o.last_day_on_site ?? o.last_day_ ?? null,
    end_time: o.end_time ?? null,
    local_runs: o.local_runs ?? o.local_kor ?? null,
    standby_hours: o.standby_hours ?? o.standby ?? null,
    parking: o.parking ?? null,
    onboard_contact: o.onboard_contact ?? null,
    more_trip_info: o.more_trip_info ?? o.contact_person ?? null,

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
  const [creating, setCreating] = useState(false);

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
    !!(offer?.return_departure ||
      offer?.return_destination ||
      offer?.return_date ||
      offer?.return_time);

  // OfferCalculator behöver dessa tre:
  const calculatorProps =
    offer && offer.contact_email
      ? {
          offerId: offer.id,
          offerNumber: offer.offer_number ?? "",
          customerEmail: offer.contact_email,
        }
      : null;

  async function createBookingFromOffer() {
    if (!offer?.id) return;
    const ok = confirm("Skapa bokning från denna offert?");
    if (!ok) return;

    try {
      setCreating(true);
      const r = await fetch("/api/bookings/from-offer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ offerId: offer.id }),
      });
      const j = await r.json().catch(() => ({} as any));
      if (!r.ok) throw new Error(j?.error || "Kunde inte skapa bokning.");
      alert(`Bokning skapad (${j.booking?.booking_number || "BK…"})`);
      router.push("/admin/bookings");
    } catch (e: any) {
      alert(e?.message || "Ett fel uppstod vid skapande av bokning.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <>
      <AdminMenu />
      <div className="min-h-screen bg-[#f5f4f0] lg:pl-64">
        <Header />

        <main className="p-6 space-y-6">
          {/* Titelrad – samma stil som Skapa offert */}
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-[#194C66]">
              Besvara offert
              <span className="text-[#194C66]/60 font-normal">
                {titleSuffix}
              </span>
            </h1>

            {offer && (
              <button
                onClick={createBookingFromOffer}
                disabled={creating}
                className={`px-4 py-2 rounded-[25px] text-sm text-white ${
                  creating
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-[#111827] hover:bg-black"
                }`}
              >
                {creating ? "Skapar…" : "Skapa bokning"}
              </button>
            )}
          </div>

          {/* Felmeddelanden / laddning */}
          {loading && (
            <div className="rounded-lg bg-white shadow p-4 text-sm text-[#194C66]">
              Laddar offert…
            </div>
          )}

          {!loading && error && (
            <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 p-3 text-sm">
              Fel: {error}
            </div>
          )}

          {!loading && !error && !offer && (
            <div className="rounded-lg bg-white shadow p-4 text-sm text-[#194C66]">
              Ingen offert hittades.
            </div>
          )}

          {!loading && offer && (
            <>
              {/* Övre rader – Offert / Kund / Reseinfo / Plats & logistik */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Offert – vänster kort */}
                <section className="bg-white rounded-xl shadow p-4 space-y-2">
                  <div className="mb-1">
                    <span className="inline-block px-3 py-1 rounded-full bg-[#111827] text-white text-[11px]">
                      Offert
                    </span>
                  </div>
                  <div className="text-sm text-[#194C66] space-y-1">
                    <div>
                      <span className="font-semibold">Offert-ID:</span>{" "}
                      {offer.offer_number || "—"}
                    </div>
                    <div>
                      <span className="font-semibold">Status:</span>{" "}
                      {offer.status || "inkommen"}
                    </div>
                    <div>
                      <span className="font-semibold">Typ av resa:</span>{" "}
                      {offer.trip_kind || (hasReturn ? "Tur & retur" : "Enkel")}
                    </div>
                    <div>
                      <span className="font-semibold">Passagerare:</span>{" "}
                      {offer.passengers ?? "—"}
                    </div>
                  </div>
                </section>

                {/* Kund – höger kort uppe */}
                <section className="bg-white rounded-xl shadow p-4 space-y-2 lg:col-span-2">
                  <div className="mb-1">
                    <span className="inline-block px-3 py-1 rounded-full bg-[#111827] text-white text-[11px]">
                      Kund
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1 text-sm text-[#194C66]">
                    <div>
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
                    <div>
                      <div>
                        <span className="font-semibold">
                          Företag / förening:
                        </span>{" "}
                        {offer.company_name || "—"}
                      </div>
                      <div>
                        <span className="font-semibold">Ref / PO-nummer:</span>{" "}
                        {offer.po_reference || "—"}
                      </div>
                      <div>
                        <span className="font-semibold">
                          Organisationsnummer:
                        </span>{" "}
                        {offer.org_number || "—"}
                      </div>
                    </div>
                  </div>
                </section>
              </div>

              {/* Reseinfo + plats & logistik */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Reseinformation */}
                <section className="bg-white rounded-xl shadow p-4 space-y-2">
                  <div className="mb-1">
                    <span className="inline-block px-3 py-1 rounded-full bg-[#111827] text-white text-[11px]">
                      Reseinformation
                    </span>
                  </div>
                  <div className="text-sm text-[#194C66] space-y-1">
                    <div>
                      <span className="font-semibold">Från:</span>{" "}
                      {offer.departure_place || "—"}
                    </div>
                    <div>
                      <span className="font-semibold">Till:</span>{" "}
                      {offer.destination || "—"}
                    </div>
                    <div>
                      <span className="font-semibold">Slutmål:</span>{" "}
                      {offer.final_destination || "—"}
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
                      <span className="font-semibold">Via / stopp:</span>{" "}
                      {offer.stopover_places || offer.extra_stops || "—"}
                    </div>
                    <div>
                      <span className="font-semibold">Kontakt ombord:</span>{" "}
                      {offer.onboard_contact || "—"}
                    </div>
                  </div>
                </section>

                {/* Plats & logistik */}
                <section className="bg-white rounded-xl shadow p-4 space-y-2">
                  <div className="mb-1">
                    <span className="inline-block px-3 py-1 rounded-full bg-[#111827] text-white text-[11px]">
                      Plats & logistik
                    </span>
                  </div>
                  <div className="text-sm text-[#194C66] space-y-1">
                    <div>
                      <span className="font-semibold">
                        Behöver ni bussen på plats?
                      </span>{" "}
                      {offer.need_bus_on_site || "—"}
                    </div>
                    <div>
                      <span className="font-semibold">Notis på plats:</span>{" "}
                      {offer.site_notes || "—"}
                    </div>
                    <div>
                      <span className="font-semibold">
                        Basplats på destinationen:
                      </span>{" "}
                      {offer.base_at_destination || "—"}
                    </div>
                    <div>
                      <span className="font-semibold">
                        Sista dagen (på plats):
                      </span>{" "}
                      {offer.last_day_on_site || "—"}
                    </div>
                    <div>
                      <span className="font-semibold">Sluttid:</span>{" "}
                      {offer.end_time || "—"}
                    </div>
                    <div>
                      <span className="font-semibold">Lokala körningar:</span>{" "}
                      {offer.local_runs || "—"}
                    </div>
                    <div>
                      <span className="font-semibold">
                        Väntetid / standby (timmar):
                      </span>{" "}
                      {offer.standby_hours || "—"}
                    </div>
                    <div>
                      <span className="font-semibold">
                        Parkering & tillstånd:
                      </span>{" "}
                      {offer.parking || "—"}
                    </div>
                  </div>
                </section>
              </div>

              {/* Returinfo + övrigt */}
              {hasReturn && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Retur */}
                  <section className="bg-white rounded-xl shadow p-4 space-y-2">
                    <div className="mb-1">
                      <span className="inline-block px-3 py-1 rounded-full bg-[#111827] text-white text-[11px]">
                        Retur
                      </span>
                    </div>
                    <div className="text-sm text-[#194C66] space-y-1">
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
                  </section>

                  {/* Extra card för spacing eller annan info */}
                  <section className="bg-white rounded-xl shadow p-4 space-y-2">
                    <div className="mb-1">
                      <span className="inline-block px-3 py-1 rounded-full bg-[#111827] text-white text-[11px]">
                        Mer om resplanen
                      </span>
                    </div>
                    <div className="text-sm text-[#194C66] whitespace-pre-wrap">
                      {offer.more_trip_info || "—"}
                    </div>
                  </section>
                </div>
              )}

              {/* Övrig information */}
              <section className="bg-white rounded-xl shadow p-4">
                <div className="mb-1">
                  <span className="inline-block px-3 py-1 rounded-full bg-[#111827] text-white text-[11px]">
                    Övrig information
                  </span>
                </div>
                <div className="text-sm text-[#194C66] whitespace-pre-wrap">
                  {offer.notes || "Ingen information."}
                </div>
              </section>

              {/* Kalkyl & prisförslag – ny, mer designad box */}
              <section className="bg-white rounded-xl shadow p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="mb-1">
                      <span className="inline-block px-3 py-1 rounded-full bg-[#111827] text-white text-[11px]">
                        Kalkyl & prisförslag
                      </span>
                    </div>
                    <p className="text-xs text-[#194C66]/70 max-w-xl">
                      Räkna fram pris, spara som utkast eller skicka ett färdigt
                      prisförslag direkt till kunden. Uppgifterna nedan
                      sparas på offerten och används även i offertsidan som
                      kunden ser.
                    </p>
                  </div>
                </div>

                {calculatorProps ? (
                  <OfferCalculator
                    offerId={calculatorProps.offerId}
                    offerNumber={calculatorProps.offerNumber}
                    customerEmail={calculatorProps.customerEmail}
                  />
                ) : (
                  <div className="text-sm text-[#194C66]/70">
                    Saknar kundens e-postadress – komplettera offerten först.
                  </div>
                )}
              </section>
            </>
          )}
        </main>
      </div>
    </>
  );
}
