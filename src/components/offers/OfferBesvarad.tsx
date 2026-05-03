// src/components/offers/OfferBesvarad.tsx
import Image from "next/image";
import { useState } from "react";

// ÅTERANVÄNDA komponenter/layout
import OfferTopBar from "@/components/offers/OfferTopBar";
import OfferLeftSidebar from "@/components/offers/OfferLeftSidebar";
import TripLegGrid from "@/components/offers/TripLegGrid";
import TripLegCard from "@/components/offers/TripLegCard";

// --- layoutkonstanter (som på Inkommen)
const TOPBAR_PX = 64;
const LINE_HEIGHT = 1.5;

// --- helpers
type Breakdown = {
  grandExVat?: number;
  grandVat?: number;
  grandTotal?: number;
  serviceFeeExVat?: number;
  legs?: any[];
  fees?: {
    includeBridgeFee?: boolean;
    bridgeFeeTotal?: number;
    includeBoatFee?: boolean;
    boatFeeTotal?: number;
    boatFeeQty?: number;
    includedFeesText?: string | null;
  };
};

// ✅ HELA KRONOR (inga ören)
function money(n?: number | null) {
  if (n == null) return "—";
  const rounded = Math.round(Number(n));
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: "SEK",
    maximumFractionDigits: 0,
  }).format(rounded);
}

function v(x: any, fallback = "—") {
  if (x === null || x === undefined || x === "") return fallback;
  return String(x);
}

