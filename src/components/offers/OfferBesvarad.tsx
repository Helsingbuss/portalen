// src/components/offers/OfferBesvarad.tsx
import Image from "next/image";
import StatusBadge from "@/components/StatusBadge";
import { useState } from "react";

type Breakdown = {
  grandExVat: number;
  grandVat: number;
  grandTotal: number;
  serviceFeeExVat?: number;
  legs?: { subtotExVat: number; vat: number; total: number }[];
};

function money(n?: number | null) {
  if (n == null) return "—";
  return n.toLocaleString("sv-SE", { style: "currency", currency: "SEK" });
}

export default function OfferBesvarad({ offer }: any) {
  const roundTrip = Boolean(offer?.round_trip);
  const withinSweden = (offer?.trip_type || "sverige") !== "utrikes";

  // trips som innan
  const trips = [
    {
      title: roundTrip ? "Utresa" : "Bussresa",
      date: offer?.departure_date,
      time: offer?.departure_time,
      from: offer?.departure_place,
      to: offer?.destination,
      pax: offer?.passengers,
      extra: offer?.notes || "Ingen information.",
    },
    ...(roundTrip
      ? [
          {
            title: "Återresa",
            date: offer?.return_date,
            time: offer?.return_time,
            from: offer?.destination,
            to: offer?.departure_place,
            pax: offer?.passengers,
            extra: offer?.notes || "Ingen information.",
          },
        ]
      : []),
  ];

  // totals & per-resa
  const breakdown: Breakdown | null =
    typeof offer?.vat_breakdown === "object" && offer?.vat_breakdown
      ? (offer.vat_breakdown as Breakdown)
      : null;

  const totals = {
    ex: offer?.amount_ex_vat ?? breakdown?.grandExVat ?? null,
    vat: offer?.vat_amount ?? breakdown?.grandVat ?? null,
    sum: offer?.total_amount ?? breakdown?.grandTotal ?? null,
  };

  // --- NYTT: acceptera-logik ---
  const [accepting, setAccepting] = useState(false);

  async function onAcceptOffer() {
    if (!offer?.id || !offer?.offer_number || !offer?.contact_email) {
      alert("Saknas uppgifter för att kunna acceptera (id/nummer/e-post).");
      return;
    }
    try {
      setAccepting(true);
      const res = await fetch(`/api/offers/${offer.id}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerEmail: offer.contact_email,
          offerNumber: offer.offer_number,
        }),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || `HTTP ${res.status}`);
      }

      // Visa bokningsvy (godkänd)
      window.location.href = `/offert/${offer.offer_number}?view=godkand`;
    } catch (e: any) {
      alert(e?.message || "Tekniskt fel vid godkännande.");
    } finally {
      setAccepting(false);
    }
  }
  // --- SLUT NYTT ---

  return (
    <div className="min-h-screen bg-[#f5f4f0] py-6">
      <div className="mx-auto w-full max-w-4xl bg-white rounded-lg shadow px-6 py-6">
        {/* Header-rad: logga + status */}
        <div className="flex items-start justify-between">
          <div className="flex items-center">
            <Image src="/mork_logo.png" alt="Helsingbuss" width={360} height={64} priority />
          </div>
          <div className="pt-1 text-right">
            <StatusBadge status="besvarad" />
          </div>
        </div>

        {/* Titel */}
        <h1 className="mt-2 text-2xl font-semibold text-[#0f172a]">
          Offert {offer?.offer_number || "—"}
        </h1>

        {/* Övre kort – info + totals */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border rounded-lg p-4">
            <div className="flex items-baseline gap-2">
              <span className="text-sm text-[#0f172a]/70 font-semibold">Offertdatum</span>
              <span className="text-[#0f172a]">{offer?.offer_date || "—"}</span>
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-sm text-[#0f172a]/70 font-semibold">Er referens</span>
              <span className="text-[#0f172a]">{offer?.customer_reference || "—"}</span>
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-sm text-[#0f172a]/70 font-semibold">Vår referens</span>
              <span className="text-[#0f172a]">{offer?.internal_reference || "—"}</span>
            </div>

            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-sm text-[#0f172a]/70 font-semibold">Summa exkl. moms</span>
              <span className="text-[#0f172a]">{money(totals.ex)}</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-sm text-[#0f172a]/70 font-semibold">Moms</span>
              <span className="text-[#0f172a]">{money(totals.vat)}</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-sm text-[#0f172a]/70 font-semibold">Totalsumma</span>
              <span className="text-[#0f172a]">{money(totals.sum)}</span>
            </div>

            <div className="mt-3 text-sm text-[#0f172a]/70">
              Fakturan skickas efter uppdraget
            </div>
          </div>

          {/* Kundkort */}
          <div className="border rounded-lg p-4">
            <div className="grid grid-cols-[80px_1fr] gap-x-2 text-sm">
              <div className="text-[#0f172a]/70 font-semibold">Namn</div>
              <div className="text-[#0f172a]">{offer?.contact_person || "—"}</div>

              <div className="text-[#0f172a]/70 font-semibold">Adress</div>
              <div className="text-[#0f172a]">{offer?.customer_address || "—"}</div>

              <div className="text-[#0f172a]/70 font-semibold">Telefon</div>
              <div className="text-[#0f172a]">{offer?.contact_phone || "—"}</div>

              <div className="text-[#0f172a]/70 font-semibold">E-post</div>
              <div className="text-[#0f172a] break-all">{offer?.contact_email || "—"}</div>
            </div>
          </div>
        </div>

        {/* Introtext */}
        <div className="mt-5 text-[15px] leading-relaxed text-[#0f172a]/80">
          <p>
            Hej!
            <br />
            Ert offertförslag är klart – ta del av detaljerna. Vi har samlat allt ni behöver: rutt,
            tider, fordon och pris – tydligt och överskådligt. Godkänn offerten så säkrar vi
            kapacitet och planerar den perfekta resan för er.
          </p>
        </div>

        {/* Reseavsnitt med pris per sträcka */}
        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          {trips.map((trip, idx) => {
            const leg = breakdown?.legs?.[idx];
            return (
              <div key={idx}>
                <div className="flex items-center gap-2 text-[#0f172a] mb-2">
                  <Image src="/maps_pin.png" alt="Pin" width={18} height={18} />
                  <span className="font-semibold">
                    {withinSweden ? "Bussresa inom Sverige" : "Bussresa utomlands"}
                  </span>
                  <span className="text-xs text-[#0f172a]/50 ml-2">
                    Avstånd och tider baseras preliminärt
                  </span>
                </div>

                <div className="border rounded-lg p-3 text-[14px] text-[#0f172a] leading-[1.5]">
                  <div>
                    <span className="font-semibold">Avgång:</span> {trip.date} kl {trip.time}
                  </div>
                  <div>
                    <span className="font-semibold">Från:</span> {trip.from}
                  </div>
                  <div>
                    <span className="font-semibold">Till:</span> {trip.to}
                  </div>
                  <div>
                    <span className="font-semibold">Antal passagerare:</span> {trip.pax ?? "—"}
                  </div>

                  {/* Pris-kolumn höger – per sträcka */}
                  <div className="grid grid-cols-[1fr_auto] gap-x-4 mt-2">
                    <div className="text-[#0f172a]/70">Pris exkl. moms</div>
                    <div>{money(leg?.subtotExVat)}</div>
                    <div className="text-[#0f172a]/70">Moms</div>
                    <div>{money(leg?.vat)}</div>
                    <div className="text-[#0f172a]/70">Summa</div>
                    <div>{money(leg?.total)}</div>
                  </div>

                  <div className="mt-2">
                    <span className="font-semibold">Övrig information:</span>{" "}
                    <span className="whitespace-pre-wrap">{trip.extra}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Handlingsrad (knappar) */}
        <div className="mt-8 text-center">
          <div className="text-xl font-semibold mb-3">
            Klicka nedan för att göra en bokningsförfrågan
          </div>
          <div className="flex flex-col md:flex-row justify-center gap-4">
            <button
              onClick={onAcceptOffer}
              disabled={accepting}
              className="bg-[#194C66] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#163b4d] disabled:opacity-60"
            >
              {accepting ? "Accepterar…" : "Acceptera offert"}
            </button>
            <button className="bg-[#223] text-white/90 px-6 py-3 rounded-lg font-medium">
              Ändra din offert
            </button>
            <button className="bg-[#333] text-white/90 px-6 py-3 rounded-lg font-medium">
              Avböj
            </button>
          </div>
        </div>

        {/* Footer / villkor */}
        <div className="mt-7 text-[13px] text-[#0f172a]/70 leading-relaxed">
          <p>
            Genom att acceptera denna offert bekräftar ni samtidigt att ni tagit del av våra
            resevillkor, som ni hittar här. Observera att vi reserverar oss för att det aktuella
            datumet kan vara fullbokat. Slutlig kapacitet kontrolleras vid bokningstillfället och
            bekräftas först genom en skriftlig bokningsbekräftelse från oss.
          </p>
          <p className="mt-3">
            Har du frågor, funderingar eller vill bekräfta bokningen? Tveka inte att kontakta oss –
            vi hjälper dig gärna. <strong>Våra ordinarie öppettider är vardagar kl. 08:00–17:00.</strong>{" "}
            För akuta ärenden med kortare varsel än två arbetsdagar ber vi dig ringa vårt{" "}
            <strong>journummer: 010-777 21 58</strong>.
          </p>
        </div>
      </div>
    </div>
  );
}
