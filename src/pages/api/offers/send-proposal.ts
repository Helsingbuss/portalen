import type { NextApiRequest, NextApiResponse } from "next";
import supabase from "@/lib/supabaseAdmin";
import { sendOfferMail } from "@/lib/sendMail";

// ===== Typ som matchar dina kolumner =====
type OfferRow = {
  id: string;
  offer_number: string;
  status?: string | null;

  contact_person: string | null;
  customer_email: string | null;
  customer_phone: string | null;

  departure_place: string | null;
  destination: string | null;
  departure_date: string | null;
  departure_time: string | null;

  via: string | null;
  stop: string | null;
  passengers?: number | null;

  return_departure: string | null;
  return_destination: string | null;
  return_date: string | null;
  return_time: string | null;

  notes?: string | null;
};

function isOfferRow(d: any): d is OfferRow {
  return (
    d &&
    typeof d === "object" &&
    typeof d.id === "string" &&
    typeof d.offer_number === "string"
  );
}

// Enkel UUID-koll (räcker gott här)
function isUuid(val: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    val
  );
}

// null/undefined → undefined (bra för mailparametrar)
const U = <T extends string | number | null | undefined>(v: T) =>
  v == null ? undefined : (v as Exclude<T, null>);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    if (req.method !== "POST")
      return res.status(405).json({ error: "Method not allowed" });

    // Body från OfferCalculator
    const body = (req.body || {}) as {
      offerId?: string;          // <-- det här fältet kommer från frontend
      offerNumber?: string;
      customerEmail?: string;
      totals?: { exVat: number; vat: number; total: number };
      pricing?: any;
      input?: any;
      // extra fält om du vill senare (via, notes osv)
    };

    const idOrNo = String(
      body.offerId || body.offerNumber || req.query.id || ""
    ).trim();

    if (!idOrNo) {
      return res.status(400).json({ error: "Saknar offert-id/nummer" });
    }

    // 1) Hämta offerten – matcha antingen på UUID (id) eller offer_number
    let query = supabase.from("offers").select(
      [
        "id",
        "offer_number",
        "status",
        "contact_person",
        "customer_email",
        "customer_phone",
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
      ].join(",")
    );

    if (isUuid(idOrNo)) {
      query = query.eq("id", idOrNo);
    } else {
      query = query.eq("offer_number", idOrNo);
    }

    const { data, error } = await query.single();

    if (error) {
      console.error("[send-proposal] fetch error:", error);
      return res.status(500).json({ error: error.message });
    }
    if (!isOfferRow(data)) {
      return res
        .status(500)
        .json({ error: "Dataparsning misslyckades (OfferRow)" });
    }

    const offer = data;

    // 2) Sätt status = "besvarad" om inte redan
    const currentStatus = String(offer.status ?? "").toLowerCase();
    if (currentStatus !== "besvarad") {
      const { error: uerr } = await supabase
        .from("offers")
        .update({ status: "besvarad" })
        .eq("id", offer.id);
      if (uerr) {
        console.error("[send-proposal] update error:", uerr);
        return res.status(500).json({ error: uerr.message });
      }
    }

    // 3) Skicka mail till kund – använd databasen som “sanning”
    await sendOfferMail({
      offerId: offer.id,
      offerNumber: offer.offer_number,

      customerEmail: U(offer.customer_email ?? body.customerEmail),
      customerName: U(offer.contact_person),

      from: U(offer.departure_place),
      to: U(offer.destination),
      date: U(offer.departure_date),
      time: U(offer.departure_time),
      via: U(offer.via),
      stop: U(offer.stop),
      passengers:
        typeof offer.passengers === "number" ? offer.passengers : undefined,

      return_from: U(offer.return_departure),
      return_to: U(offer.return_destination),
      return_date: U(offer.return_date),
      return_time: U(offer.return_time),

      notes: U(offer.notes),
      // du kan lägga in totals/pricing/input här om din mail-template använder dem
    });

    return res.status(200).json({ ok: true });
  } catch (e: any) {
    console.error("[offers/send-proposal] error:", e?.message || e);
    return res.status(500).json({ error: e?.message || "Serverfel" });
  }
}
