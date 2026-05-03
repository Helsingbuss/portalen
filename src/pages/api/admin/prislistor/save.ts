// src/pages/api/admin/prislistor/save.ts

import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { withCors } from "@/lib/cors";

type PriceCategoryKey = "bestallning" | "brollop" | "forening";
type BusTypeKey =
  | "sprinter"
  | "turistbuss"
  | "helturistbuss"
  | "dubbeldackare";

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

type SaveResponse =
  | {
      ok: true;
      rows: number;
      message?: string;
    }
  | {
      ok?: false;
      error: string;
      supabaseError?: string;
    };

function toNumber(value?: string): number | null {
  if (value === undefined || value === null) return null;

  const cleaned = String(value).replace(",", ".").trim();
  if (!cleaned) return null;

  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function numOrZero(value?: string): number {
  const n = toNumber(value);
  return n ?? 0;
}

async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SaveResponse>
) {
  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      error: "Method not allowed",
    });
  }

  try {
    const rawBody =
      typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};

    const prices = rawBody.prices as
      | {
          bestallning?: Record<BusTypeKey, PriceRowInput>;
          brollop?: Record<BusTypeKey, PriceRowInput>;
          forening?: Record<BusTypeKey, PriceRowInput>;
        }
      | undefined;

    if (!prices || typeof prices !== "object") {
      return res.status(400).json({
        ok: false,
        error: "Ogiltig payload: 'prices' saknas.",
      });
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

    const rows: Array<Record<string, any>> = [];

    for (const category of categoryKeys) {
      const catPrices = prices[category];
      if (!catPrices) continue;

      for (const busType of busTypes) {
        const p = catPrices[busType];
        if (!p) continue;

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

        const baseFee = numOrZero(p.grundavgift);
        const hourDay = numOrZero(p.tim_vardag);
        const hourEvening = numOrZero(p.tim_kvall);
        const hourWeekend = numOrZero(p.tim_helg);
        const km0_25 = numOrZero(p.km_0_25);
        const km26_100 = numOrZero(p.km_26_100);
        const km101_250 = numOrZero(p.km_101_250);
        const km251_plus = numOrZero(p.km_251_plus);

        rows.push({
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
        });
      }
    }

    if (!rows.length) {
      return res.status(200).json({
        ok: true,
        rows: 0,
        message: "Inga rader att spara.",
      });
    }

    const { error } = await supabaseAdmin
      .from("bus_price_profiles")
      .upsert(rows, {
  onConflict: "category,bus_type",
});

    if (error) {
      console.error("[prislistor/save] Supabase error:", error);

      return res.status(500).json({
        ok: false,
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

    return res.status(500).json({
      ok: false,
      error: "Internt fel vid sparande av prislistor.",
      supabaseError: e?.message || String(e),
    });
  }
}

export default withCors(handler);
