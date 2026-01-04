import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type AgreementStatus = "utkast" | "aktivt" | "pausad" | "avslutat";

interface AgreementForm {
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
}

interface SaveBody {
  id?: string; // tom = nytt avtal
  data: AgreementForm;
}

function numOrNull(v: any): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function mapRow(row: any) {
  const toStr = (v: any) =>
    v === null || v === undefined ? "" : String(v);

  return {
    id: row.id as string,
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
      (row.discount_type as AgreementForm["discountType"]) || "none",
    discountValue: toStr(row.discount_value),
    ticketKickbackPercent: toStr(row.ticket_kickback_percent),
    bookingTerms: toStr(row.booking_terms),
    cancellationTerms: toStr(row.cancellation_terms),
    extrasIncluded: toStr(row.extras_included),
    marketingSupport: toStr(row.marketing_support),
    internalNotes: toStr(row.internal_notes),
  };
}

async function getNextAgreementNumber(): Promise<string> {
  const year = new Date().getFullYear().toString().slice(-2); // t.ex. "25"
  const prefix = `AV${year}-`;

  const { data, error } = await supabaseAdmin
    .from("association_agreements")
    .select("agreement_number")
    .like("agreement_number", `${prefix}%`)
    .order("agreement_number", { ascending: false })
    .limit(1);

  if (error || !data || data.length === 0) {
    return `${prefix}001`;
  }

  const last = data[0].agreement_number as string | null;
  if (!last) return `${prefix}001`;

  const m = last.match(/^AV\d{2}-(\d{3,})$/);
  const nextSeq = m ? parseInt(m[1], 10) + 1 : 1;
  return `${prefix}${String(nextSeq).padStart(3, "0")}`;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const rawBody: SaveBody =
      typeof req.body === "string" ? JSON.parse(req.body) : req.body;

    const { id, data } = rawBody;

    if (!data.associationName?.trim()) {
      return res
        .status(400)
        .json({ error: "associationName (förening/klubb) saknas." });
    }

    const payload: any = {
      association_name: data.associationName.trim(),
      org_number: data.orgNumber?.trim() || null,
      contact_name: data.contactName?.trim() || null,
      contact_email: data.contactEmail?.trim() || null,
      contact_phone: data.contactPhone?.trim() || null,
      agreement_title: data.agreementTitle?.trim() || null,
      status: data.status || "utkast",
      valid_from: data.validFrom || null,
      valid_to: data.validTo || null,
      min_trips_per_year: numOrNull(data.minTripsPerYear),
      discount_type: data.discountType || "none",
      discount_value: numOrNull(data.discountValue),
      ticket_kickback_percent: numOrNull(data.ticketKickbackPercent),
      booking_terms: data.bookingTerms || null,
      cancellation_terms: data.cancellationTerms || null,
      extras_included: data.extrasIncluded || null,
      marketing_support: data.marketingSupport || null,
      internal_notes: data.internalNotes || null,
      updated_at: new Date().toISOString(),
    };

    let row;

    if (id) {
      // Uppdatera befintligt avtal
      const { data: updated, error } = await supabaseAdmin
        .from("association_agreements")
        .update(payload)
        .eq("id", id)
        .select("*")
        .single();

      if (error) {
        console.error("[foreningsavtal/save] update error:", error);
        return res.status(500).json({
          error: "Kunde inte uppdatera avtalet.",
          supabaseError: error.message,
        });
      }

      row = updated;
    } else {
      // Skapa nytt avtal + generera nummer
      const agreementNumber =
        (data as any).agreementNumber || (await getNextAgreementNumber());

      const insertPayload = {
        ...payload,
        agreement_number: agreementNumber,
        created_at: new Date().toISOString(),
      };

      const { data: inserted, error } = await supabaseAdmin
        .from("association_agreements")
        .insert(insertPayload)
        .select("*")
        .single();

      if (error) {
        console.error("[foreningsavtal/save] insert error:", error);
        return res.status(500).json({
          error: "Kunde inte skapa avtalet.",
          supabaseError: error.message,
        });
      }

      row = inserted;
    }

    const agreement = mapRow(row);

    return res.status(200).json({
      ok: true,
      agreement,
    });
  } catch (e: any) {
    console.error("[foreningsavtal/save] Fatal error:", e?.message || e);
    return res.status(500).json({ error: "Internt fel i API:t." });
  }
}
