// src/pages/api/offers/[id].ts
import type { NextApiRequest, NextApiResponse } from "next";
import * as admin from "@/lib/supabaseAdmin";
import { verifyOfferToken } from "@/lib/offerToken";

// funkar oavsett hur supabase exporteras i din lib
const db =
  (admin as any).supabase ??
  (admin as any).supabaseAdmin ??
  (admin as any).default;

/** Enkel UUID-koll */
const isUUID = (s: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s || "");

/** Normalisera DB-rad -> objekt som sidorna förväntar sig */
function normalize(row: any) {
  if (!row) return null;
  return {
    id: row.id ?? null,

    // ID/nummer & status
    offer_number: row.offer_number ?? null,
    status: row.status ?? null,

    // Kontakt
    customer_reference: row.customer_reference ?? row.reference ?? null,
    contact_email: row.contact_email ?? row.customer_email ?? row.email ?? null,
    contact_phone: row.contact_phone ?? row.customer_phone ?? row.phone ?? null,

    // Utresa
    departure_place: row.departure_place ?? row.from ?? row.departure_location ?? null,
    destination: row.destination ?? row.to ?? row.destination_location ?? null,
    departure_date: row.departure_date ?? row.date ?? null,
    departure_time: row.departure_time ?? row.time ?? null,

    // Retur (om din DB har dessa)
    return_departure: row.return_departure ?? null,
    return_destination: row.return_destination ?? null,
    return_date: row.return_date ?? null,
    return_time: row.return_time ?? null,

    // Övrigt
    passengers:
      typeof row.passengers === "number"
        ? row.passengers
        : row.passengers
        ? Number(row.passengers)
        : null,
    notes: row.notes ?? row.message ?? row.other_info ?? null,

    // Ev. totals
    amount_ex_vat: row.amount_ex_vat ?? null,
    vat_amount: row.vat_amount ?? null,
    total_amount: row.total_amount ?? null,
    vat_breakdown: row.vat_breakdown ?? null,
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const raw = (req.query.id as string) || "";
  const id = decodeURIComponent(raw).trim();

  // Bestäm om vi ska kräva JWT (SSR skickar x-offer-link: jwt-ok)
  const wantJwt =
    String(req.headers["x-offer-link"] || "").toLowerCase() === "jwt-ok" ||
    typeof req.query.t === "string";

  let payload: any | null = null;
  if (wantJwt) {
    const token =
      (req.headers["x-offer-token"] as string) ||
      (req.query.t as string) ||
      "";

    if (!token) {
      return res.status(401).json({ ok: false, error: "missing-token" });
    }

    try {
      payload = await verifyOfferToken(token); // <-- VIKTIGT: await
    } catch (e: any) {
      const msg = String(e?.message || "").toLowerCase();
      return res.status(401).json({
        ok: false,
        error: msg.includes("expired") ? "token-expired" : "token-invalid",
      });
    }
  }

  try {
    let row: any = null;

    if (isUUID(id)) {
      // 1) Hämta på UUID
      const { data, error } = await db.from("offers").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      row = data;
    } else {
      // 2) Exakt match på offer_number
      const exact = await db.from("offers").select("*").eq("offer_number", id).maybeSingle();
      if (exact.error) throw exact.error;
      row = exact.data;

      // 3) Fallback: prova utan mellanslag (prefix), senast skapad
      if (!row) {
        const clean = id.replace(/\s+/g, "");
        const ilike = await db
          .from("offers")
          .select("*")
          .ilike("offer_number", `${clean}%`)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (ilike.error && ilike.error.code !== "PGRST116") throw ilike.error;
        row = ilike.data ?? null;
      }
    }

    if (!row) {
      return res.status(404).json({ ok: false, error: "Offer not found" });
    }

    // Om JWT användes: säkerställ att token matchar antingen id eller offer_number
    if (payload) {
      const tokenNo = (payload.no || payload.offer_number) ? String(payload.no || payload.offer_number) : null;
      const tokenId = (payload.sub || payload.offer_id) ? String(payload.sub || payload.offer_id) : null;
      const matchesNo = tokenNo && tokenNo === String(row.offer_number);
      const matchesId = tokenId && tokenId === String(row.id);
      if (!matchesNo && !matchesId) {
        return res.status(401).json({ ok: false, error: "mismatch" });
      }
    }

    const offer = normalize(row);
    return res.status(200).json({ ok: true, offer });
  } catch (e: any) {
    console.error("[api/offers/[id]]", { id, error: e?.message || e });
    return res.status(500).json({ ok: false, error: "Server error" });
  }
}
