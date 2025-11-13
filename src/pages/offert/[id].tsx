// src/pages/offert/[id].tsx
import Head from "next/head";
import type { GetServerSideProps } from "next";

// Delvyer
import OfferInkommen from "@/components/offers/OfferInkommen";
import OfferBesvarad from "@/components/offers/OfferBesvarad";
import OfferGodkand from "@/components/offers/OfferGodkand";
import OfferMakulerad from "@/components/offers/OfferMakulerad";

// JWT-verifiering
import { verifyOfferToken } from "@/lib/offerJwt";

type Offer = {
  id?: string;
  offer_number?: string | null;
  status?: string | null;
  [key: string]: any;
};

type AuthFail = "missing" | "invalid" | "expired" | "forbidden";

type Props = {
  offer: Offer | null;
  auth?: { ok: false; reason: AuthFail } | { ok: true };
  viewOverride?: string | null;
};

function resolveSelfOrigin(ctx: Parameters<GetServerSideProps>[0]) {
  // Stöd för proxar (Vercel/NGINX): ta första värdet om flera
  const hXfh = (ctx.req.headers["x-forwarded-host"] as string) || "";
  const hHost = (ctx.req.headers.host as string) || "";
  const host = (hXfh || hHost || "").split(",")[0].trim();

  const xfProtoRaw = (ctx.req.headers["x-forwarded-proto"] as string) || "";
  const xfProto = xfProtoRaw.split(",")[0]?.trim();
  // Anta https i produktion om inget anges
  const isProd = process.env.NODE_ENV === "production";
  const proto = xfProto || (isProd ? "https" : "http");

  const effectiveHost = host || "localhost:3000";
  return `${proto}://${effectiveHost}`;
}

/* ----------------------- DEMO HELPERS ----------------------- */

function buildMockBreakdown(roundTrip: boolean) {
  if (roundTrip) {
    const leg1 = { subtotExVat: 8500, vat: 2125, total: 10625 };
    const leg2 = { subtotExVat: 7900, vat: 1975, total: 9875 };
    const serviceFee = 0;
    return {
      legs: [leg1, leg2],
      serviceFeeExVat: serviceFee,
      grandExVat: leg1.subtotExVat + leg2.subtotExVat + serviceFee,
      grandVat: leg1.vat + leg2.vat,
      grandTotal: leg1.total + leg2.total,
    };
  } else {
    const leg = { subtotExVat: 9200, vat: 2300, total: 11500 };
    return {
      legs: [leg],
      grandExVat: leg.subtotExVat,
      grandVat: leg.vat,
      grandTotal: leg.total,
    };
  }
}

function buildDemoOffer(kind: "single" | "roundtrip", view: string): Offer {
  const roundTrip = kind === "roundtrip";
  const today = new Date().toISOString().slice(0, 10);

  const base: Offer = {
    id: "demo-id",
    offer_number: "HB25PREVIEW",
    status:
      view === "besvarad" ? "besvarad" :
      view === "godkand" || view === "godkänd" ? "godkand" :
      view === "makulerad" || view === "avbojd" || view === "avböjd" ? "makulerad" :
      "inkommen",
    offer_date: today,
    customer_reference: "Namn/Efternamn",
    internal_reference: "Vår referens",
    contact_person: "Namn Efternamn",
    customer_address: "Exempelgatan 12, 123 45 Exempelstad",
    contact_phone: "+46 (0)10-405 38 38",
    contact_email: "info@helsingbuss.se",
    trip_type: "sverige",
    passengers: 15,

    departure_date: today,
    departure_time: "10:00",
    departure_place: "Kristianstad",
    destination: "Malmö C",
    notes: "Ingen information.",

    amount_ex_vat: null,
    vat_amount: null,
    total_amount: null,

    vat_breakdown: buildMockBreakdown(roundTrip),
  };

  if (roundTrip) {
    base.round_trip = true;
    base.return_date = today;
    base.return_time = "19:00";
    base.return_departure = "Malmö C";
    base.return_destination = "Kristianstad";
  } else {
    base.round_trip = false;
  }

  const b = base.vat_breakdown as any;
  base.amount_ex_vat = b?.grandExVat ?? null;
  base.vat_amount = b?.grandVat ?? null;
  base.total_amount = b?.grandTotal ?? null;

  return base;
}

/* ----------------------- SSR ----------------------- */

