// src/pages/offert/[id].tsx
import Head from "next/head";
import type { GetServerSideProps } from "next";
import OfferInkommen from "@/components/offers/OfferInkommen";
import OfferBesvarad from "@/components/offers/OfferBesvarad";
import OfferGodkand from "@/components/offers/OfferGodkand";
import OfferMakulerad from "@/components/offers/OfferMakulerad";
import { verifyOfferToken } from "@/lib/offerToken";

type Offer = { id?: string; offer_number?: string | null; status?: string | null; [k: string]: any };
type AuthFail = "missing" | "invalid" | "expired" | "forbidden";
type Props = { offer: Offer | null; auth?: { ok: false; reason: AuthFail } | { ok: true }; viewOverride?: string | null };

function resolveSelfOrigin(ctx: Parameters<GetServerSideProps>[0]) {
  const host = ((ctx.req.headers["x-forwarded-host"] as string) || ctx.req.headers.host || "").toString().split(",")[0].trim();
  const xfProto = ((ctx.req.headers["x-forwarded-proto"] as string) || "").toString().split(",")[0].trim();
  const proto = xfProto || (process.env.NODE_ENV === "production" ? "https" : "http");
  return `${proto}://${host || "localhost:3000"}`;
}

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const slug = String(ctx.params?.id || "");
  const viewOverride = ctx.query?.view ? String(ctx.query.view).toLowerCase() : null;

  const token = String(ctx.query?.t || ctx.query?.token || "");
  if (!token) return { props: { offer: null, auth: { ok: false, reason: "missing" }, viewOverride } };

  try {
    const payload = await verifyOfferToken(token);
    const matchesNo = payload.no && String(payload.no) === slug;
    const matchesId = payload.sub && String(payload.sub) === slug;
    if (!matchesNo && !matchesId) return { props: { offer: null, auth: { ok: false, reason: "forbidden" }, viewOverride } };
  } catch (e: any) {
    const msg = String(e?.message || "").toLowerCase();
    return { props: { offer: null, auth: { ok: false, reason: msg.includes("expired") ? "expired" : "invalid" }, viewOverride } };
  }

  try {
    const base = resolveSelfOrigin(ctx);
    const resp = await fetch(`${base}/api/offers/${encodeURIComponent(slug)}`, {
      headers: { accept: "application/json", "x-offer-link": "jwt-ok", "x-offer-token": token },
    });
    if (!resp.ok) return { props: { offer: null, auth: { ok: true }, viewOverride } };
    const json = await resp.json();
    return { props: { offer: (json?.offer ?? null) as Offer | null, auth: { ok: true }, viewOverride } };
  } catch {
    return { props: { offer: null, auth: { ok: true }, viewOverride } };
  }
};

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
        <Head><title>{title}</title><meta name="robots" content="noindex,nofollow" /></Head>
        <main className="min-h-screen bg-[#f5f4f0] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white border rounded-2xl p-6 shadow-sm">
            <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
            <p className="mt-2 text-slate-700">{msg}</p>
            <p className="mt-4 text-sm text-slate-500">Behöver du ny länk? Kontakta <a className="text-[#194C66]" href="mailto:info@helsingbuss.se">info@helsingbuss.se</a>.</p>
          </div>
        </main>
      </>
    );
  }

  if (!offer) {
    return (
      <>
        <Head><title>Offert saknas</title><meta name="robots" content="noindex,nofollow" /></Head>
        <main className="min-h-screen bg-[#f5f4f0] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white border rounded-2xl p-6 shadow-sm text-[#194C66]">Kunde inte hitta offerten.</div>
        </main>
      </>
    );
  }

  const status = normalizeViewKey(offer.status);
  const viewKey = normalizeViewKey(viewOverride || status);
  const title = offer.offer_number ? `Offert ${offer.offer_number}` : "Offert";

  const map: Record<string, any> = { inkommen: OfferInkommen, besvarad: OfferBesvarad, godkand: OfferGodkand, makulerad: OfferMakulerad };
  const View = map[viewKey] || OfferInkommen;
  const commonProps: any = { ...offer, offer };

  return (
    <>
      <Head><title>{title}</title><meta name="robots" content="noindex,nofollow" /></Head>
      <View {...commonProps} />
    </>
  );
}
