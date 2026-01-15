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

  // *** PRISFÄLT ***
  amount_ex_vat?: number | null;
  vat_amount?: number | null;
  total_amount?: number | null;
  vat_breakdown?: any | null;

  // kunduppgifter / referenser
  customer_number?: string | null;
  contact_person?: string | null;
  customer_email?: string | null;
  customer_phone?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  customer_reference?: string | null;
  internal_reference?: string | null;
  customer_address?: string | null;

  // resa – huvud
  trip_type?: string | null;
  round_trip?: boolean | null;
  departure_place?: string | null;
  destination?: string | null;
  final_destination?: string | null;
  departure_date?: string | null;
  departure_time?: string | null;
  via?: string | null;
  stop?: string | null;
  passengers?: number | null;

  // resa – tider
  on_site_time?: number | null;
  on_site_minutes?: number | null;
  end_time?: string | null;

  // retur
  return_departure?: string | null;
  return_destination?: string | null;
  return_date?: string | null;
  return_time?: string | null;
  return_on_site_time?: number | null;
  return_on_site_minutes?: number | null;
  return_end_time?: string | null;

  // chaufför / fordon / buss
  driver_name?: string | null;
  driver_phone?: string | null;
  return_driver_name?: string | null;
  return_driver_phone?: string | null;
  vehicle_reg?: string | null;
  vehicle_model?: string | null;
  return_vehicle_reg?: string | null;
  return_vehicle_model?: string | null;
  bus_name?: string | null;
  bus_reg?: string | null;

  // övrigt
  notes?: string | null;
  payment_terms?: string | null;

  // trafikledning
  ops_message?: string | null;
  ops_comment?: string | null;
  traffic_comment?: string | null;

  // multi-leg (JSON från DB)
  legs?: any | null;

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
      base === "makulerad" || base === "avböjd" || base === "avbojd";

    const isBookingConfirmed =
      base === "bokningsbekräftelse" || base === "bokningsbekraftelse";

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
            <h1 className="text-xl font-semibold text-[#194C66] mb-2">
              Åtkomst nekad
            </h1>
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
  const slug = String(ctx.params?.id ?? "").trim();
  const q = ctx.query || {};

  const token =
    typeof q.token === "string"
      ? q.token.trim()
      : typeof q.t === "string"
      ? q.t.trim()
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

  // ✅ Hämta offerten först så vi kan matcha token mot rätt offert även när slug = HBxxxxx
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

        // pris
        "amount_ex_vat",
        "vat_amount",
        "total_amount",
        "vat_breakdown",

        // kund
        "customer_number",
        "contact_person",
        "customer_email",
        "customer_phone",
        "contact_email",
        "contact_phone",
        "customer_reference",
        "internal_reference",
        "customer_address",

        // resa – huvud
        "trip_type",
        "round_trip",
        "departure_place",
        "destination",
        "final_destination",
        "departure_date",
        "departure_time",
        "via",
        "stop",
        "passengers",

        // resa – tider
        "on_site_time",
        "on_site_minutes",
        "end_time",

        // retur
        "return_departure",
        "return_destination",
        "return_date",
        "return_time",
        "return_on_site_time",
        "return_on_site_minutes",
        "return_end_time",

        // chaufför / fordon / buss
        "driver_name",
        "driver_phone",
        "return_driver_name",
        "return_driver_phone",
        "vehicle_reg",
        "vehicle_model",
        "return_vehicle_reg",
        "return_vehicle_model",
        "bus_name",
        "bus_reg",

        // övrigt
        "notes",
        "payment_terms",

        // trafikledning
        "ops_message",
        "ops_comment",
        "traffic_comment",

        // multi-leg
        "legs",

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

  const offer = (data ?? null) as OfferRow | null;

  // Om offerten inte finns -> låt UI visa "Offert saknas" (ingen åtkomst-nek här)
  if (!offer) {
    return {
      props: {
        offer: null,
        auth: { ok: true },
        viewOverride,
      },
    };
  }

  // Här släpper vi igenom även när det inte finns token alls (som du hade)
  if (!token) {
    return {
      props: {
        offer,
        auth: { ok: true },
        viewOverride,
      },
    };
  }

  // ✅ Token finns: 1) försök verifiera som JWT (din befintliga), 2) fallback: UUID som matchar offer.id
  let payload: OfferTokenPayload | null = null;
  try {
    payload = (await verifyOfferToken(token)) as any;
  } catch {
    payload = null;
  }

  // JWT ok -> token måste höra till denna offert (matcha id eller offer_number)
  if (payload) {
    const payloadId =
      (payload as any).offerId ??
      (payload as any).offer_id ??
      (payload as any).offerId ??
      payload.id ??
      null;

    const payloadNo =
      (payload as any).offerNumber ??
      (payload as any).offer_number ??
      payload.no ??
      null;

    const matches =
      (payloadId && String(payloadId) === offer.id) ||
      (payloadNo &&
        String(payloadNo).toUpperCase() === offer.offer_number.toUpperCase());

    if (!matches) {
      return {
        props: {
          offer: null,
          auth: { ok: false, reason: "forbidden" },
          viewOverride,
        },
      };
    }

    return {
      props: {
        offer,
        auth: { ok: true },
        viewOverride,
      },
    };
  }

  // JWT misslyckades -> om token ser ut som UUID och matchar offer.id => släpp igenom
  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      token
    );

  if (isUuid && token === offer.id) {
    return {
      props: {
        offer,
        auth: { ok: true },
        viewOverride,
      },
    };
  }

  // Token fanns men var ogiltig för denna offert
  return {
    props: {
      offer: null,
      auth: { ok: false, reason: "forbidden" },
      viewOverride,
    },
  };
};

export default Page;
