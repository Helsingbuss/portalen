// src/pages/api/public/booking/init.ts
import type { NextApiRequest, NextApiResponse } from "next";
import * as admin from "@/lib/supabaseAdmin";

const supabase: any =
  (admin as any).supabaseAdmin ||
  (admin as any).supabase ||
  (admin as any).default;

type BookingTrip = {
  id: string;
  title: string;
  subtitle?: string | null;
  summary?: string | null;
  city?: string | null;
  country?: string | null;
  hero_image?: string | null;
  slug?: string | null;
};

type BookingDeparture = {
  trip_id: string;
  date: string;
  time: string | null;
  line_name: string | null;
  seats_total: number;
  seats_reserved: number;
  seats_left: number;
};

type BookingTicketCampaign = {
  id: string;
  label: string | null;
  type: string; // PERCENT / FIXED / TWO_FOR_ONE / TWO_FOR_FIXED ...
  value: number | null;
  start_date: string;
  end_date: string;
  promo_code?: string | null;
  min_quantity?: number | null;
  max_quantity?: number | null;
};

type BookingTicket = {
  id: number;
  ticket_type_id: number;
  name: string;
  code: string | null;
  price: number;
  currency: string;
  departure_date: string | null;
  campaign?: BookingTicketCampaign | null;
};

type BookingInitResponse = {
  ok: boolean;
  error?: string;
  trip?: BookingTrip;
  departure?: BookingDeparture;
  tickets?: BookingTicket[];
  boarding_stops?: string[];
};

// samma struktur som i widgeten
type RawDeparture = {
  dep_date?: string;
  depart_date?: string;
  date?: string;
  day?: string;
  when?: string;
  dep_time?: string;
  time?: string;
  line_name?: string;
  line?: string;
};

