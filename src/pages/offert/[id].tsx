// src/pages/offert/[id].tsx
import type { GetServerSideProps, NextPage } from "next";
import Head from "next/head";
import supabase from "@/lib/supabaseAdmin";
import { verifyOfferToken, type OfferTokenPayload } from "@/lib/offerToken";

// Kundkomponenter
import OfferInkommen from "@/components/offers/OfferInkommen";
import OfferBesvarad from "@/components/offers/OfferBesvarad";
import OfferGodkand from "@/components/offers/OfferGodkand";
import OfferAvbojd from "@/components/offers/OfferAvbojd";
import OfferMakulerad from "@/components/offers/OfferMakulerad";
import OfferBokningsbekraftelse from "@/components/offers/OfferBokningsbekraftelse";

type OfferRow = {
  id: string;
  offer_number: string;
  status?: string | null;

  // datum / metadata
  offer_date?: string | null;
  created_at?: string | null;

  // kunduppgifter / referenser
  contact_person?: string | null;
  customer_email?: string | null;
  customer_phone?: string | null;
  customer_reference?: string | null;   // Er referens
  internal_reference?: string | null;   // Vår referens
  customer_address?: string | null;     // NYTT – används i OfferBesvarad
  customer_number?: string | null;      // NYTT – kundnummer i topbar

  // resa
  departure_place?: string | null;
  destination?: string | null;
  departure_date?: string | null;
  departure_time?: string | null;

  via?: string | null;
  stop?: string | null;
  passengers?: number | null;

  return_departure?: string | null;
  return_destination?: string | null;
  return_date?: string | null;
  return_time?: string | null;

  // pris / kalkyl (NYTT)
  amount_ex_vat?: number | null;
  vat_amount?: number | null;
  total_amount?: number | null;
  vat_breakdown?: any | null;

  // typ av resa (NYTT – används i OfferBesvarad)
  trip_type?: string | null;    // sverige / utrikes etc
  round_trip?: boolean | null;  // om du har detta fält i tabellen

  notes?: string | null;

  // kundens godkännande
  customer_approved?: boolean | null;
  customer_approved_at?: string | null;
};

type Props = {
  offer: OfferRow | null;
  auth: { ok: boolean; reason?: string };
  viewOverride: string | null;
};

const Page: NextPage<Props> = ({ offer, auth, viewOverride }) => {
  const statusRaw = (() => {
    const base = (viewOverride || offer?.status || "").toLowerCase();

    if (!offer) return base;

    const isCancelled =
      base === "makulerad" ||
      base === "avböjd" ||
      base === "avbojd";

    const isBookingConfirmed =
      base === "bokningsbekräftelse" ||
      base === "bokningsbekraftelse";

    if (offer.customer_approved && !isCancelled && !isBookingConfirmed) {
      return "godkänd";
    }

    return base;
  })();

  const renderByStatus = () => {
    if (!auth.ok) {
      return (
        <div className="min-h-[60vh] flex items-center justify-center p-8">
          <div className="max-w-lg rounded-2xl border bg-white p-6 text-center shadow">
            <h1 className="text-xl font-semibold text-[#194C66] mb-2">Åtkomst nekad</h1>
            <p className="text-gray-600">
              Ogiltig eller saknad token för visning av offert.
            </p>
          </div>
        </div>
      );
    }

    if (!offer) {
      return (
        <div className="min-h-[60vh] flex items-center justify-center p-8">
          <div className="max-w-lg rounded-2xl border bg-white p-6 text-center shadow">
            <h1 className="text-xl font-semibold text-[#194C66] mb-2">
              Offert saknas
            </h1>
            <p className="text-gray-600">
              Vi kunde inte hitta någon offert med angivet ID/nummer.
            </p>
          </div>
        </div>
      );
    }

    switch (statusRaw) {
      case "inkommen":
        return <OfferInkommen offer={offer} />;

      case "besvarad":
        return <OfferBesvarad offer={offer} />;

      case "godkänd":
      case "godkand":
        return <OfferGodkand offer={offer} />;

      case "avböjd":
      case "avbojd":
        return <OfferAvbojd offer={offer} />;

      case "makulerad":
        return <OfferMakulerad offer={offer} />;

      case "bokningsbekräftelse":
      case "bokningsbekraftelse":
        return <OfferBokningsbekraftelse offer={offer} />;

      default:
        return <OfferInkommen offer={offer} />;
    }
  };

  const title = offer?.offer_number
    ? `Offert ${offer.offer_number} – Helsingbuss`
    : "Offert – Helsingbuss";

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="robots" content="noindex" />
      </Head>
      <main className="bg-[#f5f4f0] min-h-screen">{renderByStatus()}</main>
    </>
  );
};

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const slug = String(ctx.params?.id ?? "");
  const q = ctx.query || {};

  const token =
    typeof q.token === "string"
      ? q.token
      : typeof q.t === "string"
      ? q.t
      : "";

  const viewOverride = typeof q.view === "string" ? q.view : null;

  if (!slug) {
    return {
      props: {
        offer: null,
        auth: { ok: false, reason: "missing-id" },
        viewOverride,
      },
    };
  }

  const hasToken = token.length > 0;

  let payload: OfferTokenPayload | null = null;
  if (hasToken) {
    try {
      payload = await verifyOfferToken(token);
    } catch {
      payload = null;
    }
  }

  // Bara neka om det faktiskt finns en token men den är ogiltig
  if (hasToken && !payload) {
    return {
      props: {
        offer: null,
        auth: { ok: false, reason: "forbidden" },
        viewOverride,
      },
    };
  }

  // Om token finns måste den matcha id eller offertnummer
  if (hasToken && payload) {
    const matchesNo = !!payload.no && String(payload.no) === slug;
    const matchesId = !!payload.id && String(payload.id) === slug;

    if (!matchesNo && !matchesId) {
      return {
        props: {
          offer: null,
          auth: { ok: false, reason: "forbidden" },
          viewOverride,
        },
      };
    }
  }

  // Här släpper vi nu igenom ÄVEN när det inte finns token alls
  const { data, error } = await supabase
    .from("offers")
    .select(
      [
        "id",
        "offer_number",
        "status",

        // datum
        "offer_date",
        "created_at",

        // kunduppgifter / referenser
        "contact_person",
        "customer_email",
        "customer_phone",
        "customer_reference",
        "internal_reference",

        // resa
        "departure_place",
        "destination",
        "departure_date",
        "departure_time",

        "via",
        "stop",
        "passengers",

        "return_departure",
        "return_destination",
        "return_date",
        "return_time",

        "notes",

        // kundens godkännande
        "customer_approved",
        "customer_approved_at",
      ].join(",")
    )
    .or(`id.eq.${slug},offer_number.eq.${slug}`)
    .maybeSingle();

  if (error) {
    return {
      props: {
        offer: null,
        auth: { ok: false, reason: "db" },
        viewOverride,
      },
    };
  }

  return {
    props: {
      offer: (data ?? null) as OfferRow | null,
      auth: { ok: true },
      viewOverride,
    },
  };
};

export default Page;
