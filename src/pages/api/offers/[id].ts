// src/pages/api/offers/[id].ts
import type { NextApiRequest, NextApiResponse } from "next";
import * as admin from "@/lib/supabaseAdmin";

const db =
  (admin as any).supabase ??
  (admin as any).supabaseAdmin ??
  (admin as any).default;

const isUUID = (s: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s || "");

function normalize(row: any) {
  if (!row) return null;
  return {
    id: row.id ?? null,

    offer_number: row.offer_number ?? null,
    status: row.status ?? null,

    customer_reference: row.customer_reference ?? row.reference ?? null,
    customer_email: row.customer_email ?? row.contact_email ?? row.email ?? null, // ← snake först
    customer_phone: row.customer_phone ?? row.contact_phone ?? row.phone ?? null,

    departure_place: row.departure_place ?? row.from ?? row.departure_location ?? null,
    destination: row.destination ?? row.to ?? row.destination_location ?? null,
    departure_date: row.departure_date ?? row.date ?? null,
    departure_time: row.departure_time ?? row.time ?? null,

    return_departure: row.return_departure ?? null,
    return_destination: row.return_destination ?? null,
    return_date: row.return_date ?? null,
    return_time: row.return_time ?? null,

    passengers:
      typeof row.passengers === "number"
        ? row.passengers
        : row.passengers
        ? Number(row.passengers)
        : null,
    notes: row.notes ?? row.message ?? row.other_info ?? null,
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const raw = (req.query.id as string) || "";
  const id = decodeURIComponent(raw).trim();

  try {
    let row: any = null;

    if (isUUID(id)) {
      const { data, error } = await db.from("offers").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      row = data;
    } else {
      const exact = await db.from("offers").select("*").eq("offer_number", id).maybeSingle();
      if (exact.error) throw exact.error;
      row = exact.data;

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

    const offer = normalize(row);
    if (!offer) return res.status(404).json({ ok: false, error: "Offer not found" });

    return res.status(200).json({ ok: true, offer });
  } catch (e: any) {
    console.error("[api/offers/[id]]", { id, error: e?.message || e });
    return res.status(500).json({ ok: false, error: "Server error" });
  }
}
