// src/pages/api/bookings/list.ts
import type { NextApiRequest, NextApiResponse } from "next";
import * as admin from "@/lib/supabaseAdmin";

const supabase =
  (admin as any).supabaseAdmin ||
  (admin as any).supabase ||
  (admin as any).default;

type AnyRow = Record<string, any>;

function normalizeBooking(r: AnyRow) {
  const booking_number =
    r.booking_number ?? r.booking_no ?? r.number ?? r.offer_number ?? null;

  const out = {
    from: r.departure_place ?? r.out_from ?? r.from ?? null,
    to: r.destination ?? r.out_to ?? r.to ?? null,
    date: r.departure_date ?? r.out_date ?? r.date ?? null,
    time: r.departure_time ?? r.out_time ?? r.time ?? null,
  };

  const hasReturn = !!(
    r.return_departure ||
    r.return_destination ||
    r.return_date ||
    r.return_time
  );

  const ret = hasReturn
    ? {
        from: r.return_departure ?? r.return_from ?? null,
        to: r.return_destination ?? r.return_to ?? null,
        date: r.return_date ?? null,
        time: r.return_time ?? null,
      }
    : null;

  // “Kund”-kolumnen i UI: visa beställare/företag om det finns
  const customer_reference =
    r.customer_reference ??
    r.contact_person ??
    r.customer_name ??
    r.foretag_forening ??
    r["Namn_efternamn"] ??
    null;

  const contact_email = r.contact_email ?? r.customer_email ?? null;

  return {
    id: r.id,
    booking_number,
    status: r.status ?? null,
    customer_reference,
    contact_email,
    passengers: r.passengers ?? null,
    total_price: r.total_price ?? 0,
    created_at: r.created_at ?? null,
    out,
    ret,
  };
}

const BOOKED_STATUSES = ["bokad", "planerad", "bekraftad", "confirmed"];
const DONE_STATUSES = ["klar", "genomförd", "genomford"];
const CANCELED_STATUSES = ["inställd", "installt", "avbokad", "makulerad"];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "GET")
      return res.status(405).json({ error: "Method not allowed" });

    const search = (req.query.search as string | undefined)?.trim() || "";
    const statusRaw = (req.query.status as string | undefined)?.trim().toLowerCase() || "";

    const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10) || 1);
    const pageSize = Math.min(
      100,
      Math.max(5, parseInt(String(req.query.pageSize ?? "20"), 10) || 20)
    );

    const rangeFrom = (page - 1) * pageSize;
    const rangeTo = rangeFrom + pageSize - 1;

    // ✅ välj bara kolumner som finns hos dig + total_price/passengers
    const sel = [
      "id",
      "booking_number",
      "status",
      "created_at",
      "contact_person",
      "customer_name",
      "foretag_forening",
      "customer_email",
      "passengers",
      "departure_place",
      "destination",
      "departure_date",
      "departure_time",
      "return_departure",
      "return_destination",
      "return_date",
      "return_time",
      "total_price",
    ].join(",");

    let q = supabase
      .from("bookings")
      .select(sel, { count: "exact" })
      .order("created_at", { ascending: false });

    // ✅ robust statusfilter
    if (statusRaw) {
      if (statusRaw === "bokad") q = q.in("status", BOOKED_STATUSES);
      else if (statusRaw === "klar") q = q.in("status", DONE_STATUSES);
      else if (statusRaw === "inställd") q = q.in("status", CANCELED_STATUSES);
      else q = q.eq("status", statusRaw);
    }

    // ✅ sök på kolumner som finns
    if (search) {
      q = q.or(
        [
          `booking_number.ilike.%${search}%`,
          `contact_person.ilike.%${search}%`,
          `customer_email.ilike.%${search}%`,
          `departure_place.ilike.%${search}%`,
          `destination.ilike.%${search}%`,
        ].join(",")
      );
    }

    const resp = await q.range(rangeFrom, rangeTo);

    if (resp.error) {
      // fallback: hämta * och filtrera i Node (om någon kolumn saknas / RLS / etc)
      const fallback = await supabase
        .from("bookings")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(rangeFrom, rangeTo);

      if (fallback.error) throw fallback.error;

      const rowsAll = (fallback.data as AnyRow[]).map(normalizeBooking);

      const filtered = rowsAll.filter((r) => {
        const okStatus = statusRaw
          ? (() => {
              const s = (r.status || "").toLowerCase();
              if (statusRaw === "bokad") return BOOKED_STATUSES.includes(s);
              if (statusRaw === "klar") return DONE_STATUSES.includes(s);
              if (statusRaw === "inställd") return CANCELED_STATUSES.includes(s);
              return s === statusRaw;
            })()
          : true;

        const s = search.toLowerCase();
        const okSearch = s
          ? [
              r.booking_number,
              r.customer_reference,
              r.contact_email,
              r.out?.from,
              r.out?.to,
            ]
              .filter(Boolean)
              .some((x) => String(x).toLowerCase().includes(s))
          : true;

        return okStatus && okSearch;
      });

      return res.status(200).json({
        page,
        pageSize,
        total: filtered.length, // ✅ korrekt vid filter
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
    return res.status(500).json({ error: "Kunde inte hämta bokningar" });
  }
}
