// src/pages/api/dashboard/offers.ts
import type {
  NextApiRequest as NextApiRequestT,
  NextApiResponse as NextApiResponseT,
} from "next";
import { requireAdmin } from "@/lib/supabaseAdmin";

const db = requireAdmin();

type Row = {
  id: string;
  offer_number: string | null;
  departure_date: string | null;
  departure_time: string | null;
  departure_place: string | null;
  destination: string | null;
  passengers: number | null;
  status: string | null;
  offer_date?: string | null;

  // för typbestämning
  return_departure?: string | null;
  return_destination?: string | null;
  return_date?: string | null;
  return_time?: string | null;
  round_trip?: boolean | null;
};

function fmtDate(d?: string | null) {
  if (!d) return null;
  return d; // antar YYYY-MM-DD i DB
}

export default async function handler(
  req: NextApiRequestT,
  res: NextApiResponseT
) {
  try {
    const since = new Date();
    since.setDate(since.getDate() - 30);
    const sinceISO = since.toISOString().slice(0, 10);

    const { data, error } = await db
      .from("offers")
      .select(
        [
          "id",
          "offer_number",
          "departure_date",
          "departure_time",
          "departure_place",
          "destination",
          "passengers",
          "status",
          "offer_date",
          "return_departure",
          "return_destination",
          "return_date",
          "return_time",
          "round_trip",
        ].join(",")
      )
      .gte("offer_date", sinceISO)
      .order("offer_date", { ascending: true });

    if (error) throw error;

    // Casta bort Supabase-unionen (data | PostgrestError)
    const rows = (data ?? []) as unknown as Row[];

    const byDay: Record<string, { inkommen: number; besvarad: number }> = {};
    const unanswered: (Row & { type?: string })[] = [];

    for (const rr of rows) {
      const day = (rr.offer_date ?? "").slice(0, 10) || "okänd";
      if (!byDay[day]) byDay[day] = { inkommen: 0, besvarad: 0 };
      byDay[day].inkommen += 1;
      if (rr.status === "besvarad") byDay[day].besvarad += 1;

      // obesvarade
      if (rr.status !== "besvarad") {
        const hasReturn =
          Boolean(
            rr.return_departure ||
              rr.return_destination ||
              rr.return_date ||
              rr.return_time
          ) || rr.round_trip === true;

        unanswered.push({
          ...rr,
          type: hasReturn ? "Tur & retur" : "Enkelresa",
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
