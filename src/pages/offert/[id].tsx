// src/pages/offert/[id].tsx
import Head from "next/head";
import type { GetServerSideProps } from "next";

// Behåll dina design-komponenter
import OfferInkommen from "@/components/offers/OfferInkommen";
import OfferBesvarad from "@/components/offers/OfferBesvarad";
import OfferGodkand from "@/components/offers/OfferGodkand";
import OfferMakulerad from "@/components/offers/OfferMakulerad";

// JWT-verifiering
import { verifyOfferToken } from "@/lib/offerJwt";

type Offer = {
  id: string;
  offer_number?: string | null;
  status?: string | null;
  [key: string]: any;
};

type AuthFail = "missing" | "invalid" | "expired" | "forbidden";

type Props = {
  offer: Offer | null;
  auth?: { ok: false; reason: AuthFail } | { ok: true };
};

// Bygg en säker bas-URL för SSR-anrop till vårt eget API.
// 1) Använd alltid samma host som sidan körs på (så subdomän blir rätt).
// 2) Respektera proxy-header för protokoll (http/https) i Vercel.
function resolveSelfOrigin(ctx: Parameters<GetServerSideProps>[0]) {
  const host = String(ctx.req.headers.host || "");
  // I Vercel sätter edge/proxy ofta x-forwarded-proto
  const xfProto = (ctx.req.headers["x-forwarded-proto"] as string) || "";
  const proto = xfProto ? xfProto.split(",")[0].trim() : "http";
  // Fallback om host saknas vid lokalkörning
  const effectiveHost = host || "localhost:3000";
  return `${proto}://${effectiveHost}`;
}

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const slug = String(ctx.params?.id || "");
  const token = String(ctx.query?.t || "");

  // 1) Kräver token i länken
  if (!token) {
    return { props: { offer: null, auth: { ok: false, reason: "missing" } } };
  }

  // 2) Verifiera token server-side
  try {
    const payload = await verifyOfferToken(token); // kastar vid fel/expire
    // Säkerställ att token verkligen är för den här offerten
    if (payload.offer_id !== slug) {
      return { props: { offer: null, auth: { ok: false, reason: "forbidden" } } };
    }
  } catch (e: any) {
    const msg = String(e?.message || "").toLowerCase();
    if (msg.includes("expired")) {
      return { props: { offer: null, auth: { ok: false, reason: "expired" } } };
    }
    return { props: { offer: null, auth: { ok: false, reason: "invalid" } } };
  }

  // 3) Token OK → hämta offerten via ditt API (oförändrad layout/data)
  try {
    const base = resolveSelfOrigin(ctx); // samma host (kund.helsingbuss.se eller lokalt)
    const resp = await fetch(`${base}/api/offers/${encodeURIComponent(slug)}`, {
      // tips: om du vill dubbel-verifiera i API:t kan du skicka token i headern
      headers: {
        "x-offer-link": "jwt-ok",
        "x-offer-token": token,
      },
    });

    if (!resp.ok) {
      return { props: { offer: null, auth: { ok: false, reason: "invalid" } } };
    }

    const json = await resp.json();
    return { props: { offer: (json?.offer ?? null) as Offer | null, auth: { ok: true } } };
  } catch {
    return { props: { offer: null, auth: { ok: false, reason: "invalid" } } };
  }
};

export default function OffertPublic({ offer, auth }: Props) {
  // Visa tydligt fel vid saknad/felaktig/utgången token
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
  const title = offer.offer_number
    ? `Offertförfrågan ${offer.offer_number}`
    : "Offertförfrågan";

  // Behåll exakt samma designflöde som tidigare
  const commonProps: any = { ...offer, offer };

  let View = OfferInkommen as any;
  if (status === "besvarad") View = OfferBesvarad;
  else if (status === "godkand" || status === "godkänd") View = OfferGodkand;
  else if (status === "makulerad") View = OfferMakulerad;

  return (
    <>
      <Head><title>{title}</title></Head>
      {/* rendera komponenten rakt av – den äger all styling/layout */}
      <View {...commonProps} />
    </>
  );
}


