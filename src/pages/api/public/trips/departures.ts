// src/pages/api/public/trips/departures.ts
import type { NextApiRequest, NextApiResponse } from "next";
import * as admin from "@/lib/supabaseAdmin";

const supabase: any =
  (admin as any).supabaseAdmin ||
  (admin as any).supabase ||
  (admin as any).default;

function setCORS(res: NextApiResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=300");
}

type DepartureStatus = "available" | "full" | "waitlist";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  setCORS(res);

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") {
    return res
      .status(405)
      .json({ ok: false, error: "Method not allowed" });
  }

  const { slug, trip_id } = req.query as {
    slug?: string;
    trip_id?: string;
  };

  if (!slug && !trip_id) {
    return res
      .status(400)
      .json({ ok: false, error: "Ange slug eller trip_id." });
  }

  try {
    // 1) Hämta resa (via slug eller id)
    let tripId = trip_id || "";
    let tripTitle = "";
    let defaultPriceFrom: number | null = null;

    if (slug) {
      const { data: trip, error: tripErr } = await supabase
        .from("trips")
        .select("id, title, price_from")
        .eq("slug", slug)
        .eq("published", true)
        .single();

      if (tripErr || !trip) {
        return res
          .status(404)
          .json({ ok: false, error: "Resan hittades inte." });
      }

      tripId = trip.id;
      tripTitle = trip.title || "";
      defaultPriceFrom = trip.price_from ?? null;
    } else {
      const { data: trip, error: tripErr } = await supabase
        .from("trips")
        .select("id, title, price_from")
        .eq("id", tripId)
        .single();

      if (tripErr || !trip) {
        return res
          .status(404)
          .json({ ok: false, error: "Resan hittades inte." });
      }

      tripTitle = trip.title || "";
      defaultPriceFrom = trip.price_from ?? null;
    }

    // 2) Hämta kommande avgångar för resan
    const today = new Date();
    const todayIso = today.toISOString().slice(0, 10); // YYYY-MM-DD

    const { data: deps, error: depsErr } = await supabase
      .from("trip_departures")
      .select(
        [
          "id",
          "date",
          "dep_time",
          "line_name",
          "capacity_total",
          "seats_reserved",
        ].join(",")
      )
      .eq("trip_id", tripId)
      .gte("date", todayIso)
      .order("date", { ascending: true });

    if (depsErr) throw depsErr;

    const out = (deps || []).map((d: any) => {
      const rawDate = d.date as string;
      const dt = rawDate ? new Date(rawDate) : null;

      let dateIso = rawDate || null;
      let weekday = "";
      if (dt && !isNaN(dt.getTime())) {
        dateIso = dt.toISOString().slice(0, 10);
        weekday = dt.toLocaleDateString("sv-SE", {
          weekday: "short",
        });
      }

      const capacityTotal: number | null =
        typeof d.capacity_total === "number" ? d.capacity_total : null;
      const seatsReserved: number =
        typeof d.seats_reserved === "number" ? d.seats_reserved : 0;

      let seatsLeft: number | null = null;
      let status: DepartureStatus = "available";

      if (capacityTotal != null) {
        seatsLeft = Math.max(0, capacityTotal - seatsReserved);
        if (seatsLeft <= 0) {
          status = "full";
        }
      }

      return {
        id: d.id,
        trip_id: tripId,
        trip_title: tripTitle,
        date: dateIso,
        weekday,
        dep_time: d.dep_time || null,
        line_name: d.line_name || null,
        price_from: defaultPriceFrom,
        seats_left: seatsLeft,
        status,
      };
    });

    return res.status(200).json({
      ok: true,
      trip: {
        id: tripId,
        title: tripTitle,
        price_from: defaultPriceFrom,
        slug: slug || null,
      },
      departures: out,
    });
  } catch (e: any) {
    console.error("/api/public/trips/departures error:", e?.message || e);
    return res
      .status(500)
      .json({ ok: false, error: "Server error" });
  }
}
