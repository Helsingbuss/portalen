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

  // totals & per-resa (om breakdown finns)
  const breakdown: Breakdown | null =
    typeof offer?.vat_breakdown === "object" && offer?.vat_breakdown
      ? (offer.vat_breakdown as Breakdown)
      : null;

  const totals = {
    ex: offer?.amount_ex_vat ?? breakdown?.grandExVat ?? null,
    vat: offer?.vat_amount ?? breakdown?.grandVat ?? null,
    sum: offer?.total_amount ?? breakdown?.grandTotal ?? null,
  };

  // --- actions-state & handlers
  const [busy, setBusy] = useState<"accept" | "decline" | "change" | null>(null);

  async function postWithFallback(pathWithId: string, fallbackPath: string, body: any) {
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
          // valfria overrides kan skickas här:
          assigned_vehicle_id: null,
          assigned_driver_id: null,
          notes: offer?.notes ?? null,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || `HTTP ${res.status}`);
      return j?.booking ?? null;
    } catch {
      return null; // misslyckas tyst (vi fortsätter ändå med godkännandeflödet)
    }
  }

  async function onAcceptOffer() {
    if (!offer?.offer_number || !email) {
      alert("Saknas uppgifter (offertnummer/e-post).");
      return;
    }
    try {
      setBusy("accept");

      // 1) Markera som accepterad (din backend kan maila bekräftelse etc.)
      const res = await postWithFallback(
        `/api/offers/${offer.id}/accept`,
        `/api/offers/accept`,
        { customerEmail: email, offerNumber: offer.offer_number }
      );
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || `Kunde inte acceptera (HTTP ${res.status})`);
      }

      // 2) Skapa bokning i admin baserat på offerten
      const booking = await createBookingFromOffer();

      // 3) Skicka kunden till "godkänd"-vyn (inkl. boknings-ID om vi har det)
      const q = booking?.id ? `?view=godkand&bk=${encodeURIComponent(booking.id)}` : `?view=godkand`;
      window.location.href = `/offert/${offer.offer_number}${q}`;
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
      // Din backend kan här: skicka notis + sätta status "makulerad"
      const res = await postWithFallback(
        `/api/offers/${offer.id}/decline`,
        `/api/offers/decline`,
        {
          customerEmail: email,
          offerNumber: offer.offer_number,
          updateStatusTo: "makulerad", // hint till API:t (ignoreras om ej stöds)
          notifyTeam: true,             // hint till API:t (ignoreras om ej stöds)
        }
      );
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || `Kunde inte avböja (HTTP ${res.status})`);
      }
      window.location.href = `/offert/${offer.offer_number}?view=avbojd`;
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
          message: "Kunden önskar ändringar i offerten. Kontakta kunden för detaljer.",
        }
      );
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || `Kunde inte skicka ändringsförfrågan (HTTP ${res.status})`);
      }
      alert("Tack! Vi återkommer med uppdaterad offert.");
    } catch (e: any) {
      alert(e?.message || "Tekniskt fel vid ändringsförfrågan.");
    } finally {
      setBusy(null);
    }
  }

  // --- RENDER ---
  return (
    <div className="bg-[#f5f4f0] overflow-hidden">
      {/* TOPPRAD (samma som inkommen) */}
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
          {/* VÄNSTER – fast vit panel */}
          <div className="h-full">
            <OfferLeftSidebar />
          </div>

          {/* MITTEN – resekort och text */}
          <main className="h-full pl-4 lg:pl-6 pr-2 lg:pr-3 py-4 lg:py-6">
            <div className="h-full bg-white rounded-xl shadow flex flex-col">
              {/* LOGO + TITEL + INTRO */}
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
                    Hej!<br />
                    Er offert är nu klar och sammanställer en tydlig plan för resan. Nedan ser ni rutt
                    och hållplatser, tider, bussmodell, pris och villkor. Kontrollera uppgifterna innan
                    ni godkänner och klicka på <strong>Acceptera offert</strong> för att säkra kapacitet
                    och planering. Önskar ni justera antal resenärer, bagage, barnstol/tillgänglighet
                    eller service ombord? Maila{" "}
                    <a className="underline" href="mailto:kundteam@helsingbuss.se">
                      kundteam@helsingbuss.se
                    </a>{" "}
                    så uppdaterar vi direkt. Luta er tillbaka – vi ordnar resten.
                  </p>
                </div>

                {/* RESEKORT (ut/retur) */}
                <div className="mt-5">
                  <TripLegGrid>
                    {trips.map((trip, idx) => {
                      const leg = breakdown?.legs?.[idx];
                      return (
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
                          // Extra block för pris per sträcka
                          footer={
                            breakdown?.legs ? (
                              <div className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 mt-3 text-[14px]">
                                <div className="text-[#0f172a]/70">Pris exkl. moms</div>
                                <div>{money(leg?.subtotExVat)}</div>
                                <div className="text-[#0f172a]/70">Moms</div>
                                <div>{money(leg?.vat)}</div>
                                <div className="text-[#0f172a]/70">Summa</div>
                                <div>{money(leg?.total)}</div>
                              </div>
                            ) : null
                          }
                        />
                      );
                    })}
                  </TripLegGrid>
                </div>

                {/* INFOTEXTER */}
                <div
                  className="mt-6 text-[14px] text-[#0f172a]/80"
                  style={{ lineHeight: LINE_HEIGHT }}
                >
                  <p>
                    Genom att godkänna offerten bekräftar ni att ni har tagit del av våra resevillkor
                    (läs dem här). Observera att datum och tider är i mån av tillgänglighet; slutlig
                    kapacitet kontrolleras vid bokning och bekräftas först genom en skriftlig
                    bokningsbekräftelse från oss.
                  </p>
                  <p className="mt-3">
                    Vill ni boka eller har frågor/ändringar? Kontakta oss så hjälper vi gärna.{" "}
                    Våra öppettider är vardagar kl. 08:00–17:00. För akuta ärenden eller bokningar med
                    kortare varsel än två arbetsdagar, ring vårt journummer:{" "}
                    <strong>010–777 21 58</strong>.
                  </p>
                </div>
              </div>

              {/* FOOTER (adress/bank) */}
              <div className="mt-auto px-6 pb-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-[13px] text-[#0f172a]">
                  <div>
                    <div>Helsingbuss</div>
                    <div>Höjderupsgränd 12</div>
                    <div>254 45 Helsingborg</div>
                    <div>helsingbuss.se</div>
                  </div>
                  <div>
                    <div>Tel. +46 (0) 405 38 38</div>
                    <div>Jour. +46 (0) 777 21 58</div>
                    <div>info@helsingbuss.se</div>
                  </div>
                  <div>
                    <div>Bankgiro: 9810-01 3931</div>
                    <div>Org.nr: 890101-3931</div>
                    <div>VAT nr: SE890101393101</div>
                  </div>
                </div>
              </div>
            </div>
          </main>

          {/* HÖGER – kund + pris + knappar */}
          <aside className="h-full p-4 lg:p-6">
            <div className="h-full bg-white rounded-xl shadow flex flex-col">
              {/* Kunduppgifter */}
              <div className="px-6 pt-6">
                <div className="inline-flex items-center rounded-full bg-[#eef5f9] px-3 py-1 text-sm text-[#194C66] font-medium">
                  Kunduppgifter
                </div>

                <dl className="mt-4 grid grid-cols-[auto,1fr] gap-x-6 gap-y-1 text-[14px] text-[#0f172a] leading-tight">
                  <DT>Offertdatum:</DT><DD>{v(offer?.offer_date, "—")}</DD>
                  <DT>Er referens:</DT><DD>{v(offer?.customer_reference, "—")}</DD>
                  <DT>Vår referens:</DT><DD>{v(offer?.internal_reference, "—")}</DD>
                  <DT>Namn:</DT><DD>{v(offer?.contact_person, "—")}</DD>
                  <DT>Adress:</DT><DD>{v(offer?.customer_address, "—")}</DD>
                  <DT>Telefon:</DT><DD>{v(offer?.contact_phone, "—")}</DD>
                  <DT>E-post:</DT><DD>{v(email, "—")}</DD>
                </dl>

                {/* Prisöversyn */}
                <div className="mt-6">
                  <div className="font-semibold text-[#0f172a]">
                    Offertinformation om kostnad
                  </div>

                  {/* Tabell: enkel vs tur&retur */}
                  <div className="mt-3">
                    {/* Head */}
                    <div className="grid" style={{ gridTemplateColumns: roundTrip ? "1fr 1fr 1fr" : "1fr 1fr" }}>
                      <div className="text-[#0f172a]/70 text-sm"> </div>
                      <div className="text-[#0f172a]/70 text-sm font-semibold">Enkel</div>
                      {roundTrip && (
                        <div className="text-[#0f172a]/70 text-sm font-semibold">Tur&Retur</div>
                      )}
                    </div>

                    {/* Rows */}
                    <Row roundTrip={roundTrip} label="Summa exkl. moms"
                      enkel={money(breakdown?.legs?.[0]?.subtotExVat ?? totals.ex)}
                      retur={roundTrip ? money(breakdown?.legs?.[1]?.subtotExVat) : undefined}
                    />
                    <Row roundTrip={roundTrip} label="Moms"
                      enkel={money(breakdown?.legs?.[0]?.vat ?? totals.vat)}
                      retur={roundTrip ? money(breakdown?.legs?.[1]?.vat) : undefined}
                    />
                    <Row roundTrip={roundTrip} label="Totalsumma"
                      enkel={money(breakdown?.legs?.[0]?.total ?? totals.sum)}
                      retur={roundTrip ? money(breakdown?.legs?.[1]?.total) : undefined}
                    />

                    {/* Offertkostnad för uppdraget (total) */}
                    <div className="mt-3 grid grid-cols-[1fr_auto] items-baseline">
                      <div className="text-[#0f172a]/70 text-sm">Offertkostnad för detta uppdrag</div>
                      <div className="font-medium">{money(totals.sum)}</div>
                    </div>
                  </div>

                  {/* Betalningsvillkor */}
                  <div className="mt-6 text-[13px] text-[#0f172a]/80 leading-relaxed">
                    <div className="font-semibold text-[#0f172a] mb-1">Betalningsvillkor</div>
                    <p>
                      10 dagar netto om de är företag/förening, faktura kommer efter uppdrag.
                      För privatperson ska fakturan vara betald minst 3 dagar innan uppdraget.
                    </p>
                  </div>
                </div>
              </div>

              {/* Knappfält – ligger i botten av högerspalten */}
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
  return <dt className="font-semibold text-[#0f172a]/70 whitespace-nowrap">{children}</dt>;
}
function DD({ children }: { children: React.ReactNode }) {
  return <dd className="text-[#0f172a] break-words">{children}</dd>;
}

/* Rad i prisöversynen till höger */
function Row({
  roundTrip,
  label,
  enkel,
  retur,
}: {
  roundTrip: boolean;
  label: string;
  enkel: string;
  retur?: string;
}) {
  return (
    <div
      className="mt-1 grid items-baseline text-[14px]"
      style={{ gridTemplateColumns: roundTrip ? "1fr 1fr 1fr" : "1fr 1fr" }}
    >
      <div className="text-[#0f172a]/70">{label}</div>
      <div>{enkel}</div>
      {roundTrip && <div>{retur ?? "—"}</div>}
    </div>
  );
}
