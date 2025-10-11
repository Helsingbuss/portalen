// src/pages/api/dashboard/offers.ts
import type {
  NextApiRequest as NextApiRequestT,
  NextApiResponse as NextApiResponseT,
} from "next";
import { supabase } from "@/lib/supabaseClient";

type Row = {
  id: string;
  offer_number: string | null;
  departure_date: string | null;
  departure_time: string | null;
  departure_place: string | null;
  destination: string | null;
  passengers: number | null;
  status: string | null;
  type?: string | null;
};

function fmtDate(d?: string | null) {
  if (!d) return null;
  // förutsätter YYYY-MM-DD i DB
  return d;
}

export default async function handler(req: NextApiRequestT, res: NextApiResponseT) {
  try {
    // 1) Hämta 30 senaste dagar och räkna inkomna / besvarade per dag
    const since = new Date();
    since.setDate(since.getDate() - 30);
    const sinceISO = since.toISOString().slice(0, 10);

    const { data: rows, error } = await supabase
      .from("offers")
      .select(
        "id,offer_number,departure_date,departure_time,departure_place,destination,passengers,status"
      )
      .gte("offer_date", sinceISO)
      .order("offer_date", { ascending: true });

    if (error) throw error;

    const byDay: Record<
      string,
      { inkommen: number; besvarad: number }
    > = {};

    const unanswered: Row[] = [];
    for (const r of rows ?? []) {
      const day = (r as any).offer_date?.slice(0, 10) ?? "okänd";
      if (!byDay[day]) byDay[day] = { inkommen: 0, besvarad: 0 };
      byDay[day].inkommen += 1;
      if ((r as any).status === "besvarad") byDay[day].besvarad += 1;

      // obesvarade
      if ((r as any).status !== "besvarad") {
        unanswered.push({
          ...(r as any),
          type: "Enkelresa", // placeholder – byt om du har kolumn
        });
      }
    }

    const dates = Object.keys(byDay).sort();
    const inkommen = dates.map((d) => byDay[d].inkommen);
    const besvarad = dates.map((d) => byDay[d].besvarad);

    const payload = {
      series: { dates, inkommen, besvarad },
      totals: {
        inkommen: inkommen.reduce((a, b) => a + b, 0),
        besvarad: besvarad.reduce((a, b) => a + b, 0),
      },
      unanswered: unanswered.map((r) => ({
        id: r.id,
        offer_number: r.offer_number,
        from: r.departure_place,
        to: r.destination,
        pax: r.passengers,
        type: r.type ?? "—",
        departure_date: fmtDate(r.departure_date),
        departure_time: r.departure_time,
      })),
    };

    return res.status(200).json(payload);
  } catch (e: any) {
    console.error("API /dashboard/offers error:", e);
    return res.status(500).json({ error: e.message ?? "Serverfel" });
  }
}
// src/pages/api/offers/[id].ts
import type { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@/lib/supabaseClient";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query as { id?: string };

  if (!id) {
    return res.status(400).json({ error: "Missing id" });
  }

  try {
    const { data, error } = await supabase
      .from("offers")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }
    return res.status(200).json({ offer: data });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Unknown error" });
  }
}
