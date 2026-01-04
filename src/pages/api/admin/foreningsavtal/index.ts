import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type AgreementStatus = "utkast" | "aktivt" | "pausad" | "avslutat";

type AgreementRow = {
  id: string;
  agreementNumber: string;
  associationName: string;
  orgNumber: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  agreementTitle: string;
  status: AgreementStatus;
  validFrom: string;
  validTo: string;
  minTripsPerYear: string;
  discountType: "none" | "percent" | "fixed";
  discountValue: string;
  ticketKickbackPercent: string;
  bookingTerms: string;
  cancellationTerms: string;
  extrasIncluded: string;
  marketingSupport: string;
  internalNotes: string;
};

function mapRow(row: any): AgreementRow {
  const toStr = (v: any) =>
    v === null || v === undefined ? "" : String(v);

  return {
    id: row.id,
    agreementNumber: toStr(row.agreement_number),
    associationName: toStr(row.association_name),
    orgNumber: toStr(row.org_number),
    contactName: toStr(row.contact_name),
    contactEmail: toStr(row.contact_email),
    contactPhone: toStr(row.contact_phone),
    agreementTitle: toStr(row.agreement_title),
    status: (row.status as AgreementStatus) || "utkast",
    validFrom: toStr(row.valid_from),
    validTo: toStr(row.valid_to),
    minTripsPerYear: toStr(row.min_trips_per_year),
    discountType:
      (row.discount_type as AgreementRow["discountType"]) || "none",
    discountValue: toStr(row.discount_value),
    ticketKickbackPercent: toStr(row.ticket_kickback_percent),
    bookingTerms: toStr(row.booking_terms),
    cancellationTerms: toStr(row.cancellation_terms),
    extrasIncluded: toStr(row.extras_included),
    marketingSupport: toStr(row.marketing_support),
    internalNotes: toStr(row.internal_notes),
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from("association_agreements")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[foreningsavtal/index] Supabase error:", error);
      return res.status(500).json({
        error: "Kunde inte hämta föreningsavtal.",
        supabaseError: error.message,
      });
    }

    const agreements = (data || []).map(mapRow);
    return res.status(200).json({ agreements });
  } catch (e: any) {
    console.error("[foreningsavtal/index] Fatal error:", e?.message || e);
    return res.status(500).json({ error: "Internt fel i API:t." });
  }
}
