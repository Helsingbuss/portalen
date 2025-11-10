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
  const host = String(ctx.req.headers.host || "");
  const xfProto = (ctx.req.headers["x-forwarded-proto"] as string) || "";
  const proto = xfProto ? xfProto.split(",")[0].trim() : "http";
  const effectiveHost = host || "localhost:3000";
  return `${proto}://${effectiveHost}`;
}

/* ----------------------- DEMO HELPERS ----------------------- */

function buildMockBreakdown(roundTrip: boolean) {
  // Snygga siffror som ger tydliga per-sträcka-belopp i Besvarad
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

    // totals (fallbacks om breakdown saknas)
    amount_ex_vat: null,
    vat_amount: null,
    total_amount: null,

    // breakdown för Besvarad
    vat_breakdown: buildMockBreakdown(roundTrip),
  };

  if (roundTrip) {
    base.round_trip = true;
    base.return_date = today;
    base.return_time = "19:00";
  } else {
    base.round_trip = false;
  }

  // Sätt totals från breakdown så både totals & per-resa visas
  const b = base.vat_breakdown as any;
  base.amount_ex_vat = b?.grandExVat ?? null;
  base.vat_amount = b?.grandVat ?? null;
  base.total_amount = b?.grandTotal ?? null;

  return base;
}

/* ----------------------- SSR ----------------------- */

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

  const token = String(ctx.query?.t || "");

  if (!token) {
    return { props: { offer: null, auth: { ok: false, reason: "missing" }, viewOverride } };
  }

  try {
    const payload = await verifyOfferToken(token);
    if (payload.offer_id !== slug) {
      return { props: { offer: null, auth: { ok: false, reason: "forbidden" }, viewOverride } };
    }
  } catch (e: any) {
    const msg = String(e?.message || "").toLowerCase();
    if (msg.includes("expired")) {
      return { props: { offer: null, auth: { ok: false, reason: "expired" }, viewOverride } };
    }
    return { props: { offer: null, auth: { ok: false, reason: "invalid" }, viewOverride } };
  }

  try {
    const base = resolveSelfOrigin(ctx);
    const resp = await fetch(`${base}/api/offers/${encodeURIComponent(slug)}`, {
      headers: { "x-offer-link": "jwt-ok", "x-offer-token": token },
    });

    if (!resp.ok) {
      return { props: { offer: null, auth: { ok: false, reason: "invalid" }, viewOverride } };
    }

    const json = await resp.json();
    return { props: { offer: (json?.offer ?? null) as Offer | null, auth: { ok: true }, viewOverride } };
  } catch {
    return { props: { offer: null, auth: { ok: false, reason: "invalid" }, viewOverride } };
  }
};

/* ----------------------- PAGE ----------------------- */

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
        <Head><title>{title}</title></Head>
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
        <Head><title>Offert saknas</title></Head>
        <main className="min-h-screen bg-[#f5f4f0] flex items-center justify-center">
          <div className="text-[#194C66]">Kunde inte hitta offerten.</div>
        </main>
      </>
    );
  }

  const status = (offer.status || "").toLowerCase();
  const title = offer.offer_number ? `Offert ${offer.offer_number}` : "Offert";

  const map: Record<string, any> = {
    inkommen: OfferInkommen,
    besvarad: OfferBesvarad,
    godkand: OfferGodkand,
    "godkänd": OfferGodkand,
    makulerad: OfferMakulerad,
    avbojd: OfferMakulerad,
    "avböjd": OfferMakulerad,
  };

  let View = (viewOverride && map[viewOverride]) || null;

  if (!View) {
    View =
      status === "besvarad" ? OfferBesvarad
      : status === "godkand" || status === "godkänd" ? OfferGodkand
      : status === "makulerad" || status === "avbojd" || status === "avböjd" ? OfferMakulerad
      : OfferInkommen;
  }

  const commonProps: any = { ...offer, offer };

  return (
    <>
      <Head><title>{title}</title></Head>
      <View {...commonProps} />
    </>
  );
}
