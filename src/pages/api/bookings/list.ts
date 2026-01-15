import type { NextApiRequest, NextApiResponse } from "next";
import * as admin from "@/lib/supabaseAdmin";

const supabase =
  (admin as any).supabaseAdmin ||
  (admin as any).supabase ||
  (admin as any).default;

type AnyRow = Record<string, any>;

function tidyTime(t?: string | null) {
  if (!t) return null;
  const s = String(t);
  if (s.includes(":")) return s.slice(0, 5);
  if (s.length >= 4) return `${s.slice(0, 2)}:${s.slice(2, 4)}`;
  return s;
}

function normalizeBooking(r: AnyRow) {
  const out = {
    from: r.departure_place ?? r.out_from ?? null,
    to: r.destination ?? r.out_to ?? null,
    date: r.departure_date ?? r.out_date ?? null,
    time: tidyTime(r.departure_time ?? r.out_time ?? null),
  };

  const hasReturn = !!(r.return_departure || r.return_destination || r.return_date || r.return_time);
  const ret = hasReturn
    ? {
        from: r.return_departure ?? null,
        to: r.return_destination ?? null,
        date: r.return_date ?? null,
        time: tidyTime(r.return_time ?? null),
      }
    : null;

  return {
    id: r.id,
    booking_number: r.booking_number ?? null,
    status: r.status ?? null,
    // visa något vettigt i listan
    customer_reference: r.contact_person ?? r.customer_name ?? r.foretag_forening ?? null,
    contact_email: r.customer_email ?? null,
    passengers: r.passengers ?? null,
    total_price: r.total_price ?? 0,
    created_at: r.created_at ?? null,
    out,
    ret,
  };
}

function parsePage(v: any) {
  const n = Number(v);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
}

function parsePageSize(v: any) {
  const raw = String(v ?? "").trim().toLowerCase();
  if (!raw) return 20;
  if (raw === "all") return 9999;
  const n = Number(raw);
  if (!Number.isFinite(n)) return 20;
  return Math.min(9999, Math.max(5, Math.floor(n)));
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
    if (!supabase) return res.status(500).json({ error: "Supabase-admin saknas" });

    const search = (req.query.search as string | undefined)?.trim() || "";
    const status = (req.query.status as string | undefined)?.trim().toLowerCase() || "";

    const page = parsePage(req.query.page);
    const pageSize = parsePageSize(req.query.pageSize);

    const rangeFrom = (page - 1) * pageSize;
    const rangeTo = rangeFrom + pageSize - 1;

    // ✅ ENBART kolumner som finns i din bookings-tabell (från din SQL)
    const sel = [
      "id",
      "booking_number",
      "status",
      "contact_person",
      "customer_name",
      "customer_email",
      "passengers",
      "total_price",
      "created_at",
      "departure_place",
      "destination",
      "departure_date",
      "departure_time",
      "return_departure",
      "return_destination",
      "return_date",
      "return_time",
    ].join(",");

    let q = supabase
      .from("bookings")
      .select(sel, { count: "exact" })
      .order("created_at", { ascending: false });

    if (status) q = q.eq("status", status);

    // ✅ endast sök mot kolumner som finns
    if (search) {
      q = q.or(
        [
          `booking_number.ilike.%${search}%`,
          `contact_person.ilike.%${search}%`,
          `customer_name.ilike.%${search}%`,
          `customer_email.ilike.%${search}%`,
          `departure_place.ilike.%${search}%`,
          `destination.ilike.%${search}%`,
        ].join(",")
      );
    }

    const resp = await q.range(rangeFrom, rangeTo);
    if (resp.error) throw resp.error;

    const rows = (resp.data as AnyRow[]).map(normalizeBooking);

    return res.status(200).json({
      page,
      pageSize,
      total: resp.count ?? rows.length,
      rows,
    });
  } catch (e: any) {
    console.error("/api/bookings/list error:", e?.message || e);
    return res.status(500).json({ error: e?.message || "Kunde inte hämta bokningar" });
  }
}