// liten helper för att plocka första satta värdet
function pickFirst<T = string>(...vals: any[]): T | null {
  for (const v of vals) {
    if (v !== undefined && v !== null && String(v).trim() !== "") return v as T;
  }
  return null;
}

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const slug = String(ctx.params?.id || "");
  const viewOverride = ctx.query?.view ? String(ctx.query.view).toLowerCase() : null;

  // DEMO-MODE: /offert/demo?view=besvarad&kind=roundtrip
  if (slug === "demo") {
    const rawKind = String(ctx.query?.kind || "single").toLowerCase();
    const kind = rawKind === "roundtrip" ? "roundtrip" : "single";
    const v = viewOverride || "inkommen";
    const demoOffer = buildDemoOffer(kind as "single" | "roundtrip", v);
    return {
      props: {
        offer: demoOffer,
        auth: { ok: true },
        viewOverride: v,
      },
    };
  }

  // Tillåt både ?t= och ?token=
  const token = String((ctx.query?.t ?? ctx.query?.token ?? "") || "");
  if (!token) {
    return { props: { offer: null, auth: { ok: false, reason: "missing" }, viewOverride } };
  }

  // 1) verifiera token (men gör ingen tidig slug-jämförelse här)
  let payload: any;
  try {
    payload = await verifyOfferToken(token);
  } catch (e: any) {
    const msg = String(e?.message || "").toLowerCase();
    if (msg.includes("expired")) {
      return { props: { offer: null, auth: { ok: false, reason: "expired" }, viewOverride } };
    }
    return { props: { offer: null, auth: { ok: false, reason: "invalid" }, viewOverride } };
  }

  // Stöd för flera nycklar i token
  const tokId = pickFirst<string>(payload?.offer_id, payload?.offerId, payload?.sub);
  const tokNo = pickFirst<string>(payload?.offer_number, payload?.offerNumber, payload?.no);

  // 2) hämta offerten – din API-route klarar både UUID och offer_number i slug
  try {
    const base = resolveSelfOrigin(ctx);
    const url = `${base}/api/offers/${encodeURIComponent(slug)}`;
    const resp = await fetch(url, {
      headers: {
        accept: "application/json",
        "x-offer-link": "jwt-ok",
        "x-offer-token": token,
      },
    });

    if (!resp.ok) {
      return { props: { offer: null, auth: { ok: false, reason: "invalid" }, viewOverride } };
    }

    const json = await resp.json();
    const offer: Offer | null = (json?.offer ?? null) as Offer | null;
    if (!offer) {
      return { props: { offer: null, auth: { ok: false, reason: "invalid" }, viewOverride } };
    }

    // 3) godkänn om något av följande matchar:
    //    - token.id mot offer.id
    //    - token.no mot offer.offer_number
    //    - slug är samma som offer.id eller offer.offer_number
    const idMatch = tokId && String(offer.id || "") === String(tokId);
    const noMatch = tokNo && String(offer.offer_number || "") === String(tokNo);
    const slugMatch =
      String(slug) === String(offer.id || "") ||
      String(slug) === String(offer.offer_number || "");

    if (!(idMatch || noMatch || slugMatch)) {
      return { props: { offer: null, auth: { ok: false, reason: "forbidden" }, viewOverride } };
    }

    return { props: { offer, auth: { ok: true }, viewOverride } };
  } catch {
    return { props: { offer: null, auth: { ok: false, reason: "invalid" }, viewOverride } };
  }
};

/* ----------------------- PAGE ----------------------- */

function normalizeViewKey(v?: string | null) {
  const s = (v || "").toLowerCase();
  if (s === "besvarad") return "besvarad";
  if (s === "godkand" || s === "godkänd") return "godkand";
  if (s === "makulerad" || s === "avbojd" || s === "avböjd") return "makulerad";
  return "inkommen";
}

export default function OffertPublic({ offer, auth, viewOverride }: Props) {
  if (auth && auth.ok === false) {
    const title = "Offert – åtkomst nekad";
    const msg =
      auth.reason === "missing" ? "Länken saknar säkerhetstoken."
      : auth.reason === "expired" ? "Länken har löpt ut."
      : auth.reason === "forbidden" ? "Den här länken matchar inte offerten."
      : "Ogiltig eller manipulerad länk.";

    return (
      <>
        <Head>
          <title>{title}</title>
          <meta name="robots" content="noindex,nofollow" />
        </Head>
        <main className="min-h-screen bg-[#f5f4f0] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white border rounded-2xl p-6 shadow-sm">
            <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
            <p className="mt-2 text-slate-700">{msg}</p>
            <p className="mt-4 text-sm text-slate-500">
              Behöver du ny länk? Kontakta{" "}
              <a className="text-[#194C66]" href="mailto:info@helsingbuss.se">
                info@helsingbuss.se
              </a>.
            </p>
          </div>
        </main>
      </>
    );
  }

  if (!offer) {
    return (
      <>
        <Head>
          <title>Offert saknas</title>
          <meta name="robots" content="noindex,nofollow" />
        </Head>
        <main className="min-h-screen bg-[#f5f4f0] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white border rounded-2xl p-6 shadow-sm text-[#194C66]">
            Kunde inte hitta offerten.
          </div>
        </main>
      </>
    );
  }

  const status = normalizeViewKey(offer.status);
  const viewKey = normalizeViewKey(viewOverride || status);
  const title = offer.offer_number ? `Offert ${offer.offer_number}` : "Offert";

  const map: Record<string, any> = {
    inkommen: OfferInkommen,
    besvarad: OfferBesvarad,
    godkand: OfferGodkand,
    makulerad: OfferMakulerad,
  };

  const View = map[viewKey] || OfferInkommen;

  // Kundkomponenterna förväntar sig { offer } eller platt objekt – behåll båda för bakåtkomp.
  const commonProps: any = { ...offer, offer };

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>
      <View {...commonProps} />
    </>
  );
}
