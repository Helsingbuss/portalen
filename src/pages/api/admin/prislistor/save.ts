// src/pages/api/admin/prislistor/save.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { withCors } from "@/lib/cors";

type PriceCategoryKey = "bestallning" | "brollop" | "forening";
type BusTypeKey = "sprinter" | "turistbuss" | "helturistbuss" | "dubbeldackare";

type PriceRowInput = {
  grundavgift?: string;
  tim_vardag?: string;
  tim_kvall?: string;
  tim_helg?: string;
  km_0_25?: string;
  km_26_100?: string;
  km_101_250?: string;
  km_251_plus?: string;
};

// Läser sträng -> number, annars null
function toNumber(value?: string): number | null {
  if (value === undefined || value === null) return null;
  const cleaned = String(value).replace(",", ".").trim();
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

// Tomma nummer => 0 (för NOT NULL-kolumner)
function numOrZero(value?: string): number {
  const n = toNumber(value);
  return n ?? 0;
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const rawBody =
      typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};

    console.log("[prislistor/save] Raw body:", rawBody);

    const prices = rawBody.prices as
      | {
          bestallning?: Record<BusTypeKey, PriceRowInput>;
          brollop?: Record<BusTypeKey, PriceRowInput>;
          forening?: Record<BusTypeKey, PriceRowInput>;
        }
      | undefined;

    if (!prices || typeof prices !== "object") {
      console.error("[prislistor/save] Ogiltig payload, saknar 'prices'");
      return res
        .status(400)
        .json({ error: "Ogiltig payload: 'prices' saknas." });
    }

    const categoryKeys: PriceCategoryKey[] = [
      "bestallning",
      "brollop",
      "forening",
    ];
    const busTypes: BusTypeKey[] = [
      "sprinter",
      "turistbuss",
      "helturistbuss",
      "dubbeldackare",
    ];

    const rows: any[] = [];

    for (const category of categoryKeys) {
      const catPrices = prices[category];
      if (!catPrices) continue;

      for (const busType of busTypes) {
        const p = catPrices[busType];
        if (!p) continue;

        // Kolla om ALLA fält är helt tomma – isåfall hoppar vi över raden
        const hasAnyValue = [
          p.grundavgift,
          p.tim_vardag,
          p.tim_kvall,
          p.tim_helg,
          p.km_0_25,
          p.km_26_100,
          p.km_101_250,
          p.km_251_plus,
        ].some((v) => v !== undefined && String(v).trim() !== "");

        if (!hasAnyValue) continue;

        // Här sätter vi ALLTID ett nummer (0 om tomt)
        const baseFee = numOrZero(p.grundavgift);
        const hourDay = numOrZero(p.tim_vardag);
        const hourEvening = numOrZero(p.tim_kvall);
        const hourWeekend = numOrZero(p.tim_helg);
        const km0_25 = numOrZero(p.km_0_25);
        const km26_100 = numOrZero(p.km_26_100);
        const km101_250 = numOrZero(p.km_101_250);
        const km251_plus = numOrZero(p.km_251_plus);

        const row = {
          // 🔹 Gamla kolumner (NOT NULL i din tabell)
          segment: category,
          bus_type: busType,
          base_fee: baseFee,
          hour_weekday_day: hourDay,
          hour_weekday_evening: hourEvening,
          hour_weekend: hourWeekend,
          km_0_25: km0_25,
          km_26_100: km26_100,
          km_101_250: km101_250,
          km_251_plus: km251_plus,

          // 🔹 Nya kolumner vi använder i portalen
          category,
          base_price: baseFee,
          hour_price_day: hourDay,
          hour_price_evening: hourEvening,
          hour_price_weekend: hourWeekend,
          km_price_0_25: km0_25,
          km_price_26_100: km26_100,
          km_price_101_250: km101_250,
          km_price_251_plus: km251_plus,

          updated_at: new Date().toISOString(),
        };

        rows.push(row);
      }
    }

    console.log("[prislistor/save] Bygger rader:", rows.length);

    if (!rows.length) {
      return res.status(200).json({
        ok: true,
        rows: 0,
        message: "Inga rader att spara (alla fält tomma).",
      });
    }

    const { error } = await supabaseAdmin
      .from("bus_price_profiles")
      .upsert(rows, {
        onConflict: "segment,bus_type",
      });

    if (error) {
      console.error("[prislistor/save] Supabase-fel:", error);
      return res.status(500).json({
        error: "Kunde inte spara prislistor i databasen.",
        supabaseError: error.message || String(error),
      });
    }

    return res.status(200).json({
      ok: true,
      rows: rows.length,
    });
  } catch (e: any) {
    console.error("[prislistor/save] Fatal error:", e?.message || e);
    return res
      .status(500)
      .json({ error: "Internt fel vid sparande av prislistor." });
  }
}

export default withCors(handler);