type DiscountCampaign = {
  id: string;
  name: string;
  label: string | null;
  type: string;
  value: number | null;
  start_date: string;
  end_date: string;
  active: boolean;
  trip_id?: string | null;
  ticket_type_id?: string | null;
  min_quantity?: number | null;
  max_quantity?: number | null;
  promo_code?: string | null;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<BookingInitResponse>
) {
  if (req.method !== "GET") {
    return res.status(405).json({
      ok: false,
      error: "Method not allowed (use GET).",
    });
  }

  const { trip_id, date } = req.query;

  if (!trip_id || !date) {
    return res.status(400).json({
      ok: false,
      error: "Saknar trip_id eller date i query.",
    });
  }

  const tripId = String(trip_id);
  const departDate = String(date).slice(0, 10); // YYYY-MM-DD

  try {
    // --- 1) Hämta resa (inkl. departures + lines JSON) ---
    const { data: trip, error: tripErr } = await supabase
      .from("trips")
      .select(
        "id, title, subtitle, summary, city, country, hero_image, slug, departures, lines"
      )
      .eq("id", tripId)
      .single();

    if (tripErr || !trip) {
      console.error("booking/init tripErr", tripErr);
      return res.status(404).json({
        ok: false,
        error: "Resan kunde inte hittas.",
      });
    }

    // --- 2) Hitta avgången i trips.departures (JSON) ---
    let rawDepartures: RawDeparture[] = [];
    if (Array.isArray(trip.departures)) {
      rawDepartures = trip.departures as RawDeparture[];
    } else if (typeof trip.departures === "string") {
      try {
        const parsed = JSON.parse(trip.departures);
        if (Array.isArray(parsed)) rawDepartures = parsed as RawDeparture[];
      } catch {
        // ignorera trasig JSON
      }
    }

    const matching = rawDepartures.find((r) => {
      const rawDate =
        (r.dep_date ||
          r.depart_date ||
          r.date ||
          r.day ||
          r.when ||
          "") as string;
      const d = String(rawDate).slice(0, 10);
      return d === departDate;
    });

    if (!matching) {
      return res.status(404).json({
        ok: false,
        error: "Hittade ingen avgång för det datumet.",
      });
    }

    const rawDate =
      (matching.dep_date ||
        matching.depart_date ||
        matching.date ||
        matching.day ||
        matching.when ||
        departDate) as string;
    const dateOnly = String(rawDate).slice(0, 10);

    const rawTime: string | null =
      (matching.dep_time || matching.time || null) as string | null;

    const lineName: string | null =
      (matching.line_name || matching.line || null) as string | null;

    // --- 2b) Plocka ut hållplatser för dropdown i kassan ---
    let boardingStops: string[] = [];
    try {
      let rawLines: any[] = [];
      if (Array.isArray((trip as any).lines)) {
        rawLines = (trip as any).lines;
      } else if (typeof (trip as any).lines === "string") {
        try {
          const parsed = JSON.parse((trip as any).lines);
          if (Array.isArray(parsed)) rawLines = parsed;
        } catch {
          // ignorera
        }
      }

      if (rawLines.length > 0) {
        let relevantLines = rawLines;

        if (lineName) {
          const found = rawLines.find((l: any) => {
            const title = String(l.title || l.name || "").toLowerCase();
            return title === String(lineName).toLowerCase();
          });
          if (found) {
            relevantLines = [found];
          }
        }

        const seen = new Set<string>();
        for (const ln of relevantLines) {
          const stopsArr = Array.isArray(ln.stops) ? ln.stops : [];
          for (const st of stopsArr) {
            const name =
              typeof st === "string"
                ? st
                : typeof st?.name === "string"
                ? st.name
                : null;
            if (!name) continue;
            const trimmed = name.trim();
            if (trimmed && !seen.has(trimmed)) {
              seen.add(trimmed);
              boardingStops.push(trimmed);
            }
          }
        }
      }
    } catch (e) {
      console.warn("booking/init: kunde inte tolka lines/hållplatser", e);
    }

    // --- 3) Försök läsa kapacitet ur trip_departures (om det finns något) ---
    const { data: depRows, error: depErr } = await supabase
      .from("trip_departures")
      .select("seats_total, seats_reserved")
      .eq("trip_id", tripId)
      .or(
        [
          `depart_date.eq.${dateOnly}`,
          `date.eq.${dateOnly}`,
          `dep_date.eq.${dateOnly}`,
          `departure_date.eq.${dateOnly}`,
        ].join(",")
      );

    if (depErr) {
      console.error("booking/init depErr", depErr);
    }

    const capacityRow = depRows && depRows[0];

    const defaultCapacity = 50;

    const total =
      (capacityRow && (capacityRow as any).seats_total) ?? defaultCapacity;
    const reserved =
      (capacityRow && (capacityRow as any).seats_reserved) ?? 0;
    const left = Math.max(total - reserved, 0);

    // --- 4) Hämta ev. kampanjer för denna resa & datum ---
    const { data: campaignRows, error: campaignErr } = await supabase
      .from("discount_campaigns")
      .select(
        "id, name, label, type, value, start_date, end_date, active, trip_id, ticket_type_id, min_quantity, max_quantity, promo_code"
      )
      .eq("active", true)
      .lte("start_date", dateOnly)
      .gte("end_date", dateOnly)
      .or(`trip_id.is.null,trip_id.eq.${tripId}`);

    if (campaignErr) {
      console.error("booking/init campaignErr", campaignErr);
    }

    const campaigns: DiscountCampaign[] = (campaignRows || []).map(
      (row: any) => ({
        id: row.id,
        name: row.name,
        label: row.label ?? null,
        type: row.type,
        value: row.value != null ? Number(row.value) : null,
        start_date: row.start_date,
        end_date: row.end_date,
        active: !!row.active,
        trip_id: row.trip_id ?? null,
        ticket_type_id: row.ticket_type_id ?? null,
        min_quantity:
          row.min_quantity !== undefined ? row.min_quantity : null,
        max_quantity:
          row.max_quantity !== undefined ? row.max_quantity : null,
        promo_code: row.promo_code ?? null,
      })
    );

    const campaignsByTicket = new Map<string, DiscountCampaign>();

    for (const c of campaigns) {
      if (c.ticket_type_id) {
        const key = String(c.ticket_type_id);
        if (!campaignsByTicket.has(key)) {
          campaignsByTicket.set(key, c);
        }
      } else {
        if (!campaignsByTicket.has("ALL")) {
          campaignsByTicket.set("ALL", c);
        }
      }
    }

    const pickCampaign = (
      ticketTypeId: string | null
    ): DiscountCampaign | null => {
      if (ticketTypeId) {
        const key = String(ticketTypeId);
        if (campaignsByTicket.has(key)) {
          return campaignsByTicket.get(key)!;
        }
      }
      if (campaignsByTicket.has("ALL")) {
        return campaignsByTicket.get("ALL")!;
      }
      return null;
    };

    // --- 5) Hämta priser för datumet (eller standardpris) ---
    const { data: priceRows, error: priceErr } = await supabase
      .from("trip_ticket_pricing")
      .select(
        "id, trip_id, ticket_type_id, departure_date, price, currency, ticket_types(name, code)"
      )
      .eq("trip_id", tripId)
      .or(`departure_date.is.null,departure_date.eq.${dateOnly}`)
      .order("departure_date", { ascending: true });

    if (priceErr) throw priceErr;

    const tickets: BookingTicket[] = (priceRows || []).map((row: any) => {
      const ttypeIdStr = row.ticket_type_id
        ? String(row.ticket_type_id)
        : null;
      const campaign = pickCampaign(ttypeIdStr);

      return {
        id: row.id,
        ticket_type_id: row.ticket_type_id,
        name: row.ticket_types?.name || "Biljett",
        code: row.ticket_types?.code || null,
        price: Number(row.price),
        currency: row.currency || "SEK",
        departure_date: row.departure_date
          ? String(row.departure_date).slice(0, 10)
          : null,
        campaign: campaign
          ? {
              id: campaign.id,
              label: campaign.label ?? campaign.name ?? null,
              type: campaign.type,
              value: campaign.value,
              start_date: campaign.start_date,
              end_date: campaign.end_date,
              promo_code: campaign.promo_code ?? null,
              min_quantity: campaign.min_quantity ?? null,
              max_quantity: campaign.max_quantity ?? null,
            }
          : null,
      };
    });

    // --- 6) Svar tillbaka till kassa-sidan ---
    return res.status(200).json({
      ok: true,
      trip: {
        id: trip.id,
        title: trip.title,
        subtitle: trip.subtitle,
        summary: trip.summary,
        city: trip.city,
        country: trip.country,
        hero_image: trip.hero_image,
        slug: trip.slug,
      },
      departure: {
        trip_id: trip.id,
        date: dateOnly,
        time: rawTime,
        line_name: lineName,
        seats_total: total,
        seats_reserved: reserved,
        seats_left: left,
      },
      tickets,
      boarding_stops: boardingStops,
    });
  } catch (e: any) {
    console.error("booking/init error", e);
    return res.status(500).json({
      ok: false,
      error: e?.message || "Tekniskt fel.",
    });
  }
}
