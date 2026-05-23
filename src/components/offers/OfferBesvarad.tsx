// src/components/offers/OfferBesvarad.tsx
import Image from "next/image";
import { useState } from "react";

import OfferTopBar from "@/components/offers/OfferTopBar";
import TripLegGrid from "@/components/offers/TripLegGrid";
import TripLegCard from "@/components/offers/TripLegCard";

const TOPBAR_PX = 64;
const LINE_HEIGHT = 1.5;

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

function money(n?: number | null) {
  if (n == null) return "ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â";
  const rounded = Math.round(Number(n));
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: "SEK",
    maximumFractionDigits: 0,
  }).format(rounded);
}

function v(x: any, fallback = "ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â") {
  if (x === null || x === undefined || x === "") return fallback;
  return String(x);
}

export default function OfferBesvarad({ offer }: any) {
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
            title: "ÃƒÆ’Ã¢â‚¬Â¦terresa",
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
      parts.push(qty ? `bÃƒÆ’Ã‚Â¥tavgift (${qty} st, momsfri)` : "bÃƒÆ’Ã‚Â¥tavgift");
    }

    if (parts.length > 0) {
      return `Priset ÃƒÆ’Ã‚Â¤r inklusive ${parts.join(" och ")}.`;
    }

    const priceNote = String(offer?.price_note || "");
    if (
      priceNote.toLowerCase().includes("broavgift") ||
      priceNote.toLowerCase().includes("bÃƒÆ’Ã‚Â¥tavgift")
    ) {
      return priceNote;
    }

    return null;
  })();
  const mobileMoneyNumber = (value: any): number | null => {
    if (value === null || value === undefined || value === "") return null;

    const n =
      typeof value === "number"
        ? value
        : Number(String(value).replace(/\s/g, "").replace(",", "."));

    if (!Number.isFinite(n) || n <= 0) return null;

    return n;
  };


    const totalForCustomer: number | null = (() => {
    const offerAny = offer as any;
    const breakdownAny = breakdown as any;

    const calculator =
      typeof offerAny?.calculator === "object" && offerAny?.calculator
        ? offerAny.calculator
        : null;

    const candidates = [
      offerAny?.total_amount,
      offerAny?.total_price,
      offerAny?.price_total,
      offerAny?.price_amount,
      offerAny?.customer_price,
      offerAny?.proposal_price,

      breakdownAny?.grandTotal,
      breakdownAny?.total,
      breakdownAny?.result?.total,

      calculator?.customerPrice,
      calculator?.customer_price,
      calculator?.customerPriceManual,
      calculator?.customer_price_manual,
      calculator?.total,
      calculator?.priceTotal,
      calculator?.price_total,
    ];

    for (const candidate of candidates) {
      const n = mobileMoneyNumber(candidate);
      if (n) return n;
    }

    return null;
  })();

  const tripLabel = roundTrip ? "Tur & retur" : "Enkelresa";

  const [busy, setBusy] = useState<"accept" | "decline" | "change" | null>(
    null
  );

  function getAuthQueryFromUrl() {
    if (typeof window === "undefined") return "";
    const sp = new URLSearchParams(window.location.search);
    const t = sp.get("token") || sp.get("t");
    if (!t) return "";
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
      alert(e?.message || "Tekniskt fel vid godkÃƒÆ’Ã‚Â¤nnande.");
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
        throw new Error(j?.error || `Kunde inte avbÃƒÆ’Ã‚Â¶ja (HTTP ${res.status})`);
      }

      const auth = getAuthQueryFromUrl();
      window.location.href = `/offert/${offer.offer_number}?view=avbojd${auth}`;
    } catch (e: any) {
      alert(e?.message || "Tekniskt fel vid avbÃƒÆ’Ã‚Â¶j.");
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
            "Kunden ÃƒÆ’Ã‚Â¶nskar ÃƒÆ’Ã‚Â¤ndringar i offerten. Kontakta kunden fÃƒÆ’Ã‚Â¶r detaljer.",
        }
      );

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(
          j?.error ||
            `Kunde inte skicka ÃƒÆ’Ã‚Â¤ndringsfÃƒÆ’Ã‚Â¶rfrÃƒÆ’Ã‚Â¥gan (HTTP ${res.status})`
        );
      }

      alert("Tack! Vi ÃƒÆ’Ã‚Â¥terkommer med uppdaterad offert.");
    } catch (e: any) {
      alert(e?.message || "Tekniskt fel vid ÃƒÆ’Ã‚Â¤ndringsfÃƒÆ’Ã‚Â¶rfrÃƒÆ’Ã‚Â¥gan.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="bg-[#eef2f4] overflow-hidden">
      <div style={{ height: TOPBAR_PX }}>
        <OfferTopBar
          offerNumber={offer?.offer_number ?? "HB25XXXX"}
          customerNumber={offer?.customer_number ?? "K10023"}
          customerName={offer?.contact_person ?? "Kund"}
          status="besvarad"
        />
      </div>

      <div
        className="overflow-hidden"
        style={{ height: `calc(100vh - ${TOPBAR_PX}px)` }}
      >
        <div className="grid h-full grid-cols-1 lg:grid-cols-[420px_minmax(0,1fr)_550px] gap-0 overflow-hidden">
          <div className="h-full p-4 lg:p-6 pb-10">
            <AnsweredLeftPanel />
          </div>

          <main className="h-full pl-4 lg:pl-6 pr-2 lg:pr-3 py-4 lg:py-6 overflow-hidden">
            <div className="h-full overflow-hidden rounded-3xl bg-white shadow-[0_18px_50px_rgba(15,23,42,0.08)] border border-white/70 flex flex-col">
              <div className="relative px-6 lg:px-8 pt-7 pb-6 overflow-hidden">
                <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-br from-[#194C66]/10 via-[#edf6f8] to-white pointer-events-none" />

                <div className="relative">
                  <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-5">
                    <div>
                      <div className="inline-flex items-center gap-2 rounded-full bg-[#194C66] px-3 py-1 text-[12px] font-semibold text-white shadow-sm">
                        Offert klar
                      </div>

                      <h1 className="mt-4 text-3xl lg:text-[34px] leading-tight font-semibold tracking-tight text-[#0f172a]">
                        Er offert ÃƒÆ’Ã‚Â¤r klar
                      </h1>

                      <p className="mt-2 text-sm text-slate-600">
                        Offert{" "}
                        <span className="font-semibold text-[#194C66]">
                          {offer?.offer_number || "ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â"}
                        </span>{" "}
                        ÃƒÆ’Ã‚Â¤r besvarad och redo att godkÃƒÆ’Ã‚Â¤nnas.
                      </p>
                    </div>

                    <div className="shrink-0 rounded-2xl bg-white/80 border border-white shadow-sm px-5 py-4">
                      <Image
                        src="/mork_logo.png"
                        alt="Helsingbuss"
                        width={250}
                        height={48}
                        priority
                      />
                    </div>
                  </div>

                  <div
                    className="mt-6 max-w-4xl rounded-2xl border border-[#dbe7ee] bg-white/85 px-5 py-4 text-[14px] text-[#0f172a]/80 shadow-sm"
                    style={{ lineHeight: LINE_HEIGHT }}
                  >
                    <p>
                      Hej!
                      <br />
                      Er offert ÃƒÆ’Ã‚Â¤r nu klar och sammanstÃƒÆ’Ã‚Â¤ller en tydlig plan fÃƒÆ’Ã‚Â¶r
                      resan. Nedan ser ni rutt, tider, pris och villkor.
                      Kontrollera uppgifterna innan ni godkÃƒÆ’Ã‚Â¤nner.
                    </p>

                    <p className="mt-3">
                      ÃƒÆ’Ã¢â‚¬â€œnskar ni justera antal resenÃƒÆ’Ã‚Â¤rer, hÃƒÆ’Ã‚Â¥llplatser, bagage,
                      barnstol/tillgÃƒÆ’Ã‚Â¤nglighet eller service ombord? Klicka pÃƒÆ’Ã‚Â¥{" "}
                      <strong>ÃƒÆ’Ã¢â‚¬Å¾ndra din offert</strong> sÃƒÆ’Ã‚Â¥ ÃƒÆ’Ã‚Â¥terkommer vi med en
                      uppdaterad offert.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-6 lg:px-8 pb-40">
                <div className="mb-4 flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-[#0f172a]">
                      Resedetaljer
                    </h2>
                    <p className="text-sm text-slate-500">
                      Kontrollera datum, tider, platser och antal resenÃƒÆ’Ã‚Â¤rer.
                    </p>
                  </div>

                  <div className="hidden sm:flex items-center gap-2 rounded-full bg-[#f1f7f9] px-4 py-2 text-xs font-medium text-[#194C66]">
                    {tripLabel}
                  </div>
                </div>

                <TripLegGrid>
                  {trips.map((trip, idx) => (
                    <TripLegCard
                      key={idx}
                      title={
                        withinSweden
                          ? `Bussresa inom Sverige ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢ ${trip.title}`
                          : `Bussresa utomlands ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢ ${trip.title}`
                      }
                      subtitle="AvstÃƒÆ’Ã‚Â¥nd och tider baseras preliminÃƒÆ’Ã‚Â¤rt"
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

                <div
                  className="mt-6 grid gap-4 lg:grid-cols-2 text-[14px]"
                  style={{ lineHeight: LINE_HEIGHT }}
                >
                  <div className="rounded-2xl border border-[#e2e8f0] bg-[#f8fafc] p-5 text-[#0f172a]/80">
                    <div className="mb-2 text-sm font-semibold text-[#0f172a]">
                      NÃƒÆ’Ã‚Â¤sta steg
                    </div>
                    <p>
                      GodkÃƒÆ’Ã‚Â¤nn offerten digitalt fÃƒÆ’Ã‚Â¶r att vi ska kunna gÃƒÆ’Ã‚Â¥ vidare
                      med bokningen och sÃƒÆ’Ã‚Â¤kra kapacitet fÃƒÆ’Ã‚Â¶r resan.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-[#e2e8f0] bg-[#f8fafc] p-5 text-[#0f172a]/80">
                    <div className="mb-2 text-sm font-semibold text-[#0f172a]">
                      Viktig information
                    </div>
                    <p>
                      Slutlig kapacitet bekrÃƒÆ’Ã‚Â¤ftas fÃƒÆ’Ã‚Â¶rst genom en skriftlig
                      bokningsbekrÃƒÆ’Ã‚Â¤ftelse frÃƒÆ’Ã‚Â¥n Helsingbuss.
                    </p>
                  </div>
                </div>

                <div
                  className="mt-6 rounded-2xl bg-white border border-[#e2e8f0] p-5 text-[14px] text-[#0f172a]/80"
                  style={{ lineHeight: LINE_HEIGHT }}
                >
                  <p>
                    Genom att godkÃƒÆ’Ã‚Â¤nna offerten bekrÃƒÆ’Ã‚Â¤ftar ni att ni har tagit
                    del av vÃƒÆ’Ã‚Â¥ra resevillkor. Datum och tider ÃƒÆ’Ã‚Â¤r i mÃƒÆ’Ã‚Â¥n av
                    tillgÃƒÆ’Ã‚Â¤nglighet tills bokningen ÃƒÆ’Ã‚Â¤r skriftligt bekrÃƒÆ’Ã‚Â¤ftad.
                  </p>

                  <p className="mt-3">
                    Vill ni boka eller har frÃƒÆ’Ã‚Â¥gor/ÃƒÆ’Ã‚Â¤ndringar? Kontakta oss sÃƒÆ’Ã‚Â¥
                    hjÃƒÆ’Ã‚Â¤lper vi gÃƒÆ’Ã‚Â¤rna. VÃƒÆ’Ã‚Â¥ra ÃƒÆ’Ã‚Â¶ppettider ÃƒÆ’Ã‚Â¤r vardagar kl.
                    08:00ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“17:00. FÃƒÆ’Ã‚Â¶r akuta ÃƒÆ’Ã‚Â¤renden eller bokningar med kortare
                    varsel ÃƒÆ’Ã‚Â¤n tvÃƒÆ’Ã‚Â¥ arbetsdagar, ring vÃƒÆ’Ã‚Â¥rt journummer:{" "}
                    <strong>010ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“777 21 58</strong>.
                  </p>

                  <p className="mt-4 rounded-xl bg-[#194C66] px-4 py-3 text-[12px] uppercase tracking-wide font-semibold text-white">
                    Kontrollera uppgifterna och godkÃƒÆ’Ã‚Â¤nn offerten fÃƒÆ’Ã‚Â¶r att gÃƒÆ’Ã‚Â¥
                    vidare.
                  </p>
                </div>

                <div className="mt-6 rounded-2xl border border-[#e2e8f0] bg-[#f8fafc] p-4">
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
            </div>
          </main>

          <aside className="h-full p-4 lg:p-6">
            <div className="h-full rounded-3xl bg-white shadow-[0_18px_50px_rgba(15,23,42,0.08)] border border-white/70 flex flex-col overflow-hidden">
              <div className="bg-gradient-to-br from-[#194C66] to-[#0f3347] px-6 py-6 text-white">
                <div className="text-xs uppercase tracking-[0.18em] text-white/60">
                  OffertÃƒÆ’Ã‚Â¶versikt
                </div>
                <h2 className="mt-2 text-2xl font-semibold">
                  {offer?.contact_person ?? "Kund"}
                </h2>
                <p className="mt-1 text-sm text-white/70">
                  HÃƒÆ’Ã‚Â¤r ser ni pris, betalningsvillkor och kan svara pÃƒÆ’Ã‚Â¥ offerten.
                </p>
              </div>

              <div className="px-6 pt-6">
                <div className="inline-flex items-center rounded-full bg-[#eef5f9] px-3 py-1 text-sm text-[#194C66] font-medium">
                  Kunduppgifter
                </div>

                <dl className="mt-4 grid grid-cols-[auto,1fr] gap-x-6 gap-y-1 text-[14px] text-[#0f172a] leading-tight">
                  <DT>Offertdatum:</DT>
                  <DD>{v(offer?.offer_date, "ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â")}</DD>
                  <DT>Er referens:</DT>
                  <DD>{v(offer?.customer_reference, "ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â")}</DD>
                  <DT>VÃƒÆ’Ã‚Â¥r referens:</DT>
                  <DD>{v(offer?.internal_reference, "ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â")}</DD>
                  <DT>Namn:</DT>
                  <DD>{v(offer?.contact_person, "ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â")}</DD>
                  <DT>Adress:</DT>
                  <DD>{v(offer?.customer_address, "ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â")}</DD>
                  <DT>Telefon:</DT>
                  <DD>{v(offer?.contact_phone, "ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â")}</DD>
                  <DT>E-post:</DT>
                  <DD>{v(email, "ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â")}</DD>
                </dl>

                <div className="mt-6 rounded-2xl border border-[#e2e8f0] bg-[#f8fafc] p-4">
                  <div className="text-sm text-[#0f172a]/70">
                    Resa:{" "}
                    <span className="font-semibold text-[#0f172a]">
                      {tripLabel}
                    </span>
                  </div>

                  <div className="mt-3 text-sm text-[#0f172a]/70">
                    Totala kostnaden fÃƒÆ’Ã‚Â¶r denna offert ÃƒÆ’Ã‚Â¤r:
                  </div>

                  <div className="mt-1 text-3xl font-semibold text-[#0f172a]">
                    {money(totalForCustomer)}
                  </div>

                  {includedFeesText && (
                    <div className="mt-3 rounded-lg bg-emerald-50 border border-emerald-100 px-3 py-2 text-[13px] text-emerald-700">
                      ÃƒÂ¢Ã…â€œÃ¢â‚¬Â {includedFeesText}
                    </div>
                  )}
                </div>

                <div className="mt-5 rounded-2xl border border-[#e2e8f0] bg-white p-4">
                  <div className="font-semibold text-[#0f172a] mb-1">
                    Betalningsvillkor
                  </div>
                  <p className="text-[13px] text-[#0f172a]/80 leading-relaxed">
                    10 dagar netto om det ÃƒÆ’Ã‚Â¤r fÃƒÆ’Ã‚Â¶retag/fÃƒÆ’Ã‚Â¶rening, faktura kommer
                    efter uppdrag. FÃƒÆ’Ã‚Â¶r privatperson ska fakturan vara betald
                    minst 3 dagar innan uppdraget.
                  </p>
                </div>
              </div>

              <div className="mt-auto px-6 pb-6 pt-5">
                <div className="flex flex-col gap-3">
                  <button
                    onClick={onAcceptOffer}
                    disabled={busy !== null}
                    className="w-full px-5 py-3 rounded-xl bg-[#194C66] text-white font-semibold hover:bg-[#163b4d] disabled:opacity-60"
                  >
                    {busy === "accept" ? "AccepterarÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦" : "Acceptera offert"}
                  </button>

                  <button
                    onClick={onRequestChange}
                    disabled={busy !== null}
                    className="w-full px-5 py-3 rounded-xl border border-[#e2e8f0] text-[#0f172a] bg-white hover:bg-[#f8fafc] disabled:opacity-60"
                  >
                    {busy === "change" ? "SkickarÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦" : "ÃƒÆ’Ã¢â‚¬Å¾ndra din offert"}
                  </button>

                  <button
                    onClick={onDeclineOffer}
                    disabled={busy !== null}
                    className="w-full px-5 py-3 rounded-xl border border-red-100 text-red-700 bg-red-50 hover:bg-red-100 disabled:opacity-60"
                  >
                    {busy === "decline" ? "AvbÃƒÆ’Ã‚Â¶jerÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦" : "AvbÃƒÆ’Ã‚Â¶j offert"}
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

function AnsweredLeftPanel() {
  const steps = [
    "FÃƒÆ’Ã‚Â¶rfrÃƒÆ’Ã‚Â¥gan mottagen",
    "Offert framtagen",
    "Ni vÃƒÆ’Ã‚Â¤ljer svar",
    "Bokning bekrÃƒÆ’Ã‚Â¤ftas",
  ];

  const benefits = [
    "Tydlig offert med totalpris",
    "Digitalt godkÃƒÆ’Ã‚Â¤nnande",
    "Personlig hjÃƒÆ’Ã‚Â¤lp vid ÃƒÆ’Ã‚Â¤ndringar",
    "Trygg planering hela vÃƒÆ’Ã‚Â¤gen",
  ];

  return (
    <aside className="h-full rounded-3xl bg-white border border-white/70 shadow-[0_18px_50px_rgba(15,23,42,0.08)] overflow-hidden flex flex-col">
      <div className="bg-gradient-to-br from-[#194C66] to-[#0f3347] px-5 py-6 text-white">
        <div className="text-xs uppercase tracking-[0.18em] text-white/60">
          Helsingbuss
        </div>
        <h2 className="mt-2 text-xl font-semibold">Offerten ÃƒÆ’Ã‚Â¤r klar</h2>
        <p className="mt-2 text-sm leading-relaxed text-white/75">
          Kontrollera uppgifterna och vÃƒÆ’Ã‚Â¤lj om ni vill godkÃƒÆ’Ã‚Â¤nna, ÃƒÆ’Ã‚Â¤ndra eller
          avbÃƒÆ’Ã‚Â¶ja offerten.
        </p>
      </div>

      <div className="p-5">
        <div className="text-sm font-semibold text-[#0f172a]">Processen</div>

        <div className="mt-4 space-y-4">
          {steps.map((step, index) => (
            <div key={step} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div
                  className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold ${
                    index <= 1
                      ? "bg-[#194C66] text-white"
                      : "bg-[#eef5f9] text-[#194C66]"
                  }`}
                >
                  {index + 1}
                </div>
                {index < steps.length - 1 && (
                  <div className="mt-1 h-8 w-px bg-[#dbe7ee]" />
                )}
              </div>

              <div className="pt-1">
                <div className="text-sm font-medium text-[#0f172a]">
                  {step}
                </div>
                {index === 1 && (
                  <div className="mt-1 text-xs text-slate-500">Just nu</div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-2xl bg-[#f8fafc] border border-[#e2e8f0] p-4">
          <div className="text-sm font-semibold text-[#0f172a]">
            DÃƒÆ’Ã‚Â¤rfÃƒÆ’Ã‚Â¶r vÃƒÆ’Ã‚Â¤ljer kunder oss
          </div>

          <div className="mt-3 space-y-2">
            {benefits.map((item) => (
              <div key={item} className="flex gap-2 text-sm text-slate-600">
                <span className="text-[#194C66]">ÃƒÂ¢Ã…â€œÃ¢â‚¬Å“</span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-auto p-5">
        <div className="rounded-2xl bg-[#eef5f9] px-4 py-4 text-sm text-[#194C66]">
          <div className="font-semibold">BehÃƒÆ’Ã‚Â¶ver ni hjÃƒÆ’Ã‚Â¤lp?</div>
          <p className="mt-1 leading-relaxed">
            VÃƒÆ’Ã‚Â¤lj ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œÃƒÆ’Ã¢â‚¬Å¾ndra din offertÃƒÂ¢Ã¢â€šÂ¬Ã‚Â om nÃƒÆ’Ã‚Â¥got behÃƒÆ’Ã‚Â¶ver justeras innan ni
            godkÃƒÆ’Ã‚Â¤nner.
          </p>
        </div>
      </div>
    </aside>
  );
}

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
