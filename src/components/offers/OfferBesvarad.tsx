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
  if (n == null) return "â€”";
  return n.toLocaleString("sv-SE", { style: "currency", currency: "SEK" });
}

export default function OfferBesvarad({ offer }: any) {
  // HÃ¤rled tur/retur Ã¤ven om round_trip saknas i DB
  const roundTrip = Boolean(
    offer?.round_trip ??
      offer?.return_date ??
      offer?.return_time ??
      offer?.return_departure ??
      offer?.return_destination
  );

  const withinSweden = (offer?.trip_type || "sverige") !== "utrikes";

  const email: string | undefined =
    offer?.contact_email || offer?.customer_email || undefined;

  // trips
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
            title: "Ã…terresa",
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

  // --- actions state ---
  const [busy, setBusy] = useState<"accept" | "decline" | "change" | null>(null);

  async function postWithFallback(pathWithId: string, fallbackPath: string, body: any) {
    // 1) fÃ¶rsÃ¶k med id-endpointen om id finns
    if (offer?.id) {
      const r = await fetch(pathWithId, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (r.ok) return r;
      // om 404/405 â€“ prova fallback
    }
    // 2) fallback som bara krÃ¤ver offerNumber + email
    return fetch(fallbackPath, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  async function onAcceptOffer() {
    if (!offer?.offer_number || !email) {
      alert("Saknas uppgifter fÃ¶r att kunna acceptera (nummer/e-post).");
      return;
    }
    try {
      setBusy("accept");
      const res = await postWithFallback(
        `/api/offers/${offer.id}/accept`,
        `/api/offers/accept`,
        { customerEmail: email, offerNumber: offer.offer_number }
      );
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || `Kunde inte acceptera (HTTP ${res.status})`);
      }
      // Visa bokningsvy
      window.location.href = `/offert/${offer.offer_number}?view=godkand`;
    } catch (e: any) {
      alert(e?.message || "Tekniskt fel vid godkÃ¤nnande.");
    } finally {
      setBusy(null);
    }
  }

  async function onDeclineOffer() {
    if (!offer?.offer_number || !email) {
      alert("Saknas uppgifter fÃ¶r att avbÃ¶ja (nummer/e-post).");
      return;
    }
    try {
      setBusy("decline");
      const res = await postWithFallback(
        `/api/offers/${offer.id}/decline`,
        `/api/offers/decline`,
        { customerEmail: email, offerNumber: offer.offer_number }
      );
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || `Kunde inte avbÃ¶ja (HTTP ${res.status})`);
      }
      // Visa makulerad vy
      window.location.href = `/offert/${offer.offer_number}?view=avbojd`;
    } catch (e: any) {
      alert(e?.message || "Tekniskt fel vid avbÃ¶j.");
    } finally {
      setBusy(null);
    }
  }

  async function onRequestChange() {
    if (!offer?.offer_number || !email) {
      alert("Saknas uppgifter fÃ¶r Ã¤ndringsfÃ¶rfrÃ¥gan (nummer/e-post).");
      return;
    }
    try {
      setBusy("change");
      const res = await postWithFallback(
        `/api/offers/${offer.id}/change-request`,
        `/api/offers/change-request`,
        {
          customerEmail: email,
          offerNumber: offer.offer_number,
          message:
            "Kunden Ã¶nskar Ã¤ndringar i offerten. Kontakta kunden fÃ¶r detaljer.",
        }
      );
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || `Kunde inte skicka Ã¤ndringsfÃ¶rfrÃ¥gan (HTTP ${res.status})`);
      }
      alert("Tack! Vi Ã¥terkommer med uppdaterad offert.");
    } catch (e: any) {
      alert(e?.message || "Tekniskt fel vid Ã¤ndringsfÃ¶rfrÃ¥gan.");
    } finally {
      setBusy(null);
    }
  }

  // --- UI ---
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
          Offert {offer?.offer_number || "â€”"}
        </h1>

        {/* Ã–vre kort â€“ info + totals */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border rounded-lg p-4">
            <div className="flex items-baseline gap-2">
              <span className="text-sm text-[#0f172a]/70 font-semibold">Offertdatum</span>
              <span className="text-[#0f172a]">{offer?.offer_date || "â€”"}</span>
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-sm text-[#0f172a]/70 font-semibold">Er referens</span>
              <span className="text-[#0f172a]">{offer?.customer_reference || offer?.contact_person || "â€”"}</span>
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-sm text-[#0f172a]/70 font-semibold">VÃ¥r referens</span>
              <span className="text-[#0f172a]">{offer?.internal_reference || "â€”"}</span>
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
              <div className="text-[#0f172a]">{offer?.contact_person || offer?.customer_reference || "â€”"}</div>

              <div className="text-[#0f172a]/70 font-semibold">Adress</div>
              <div className="text-[#0f172a]">{offer?.customer_address || "â€”"}</div>

              <div className="text-[#0f172a]/70 font-semibold">Telefon</div>
              <div className="text-[#0f172a]">{offer?.contact_phone || "â€”"}</div>

              <div className="text-[#0f172a]/70 font-semibold">E-post</div>
              <div className="text-[#0f172a] break-all">{email || "â€”"}</div>
            </div>
          </div>
        </div>

        {/* Introtext */}
        <div className="mt-5 text-[15px] leading-relaxed text-[#0f172a]/80">
          <p>
            Hej!
            <br />
            Ert offertfÃ¶rslag Ã¤r klart â€“ ta del av detaljerna. Vi har samlat allt ni behÃ¶ver: rutt,
            tider, fordon och pris â€“ tydligt och Ã¶verskÃ¥dligt. GodkÃ¤nn offerten sÃ¥ sÃ¤krar vi
            kapacitet och planerar den perfekta resan fÃ¶r er.
          </p>
        </div>

        {/* Reseavsnitt med pris per strÃ¤cka */}
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
                    AvstÃ¥nd och tider baseras preliminÃ¤rt
                  </span>
                </div>

                <div className="border rounded-lg p-3 text-[14px] text-[#0f172a] leading-[1.5]">
                  <div>
                    <span className="font-semibold">AvgÃ¥ng:</span> {trip.date} kl {trip.time}
                  </div>
                  <div>
                    <span className="font-semibold">FrÃ¥n:</span> {trip.from}
                  </div>
                  <div>
                    <span className="font-semibold">Till:</span> {trip.to}
                  </div>
                  <div>
                    <span className="font-semibold">Antal passagerare:</span> {trip.pax ?? "â€”"}
                  </div>

                  {/* Pris per strÃ¤cka */}
                  <div className="grid grid-cols-[1fr_auto] gap-x-4 mt-2">
                    <div className="text-[#0f172a]/70">Pris exkl. moms</div>
                    <div>{money(leg?.subtotExVat)}</div>
                    <div className="text-[#0f172a]/70">Moms</div>
                    <div>{money(leg?.vat)}</div>
                    <div className="text-[#0f172a]/70">Summa</div>
                    <div>{money(leg?.total)}</div>
                  </div>

                  <div className="mt-2">
                    <span className="font-semibold">Ã–vrig information:</span>{" "}
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
            Klicka nedan fÃ¶r att gÃ¶ra en bokningsfÃ¶rfrÃ¥gan
          </div>
          <div className="flex flex-col md:flex-row justify-center gap-4">
            <button
              onClick={onAcceptOffer}
              disabled={busy !== null}
              className="bg-[#194C66] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#163b4d] disabled:opacity-60"
            >
              {busy === "accept" ? "Accepterarâ€¦" : "Acceptera offert"}
            </button>

            <button
              onClick={onRequestChange}
              disabled={busy !== null}
              className="bg-[#223] text-white/90 px-6 py-3 rounded-lg font-medium disabled:opacity-60"
            >
              {busy === "change" ? "Skickarâ€¦" : "Ã„ndra din offert"}
            </button>

            <button
              onClick={onDeclineOffer}
              disabled={busy !== null}
              className="bg-[#333] text-white/90 px-6 py-3 rounded-lg font-medium disabled:opacity-60"
            >
              {busy === "decline" ? "AvbÃ¶jerâ€¦" : "AvbÃ¶j"}
            </button>
          </div>
        </div>

        {/* Footer / villkor */}
        <div className="mt-7 text-[13px] text-[#0f172a]/70 leading-relaxed">
          <p>
            Genom att acceptera denna offert bekrÃ¤ftar ni samtidigt att ni tagit del av vÃ¥ra
            resevillkor, som ni hittar hÃ¤r. Observera att vi reserverar oss fÃ¶r att det aktuella
            datumet kan vara fullbokat. Slutlig kapacitet kontrolleras vid bokningstillfÃ¤llet och
            bekrÃ¤ftas fÃ¶rst genom en skriftlig bokningsbekrÃ¤ftelse frÃ¥n oss.
          </p>
          <p className="mt-3">
            Har du frÃ¥gor, funderingar eller vill bekrÃ¤fta bokningen? Tveka inte att kontakta oss â€“
            vi hjÃ¤lper dig gÃ¤rna. <strong>VÃ¥ra ordinarie Ã¶ppettider Ã¤r vardagar kl. 08:00â€“17:00.</strong>{" "}
            FÃ¶r akuta Ã¤renden med kortare varsel Ã¤n tvÃ¥ arbetsdagar ber vi dig ringa vÃ¥rt{" "}
            <strong>journummer: 010-777 21 58</strong>.
          </p>
        </div>
      </div>
    </div>
  );
}

