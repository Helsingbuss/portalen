import type { NextApiRequest, NextApiResponse } from "next";
import * as admin from "@/lib/supabaseAdmin";




const supabase =
  (admin as any).supabaseAdmin ||
  (admin as any).supabase ||
  (admin as any).default;

type Body = {
  title: string;
  subtitle?: string | null;
  trip_kind?: "flerdagar" | "dagsresa" | "shopping" | string | null;
  badge?: string | null;
  ribbon?: string | null;
  city?: string | null;
  country?: string | null;
  price_from?: number | null;
  hero_image: string | null;
  published: boolean;
  external_url?: string | null;
  year?: number | null;
  summary?: string | null;            // â€œKort om resanâ€ (nytt)
  // valfritt stÃ¶d fÃ¶r flera kategorier
  categories?: string[] | null;       // t.ex. ["shopping","flerdagar"]
  tags?: string[] | null;             // alias, om du redan har 'tags' i DB
  departures?: Array<any>;            // kommer frÃ¥n DeparturesEditor
};

function setCORS(res: NextApiResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function parseDepartureDates(rows: any[] | undefined): string[] {
  if (!rows || !Array.isArray(rows)) return [];
  const out: string[] = [];
  for (const r of rows) {
    const raw =
      r?.date || r?.datum || r?.day || r?.when || r?.dep_date || r?.departure_date || null;
    if (!raw) continue;
    // normalisera till YYYY-MM-DD
    const s = String(raw).slice(0, 10);
    // snabb validering
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) out.push(s);
  }
  // unika + sorterade
  return Array.from(new Set(out)).sort((a, b) => (a < b ? -1 : 1));
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  setCORS(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Method not allowed" });

  const b = (req.body || {}) as Body;

  // validering basic
  if (!b?.title || !b?.hero_image) {
    return res.status(400).json({ ok: false, error: "Titel och bild krÃ¤vs." });
  }

  // bygg insert-objekt â€“ endast fÃ¤lt vi med sÃ¤kerhet vill fÃ¶rsÃ¶ka spara
  const baseInsert: Record<string, any> = {
    title: (b.title || "").trim(),
    subtitle: b.subtitle ?? null,
    trip_kind: b.trip_kind ?? null,
    badge: b.badge ?? null,
    ribbon: b.ribbon ?? null,
    city: b.city ?? null,
    country: b.country ?? null,
    price_from: b.price_from ?? null,
    hero_image: b.hero_image ?? null,
    published: !!b.published,
    external_url: b.external_url ?? null,
    year: b.year ?? null,
  };

  // fÃ¶rsÃ¶k spara summary i 'summary' (fallback till 'description' om kolumnen saknas)
  let useSummaryColumn = true;

  // om du vill lagra â€œflera kategorierâ€: mappa till 'tags' om kolumnen finns
  const tagsArray = Array.isArray(b.tags)
    ? b.tags
    : Array.isArray(b.categories)
    ? b.categories
    : null;

  if (tagsArray) {
    baseInsert["tags"] = tagsArray.filter(Boolean);
  }

  // fÃ¶rsta fÃ¶rsÃ¶ket: med 'summary'
  if (typeof b.summary === "string" || b.summary === null) {
    baseInsert["summary"] = b.summary ?? null;
  }

  // 1) Insert trip
  let tripId: string | null = null;
  try {
    const { data, error } = await supabase
      .from("trips")
      .insert(baseInsert)
      .select("id")
      .single();

    if (error) throw error;
    tripId = data?.id || null;
  } catch (e: any) {
    // om fel pga kolumn "summary" inte finns, fÃ¶rsÃ¶k igen med 'description'
    const msg: string = e?.message || "";
    if (/column .*summary.* does not exist/i.test(msg)) {
      useSummaryColumn = false;
      const retryInsert = { ...baseInsert };
      delete retryInsert.summary;
      if (typeof b.summary === "string" || b.summary === null) {
        retryInsert["description"] = b.summary ?? null;
      }
      const { data: d2, error: e2 } = await supabase
        .from("trips")
        .insert(retryInsert)
        .select("id")
        .single();
      if (e2) {
        console.error("create trip failed (retry):", e2);
        return res.status(500).json({ ok: false, error: e2.message || "Kunde inte spara resa." });
      }
      tripId = d2?.id || null;
    } else {
      console.error("create trip failed:", e);
      return res.status(500).json({ ok: false, error: msg || "Kunde inte spara resa." });
    }
  }

  if (!tripId) return res.status(500).json({ ok: false, error: "Kunde inte skapa resa (saknar id)." });

  // 2) Insert avgÃ¥ngar i trip_departures.date
  const dates = parseDepartureDates(b.departures);
  if (dates.length) {
    const rows = dates.map((d) => ({ trip_id: tripId, date: d }));
    const { error: depErr } = await supabase.from("trip_departures").insert(rows);
    if (depErr) {
      // skriv varning men fall tillbaka till ok (kan hÃ¤nda om tabellen saknas)
      console.warn("create: could not insert departures:", depErr.message || depErr);
    }
  }

  return res.status(200).json({
    ok: true,
    id: tripId,
    used_summary_column: useSummaryColumn ? "summary" : "description",
    departures_saved: dates.length,
  });
}

