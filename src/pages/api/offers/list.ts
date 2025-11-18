// src/pages/api/offers/list.ts
import type { NextApiRequest, NextApiResponse } from "next";
import * as admin from "@/lib/supabaseAdmin";




// TÃ¥lig import â€“ funkar oavsett export-sÃ¤tt i din supabaseAdmin
const supabase =
  (admin as any).supabaseAdmin ||
  (admin as any).supabase ||
  (admin as any).default;

type Row = {
  id: string;
  offer_number?: string | null;
  status?: string | null;
  customer_reference?: string | null;
  contact_email?: string | null;
  created_at?: string | null;
  offer_date?: string | null;
  passengers?: number | null;

  departure_place?: string | null;
  destination?: string | null;
  departure_date?: string | null;
  departure_time?: string | null;

  return_departure?: string | null;
  return_destination?: string | null;
  return_date?: string | null;
  return_time?: string | null;
};

function isYMD(s?: string) {
  return !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const search = (req.query.search as string | undefined)?.trim() || "";
    const status = (req.query.status as string | undefined)?.trim().toLowerCase() || "";
    const from = (req.query.from as string | undefined) || "";
    const to = (req.query.to as string | undefined) || "";

    const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10) || 1);
    const pageSize = Math.min(100, Math.max(5, parseInt(String(req.query.pageSize ?? "20"), 10) || 20));
    const rangeFrom = (page - 1) * pageSize;
    const rangeTo = rangeFrom + pageSize - 1;

    // PrimÃ¤rt: server-side filter (snabbast)
    let q = supabase
      .from("offers")
      .select(
        "id, offer_number, status, customer_reference, contact_email, created_at, offer_date, passengers, departure_place, destination, departure_date, departure_time, return_departure, return_destination, return_date, return_time",
        { count: "exact" }
      )
      .order("created_at", { ascending: false });

    if (status) q = q.eq("status", status);
    if (isYMD(from)) q = q.gte("created_at", `${from}T00:00:00.000Z`);
    if (isYMD(to)) q = q.lte("created_at", `${to}T23:59:59.999Z`);
    if (search) {
      q = q.or(
        [
          `offer_number.ilike.%${search}%`,
          `customer_reference.ilike.%${search}%`,
          `contact_email.ilike.%${search}%`,
          `departure_place.ilike.%${search}%`,
          `destination.ilike.%${search}%`,
        ].join(",")
      );
    }

    const { data, error, count } = await q.range(rangeFrom, rangeTo);
    if (error) throw error;

    const rows = (data as Row[]).map((r) => {
      const hasReturn =
        !!(r.return_departure || r.return_destination || r.return_date || r.return_time);
      return {
        id: r.id,
        offer_number: r.offer_number ?? null,
        status: r.status ?? null,
        customer_reference: r.customer_reference ?? null,
        contact_email: r.contact_email ?? null,
        created_at: r.created_at ?? null,
        offer_date: r.offer_date ?? null,
        passengers: r.passengers ?? null,
        out: {
          from: r.departure_place ?? null,
          to: r.destination ?? null,
          date: r.departure_date ?? null,
          time: r.departure_time ?? null,
        },
        ret: hasReturn
          ? {
              from: r.return_departure ?? null,
              to: r.return_destination ?? null,
              date: r.return_date ?? null,
              time: r.return_time ?? null,
            }
          : null,
      };
    });

    return res.status(200).json({
      page,
      pageSize,
      total: count ?? rows.length,
      rows,
    });
  } catch (e: any) {
    console.error("/api/offers/list error:", e?.message || e);
    return res.status(500).json({ error: "Kunde inte hÃ¤mta offerter" });
  }
}

