// src/pages/api/bookings/list.ts
import type { NextApiRequest, NextApiResponse } from "next";
import * as admin from "@/lib/supabaseAdmin";



const supabase =
  (admin as any).supabaseAdmin ||
  (admin as any).supabase ||
  (admin as any).default;

type AnyRow = Record<string, any>;

function normalizeBooking(r: AnyRow) {
  // TillÃ¥t olika kolumnnamn
  const booking_number =
    r.booking_number ?? r.booking_no ?? r.number ?? r.offer_number ?? null;

  const out = {
    from: r.departure_place ?? r.from ?? null,
    to: r.destination ?? r.to ?? null,
    date: r.departure_date ?? r.date ?? null,
    time: r.departure_time ?? r.time ?? null,
  };

  const hasReturn = !!(r.return_departure || r.return_destination || r.return_date || r.return_time);
  const ret = hasReturn
    ? {
        from: r.return_departure ?? r.return_from ?? null,
        to: r.return_destination ?? r.return_to ?? null,
        date: r.return_date ?? null,
        time: r.return_time ?? null,
      }
    : null;

  return {
    id: r.id,
    booking_number,
    status: r.status ?? null,
    customer_reference: r.customer_reference ?? r.reference ?? null,
    contact_email: r.contact_email ?? r.customer_email ?? null,
    created_at: r.created_at ?? null,
    out,
    ret,
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

    const search = (req.query.search as string | undefined)?.trim() || "";
    const status = (req.query.status as string | undefined)?.trim().toLowerCase() || "";
    const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10) || 1);
    const pageSize = Math.min(100, Math.max(5, parseInt(String(req.query.pageSize ?? "20"), 10) || 20));
    const rangeFrom = (page - 1) * pageSize;
    const rangeTo = rangeFrom + pageSize - 1;

    // FÃ¶rsÃ¶k selektera nyckelfÃ¤lt â€“ annars fallback till *
    let sel =
      "id, booking_number, status, customer_reference, contact_email, created_at, departure_place, destination, departure_date, departure_time, return_departure, return_destination, return_date, return_time";

    let q = supabase
      .from("bookings")
      .select(sel, { count: "exact" })
      .order("created_at", { ascending: false });

    if (status) q = q.eq("status", status);
    if (search) {
      q = q.or(
        [
          `booking_number.ilike.%${search}%`,
          `customer_reference.ilike.%${search}%`,
          `contact_email.ilike.%${search}%`,
          `departure_place.ilike.%${search}%`,
          `destination.ilike.%${search}%`,
        ].join(",")
      );
    }

    let resp = await q.range(rangeFrom, rangeTo);
    if (resp.error) {
      // Tolerant fallback om kolumnnamn saknas â€“ hÃ¤mta * och filtrera i appen
      const fallback = await supabase
        .from("bookings")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(rangeFrom, rangeTo);

      if (fallback.error) throw fallback.error;
      const rows = (fallback.data as AnyRow[]).map(normalizeBooking);
      // enklare text-sÃ¶k (client-ish) om status/sÃ¶k satt:
      const filtered = rows.filter((r) => {
        const okStatus = status ? (r.status || "").toLowerCase() === status : true;
        const s = search.toLowerCase();
        const okSearch = s
          ? [r.booking_number, r.customer_reference, r.contact_email, r.out?.from, r.out?.to]
              .filter(Boolean)
              .some((x) => String(x).toLowerCase().includes(s))
          : true;
        return okStatus && okSearch;
      });
      return res.status(200).json({
        page,
        pageSize,
        total: fallback.count ?? filtered.length,
        rows: filtered,
      });
    }

    const rows = (resp.data as AnyRow[]).map(normalizeBooking);
    return res.status(200).json({
      page,
      pageSize,
      total: resp.count ?? rows.length,
      rows,
    });
  } catch (e: any) {
    console.error("/api/bookings/list error:", e?.message || e);
    return res.status(500).json({ error: "Kunde inte hÃ¤mta bokningar" });
  }
}