export default function OfferBesvarad({ offer }: any) {
  // Härled tur/retur även om round_trip saknas i DB
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

  // Mittens resekort (ut/retur)
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

  // totals & breakdown (om finns)
  const breakdown: Breakdown | null =
    typeof offer?.vat_breakdown === "object" && offer?.vat_breakdown
      ? (offer.vat_breakdown as Breakdown)
      : null;

  const includedFeesText: string | null = (() => {
    if (breakdown?.fees?.includedFeesText) {
      return breakdown.fees.includedFeesText;
    }

    const parts: string[] = [];

    if (
      breakdown?.fees?.includeBridgeFee ||
      Number(breakdown?.fees?.bridgeFeeTotal || 0) > 0
    ) {
      parts.push("broavgift");
    }

    if (
      breakdown?.fees?.includeBoatFee ||
      Number(breakdown?.fees?.boatFeeTotal || 0) > 0
    ) {
      const qty = breakdown?.fees?.boatFeeQty;
      parts.push(qty ? `båtavgift (${qty} st, momsfri)` : "båtavgift");
    }

    if (parts.length > 0) {
      return `Priset är inklusive ${parts.join(" och ")}.`;
    }

    const priceNote = String(offer?.price_note || "");
    if (
      priceNote.toLowerCase().includes("broavgift") ||
      priceNote.toLowerCase().includes("båtavgift")
    ) {
      return priceNote;
    }

    return null;
  })();

  // ✅ Vi visar bara TOTALEN för kunden (inte uppdelat)
  const totalForCustomer: number | null = (() => {
    const candidates = [
      offer?.total_amount,
      offer?.total_price,
      breakdown?.grandTotal,
    ];

    for (const c of candidates) {
      if (typeof c === "number" && Number.isFinite(c) && c > 0) return c;
    }
    return null;
  })();

  const tripLabel = roundTrip ? "Tur & retur" : "Enkelresa";

  // --- actions-state & handlers
  const [busy, setBusy] = useState<"accept" | "decline" | "change" | null>(
    null
  );

  // ✅ FIX: behåll token när vi skickar kunden vidare mellan vyer
  function getAuthQueryFromUrl() {
    if (typeof window === "undefined") return "";
    const sp = new URLSearchParams(window.location.search);
    const t = sp.get("token") || sp.get("t");
    if (!t) return "";
    // Behåll båda för bakåtkompatibilitet
    return `&token=${encodeURIComponent(t)}&t=${encodeURIComponent(t)}`;
  }

  async function postWithFallback(
    pathWithId: string,
    fallbackPath: string,
    body: any
  ) {
    if (offer?.id) {
      const r = await fetch(pathWithId, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (r.ok) return r;
    }
    return fetch(fallbackPath, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  // Skapar bokning utifrån offert (använder din API-route /api/bookings/from-offer)
  async function createBookingFromOffer(): Promise<{ id?: string } | null> {
    try {
      const res = await fetch("/api/bookings/from-offer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          offerId: offer?.id ?? null,
          offerNumber: offer?.offer_number ?? null,
          assigned_vehicle_id: null,
          assigned_driver_id: null,
          notes: offer?.notes ?? null,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || `HTTP ${res.status}`);
      return j?.booking ?? null;
    } catch {
      return null;
    }
  }

  async function onAcceptOffer() {
    if (!offer?.offer_number || !email) {
      alert("Saknas uppgifter (offertnummer/e-post).");
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

      const booking = await createBookingFromOffer();

      const qBase = booking?.id
        ? `?view=godkand&bk=${encodeURIComponent(booking.id)}`
        : `?view=godkand`;

      const auth = getAuthQueryFromUrl();
      window.location.href = `/offert/${offer.offer_number}${qBase}${auth}`;
    } catch (e: any) {
      alert(e?.message || "Tekniskt fel vid godkännande.");
    } finally {
      setBusy(null);
    }
  }

  async function onDeclineOffer() {
    if (!offer?.offer_number || !email) {
      alert("Saknas uppgifter (offertnummer/e-post).");
      return;
    }
    try {
      setBusy("decline");

      const res = await postWithFallback(
        `/api/offers/${offer.id}/decline`,
        `/api/offers/decline`,
        {
          customerEmail: email,
          offerNumber: offer.offer_number,
          updateStatusTo: "makulerad",
          notifyTeam: true,
        }
      );

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || `Kunde inte avböja (HTTP ${res.status})`);
      }

      const auth = getAuthQueryFromUrl();
      window.location.href = `/offert/${offer.offer_number}?view=avbojd${auth}`;
    } catch (e: any) {
      alert(e?.message || "Tekniskt fel vid avböj.");
    } finally {
      setBusy(null);
    }
  }

  async function onRequestChange() {
    if (!offer?.offer_number || !email) {
      alert("Saknas uppgifter (offertnummer/e-post).");
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
            "Kunden önskar ändringar i offerten. Kontakta kunden för detaljer.",
        }
      );

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(
          j?.error ||
            `Kunde inte skicka ändringsförfrågan (HTTP ${res.status})`
        );
      }

      alert("Tack! Vi återkommer med uppdaterad offert.");
    } catch (e: any) {
      alert(e?.message || "Tekniskt fel vid ändringsförfrågan.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="bg-[#f5f4f0] overflow-hidden">
      {/* TOPPRAD */}
      <div style={{ height: TOPBAR_PX }}>
        <OfferTopBar
          offerNumber={offer?.offer_number ?? "HB25XXXX"}
          customerNumber={offer?.customer_number ?? "K10023"}
          customerName={offer?.contact_person ?? "Kund"}
          status="besvarad"
        />
      </div>

      {/* INNEHÅLLSYTA */}
      <div style={{ height: `calc(100vh - ${TOPBAR_PX}px)` }}>
        <div className="grid h-full grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)_550px] gap-0">
          {/* VÄNSTER */}
          <div className="h-full">
            <OfferLeftSidebar />
          </div>

          {/* MITTEN */}
          <main className="h-full pl-4 lg:pl-6 pr-2 lg:pr-3 py-4 lg:py-6">
            <div className="h-full bg-white rounded-xl shadow flex flex-col">
              <div className="px-6 pt-6">
                <Image
                  src="/mork_logo.png"
                  alt="Helsingbuss"
                  width={360}
                  height={64}
                  priority
                />
                <h1 className="mt-2 text-2xl font-semibold text-[#0f172a]">
                  Offert {offer?.offer_number || "—"}
                </h1>

                <div
                  className="mt-5 text-[14px] text-[#0f172a]/80"
                  style={{ lineHeight: LINE_HEIGHT }}
                >
                  <p>
                    Hej!
                    <br />
                    Er offert är nu klar och sammanställer en tydlig plan för
                    resan. Nedan ser ni rutt och hållplatser, tider, bussmodell,
                    pris och villkor. Kontrollera uppgifterna innan ni godkänner
                    och klicka på <strong>Acceptera offert</strong> för att
                    säkra kapacitet och planering. Önskar ni justera antal
                    resenärer, bagage, barnstol/tillgänglighet eller service
                    ombord? Maila{" "}
                    <a
                      className="underline"
                      href="mailto:kundteam@helsingbuss.se"
                    >
                      kundteam@helsingbuss.se
                    </a>{" "}
                    så uppdaterar vi direkt. Luta er tillbaka – vi ordnar
                    resten.
                  </p>
                </div>

                {/* RESEKORT – ✅ utan prisrader under varje resa */}
                <div className="mt-5">
                  <TripLegGrid>
                    {trips.map((trip, idx) => (
                      <TripLegCard
                        key={idx}
                        title={
                          withinSweden
                            ? `Bussresa inom Sverige • ${trip.title}`
                            : `Bussresa utomlands • ${trip.title}`
                        }
                        subtitle="Avstånd och tider baseras preliminärt"
                        date={trip.date}
                        time={trip.time}
                        from={trip.from}
                        to={trip.to}
                        pax={trip.pax}
                        extra={trip.extra}
                        iconSrc="/busie.png"
                      />
                    ))}
                  </TripLegGrid>
                </div>

                <div
                  className="mt-6 text-[14px] text-[#0f172a]/80"
                  style={{ lineHeight: LINE_HEIGHT }}
                >
                  <p>
                    Genom att godkänna offerten bekräftar ni att ni har tagit
                    del av våra resevillkor (läs dem här). Observera att datum
                    och tider är i mån av tillgänglighet; slutlig kapacitet
                    kontrolleras vid bokning och bekräftas först genom en
                    skriftlig bokningsbekräftelse från oss.
                  </p>
                  <p className="mt-3">
                    Vill ni boka eller har frågor/ändringar? Kontakta oss så
                    hjälper vi gärna. Våra öppettider är vardagar kl.
                    08:00–17:00. För akuta ärenden eller bokningar med kortare
                    varsel än två arbetsdagar, ring vårt journummer:{" "}
                    <strong>010–777 21 58</strong>.
                  </p>
                </div>
              </div>

              <div className="mt-auto px-6 pb-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-[13px] text-[#0f172a]">
                  <div>
                    <div>Helsingbuss</div>
                    <div>Hofverbergsgatan 2B</div>
                    <div>254 43 Helsingborg</div>
                    <div>helsingbuss.se</div>
                  </div>
                  <div>
                    <div>Tel. +46 (0) 405 38 38</div>
                    <div>Jour. +46 (0) 777 21 58</div>
                    <div>info@helsingbuss.se</div>
                  </div>
                  <div>
                    <div>Bankgiro: 763-4157</div>
                    <div>Org.nr: 890101-3931</div>
                    <div>VAT nr: SE890101393101</div>
                  </div>
                </div>
              </div>
            </div>
          </main>

          {/* HÖGER – kund + ✅ bara totalpris */}
          <aside className="h-full p-4 lg:p-6">
            <div className="h-full bg-white rounded-xl shadow flex flex-col">
              <div className="px-6 pt-6">
                <div className="inline-flex items-center rounded-full bg-[#eef5f9] px-3 py-1 text-sm text-[#194C66] font-medium">
                  Kunduppgifter
                </div>

                <dl className="mt-4 grid grid-cols-[auto,1fr] gap-x-6 gap-y-1 text-[14px] text-[#0f172a] leading-tight">
                  <DT>Offertdatum:</DT>
                  <DD>{v(offer?.offer_date, "—")}</DD>
                  <DT>Er referens:</DT>
                  <DD>{v(offer?.customer_reference, "—")}</DD>
                  <DT>Vår referens:</DT>
                  <DD>{v(offer?.internal_reference, "—")}</DD>
                  <DT>Namn:</DT>
                  <DD>{v(offer?.contact_person, "—")}</DD>
                  <DT>Adress:</DT>
                  <DD>{v(offer?.customer_address, "—")}</DD>
                  <DT>Telefon:</DT>
                  <DD>{v(offer?.contact_phone, "—")}</DD>
                  <DT>E-post:</DT>
                  <DD>{v(email, "—")}</DD>
                </dl>

                <div className="mt-6">
                  <div className="font-semibold text-[#0f172a]">
                    Offertinformation om kostnad
                  </div>

                  <div className="mt-3 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-4">
                    <div className="text-sm text-[#0f172a]/70">
                      Resa:{" "}
                      <span className="font-semibold text-[#0f172a]">
                        {tripLabel}
                      </span>
                    </div>

                    <div className="mt-3 text-sm text-[#0f172a]/70">
                      Totala kostnaden för denna offert är:
                    </div>
                    <div className="mt-1 text-2xl font-semibold text-[#0f172a]">
                      {money(totalForCustomer)}
                    </div>

                    {includedFeesText && (
                      <div className="mt-2 rounded-lg bg-emerald-50 border border-emerald-100 px-3 py-2 text-[13px] text-emerald-700">
                        ✔ {includedFeesText}
                      </div>
                    )}
                  </div>

                  <div className="mt-6 text-[13px] text-[#0f172a]/80 leading-relaxed">
                    <div className="font-semibold text-[#0f172a] mb-1">
                      Betalningsvillkor
                    </div>
                    <p>
                      10 dagar netto om det är företag/förening, faktura kommer
                      efter uppdrag. För privatperson ska fakturan vara betald
                      minst 3 dagar innan uppdraget.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-auto px-6 pb-6">
                <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
                  <button
                    onClick={onDeclineOffer}
                    disabled={busy !== null}
                    className="px-5 py-3 rounded-lg border border-[#e2e8f0] text-[#0f172a] bg-white hover:bg-[#f8fafc] disabled:opacity-60"
                  >
                    {busy === "decline" ? "Avböjer…" : "Avböj"}
                  </button>

                  <button
                    onClick={onRequestChange}
                    disabled={busy !== null}
                    className="px-5 py-3 rounded-lg border border-[#e2e8f0] text-[#0f172a] bg-white hover:bg-[#f8fafc] disabled:opacity-60"
                  >
                    {busy === "change" ? "Skickar…" : "Ändra din offert"}
                  </button>

                  <button
                    onClick={onAcceptOffer}
                    disabled={busy !== null}
                    className="px-5 py-3 rounded-lg bg-[#194C66] text-white font-medium hover:bg-[#163b4d] disabled:opacity-60"
                  >
                    {busy === "accept" ? "Accepterar…" : "Acceptera offert"}
                  </button>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

/* Små hjälpare för DL-rader */
function DT({ children }: { children: React.ReactNode }) {
  return (
    <dt className="font-semibold text-[#0f172a]/70 whitespace-nowrap">
      {children}
    </dt>
  );
}

function DD({ children }: { children: React.ReactNode }) {
  return <dd className="text-[#0f172a] break-words">{children}</dd>;
}
