// src/pages/api/admin/prislistor/index.ts

import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { withCors } from "@/lib/cors";

type PriceCategoryKey = "bestallning" | "brollop" | "forening";
type BusTypeKey =
  | "sprinter"
  | "turistbuss"
  | "helturistbuss"
  | "dubbeldackare";

type PriceFields = {
  grundavgift: string;
  tim_vardag: string;
  tim_kvall: string;
  tim_helg: string;
  km_0_25: string;
  km_26_100: string;
  km_101_250: string;
  km_251_plus: string;
};

export type PriceFormValues = Record<
  PriceCategoryKey,
  Record<BusTypeKey, PriceFields>
>;

type DbRow = {
  segment: string | null;
  bus_type: string | null;
  base_fee: number | null;
  hour_weekday_day: number | null;
  hour_weekday_evening: number | null;
  hour_weekend: number | null;
  km_0_25: number | null;
  km_26_100: number | null;
  km_101_250: number | null;
  km_251_plus: number | null;
};

type ApiResponse =
  | {
      ok: true;
      prices: PriceFormValues;
    }
  | {
      ok: false;
      error: string;
      supabaseError?: string;
    };

function emptyPriceFields(): PriceFields {
  return {
    grundavgift: "",
    tim_vardag: "",
    tim_kvall: "",
    tim_helg: "",
    km_0_25: "",
    km_26_100: "",
    km_101_250: "",
    km_251_plus: "",
  };
}

async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from("bus_price_profiles")
      .select(
        [
          "segment",
          "bus_type",
          "base_fee",
          "hour_weekday_day",
          "hour_weekday_evening",
          "hour_weekend",
          "km_0_25",
          "km_26_100",
          "km_101_250",
          "km_251_plus",
        ].join(",")
      );

    if (error) {
      console.error("[prislistor/index] Supabase error:", error);

      return res.status(500).json({
        ok: false,
        error: "Kunde inte läsa prislistorna från databasen.",
        supabaseError: error.message || String(error),
      });
    }

    const prices: PriceFormValues = {
      bestallning: {
        sprinter: emptyPriceFields(),
        turistbuss: emptyPriceFields(),
        helturistbuss: emptyPriceFields(),
        dubbeldackare: emptyPriceFields(),
      },
      brollop: {
        sprinter: emptyPriceFields(),
        turistbuss: emptyPriceFields(),
        helturistbuss: emptyPriceFields(),
        dubbeldackare: emptyPriceFields(),
      },
      forening: {
        sprinter: emptyPriceFields(),
        turistbuss: emptyPriceFields(),
        helturistbuss: emptyPriceFields(),
        dubbeldackare: emptyPriceFields(),
      },
    };

    const validSegments: PriceCategoryKey[] = [
      "bestallning",
      "brollop",
      "forening",
    ];

    const validBusTypes: BusTypeKey[] = [
      "sprinter",
      "turistbuss",
      "helturistbuss",
      "dubbeldackare",
    ];

    const rows = ((data || []) as unknown) as DbRow[];

    rows.forEach((row) => {
      const segment = row.segment as PriceCategoryKey;
      const busType = row.bus_type as BusTypeKey;

      if (!validSegments.includes(segment)) return;
      if (!validBusTypes.includes(busType)) return;

      const target = prices[segment][busType];

      target.grundavgift =
        row.base_fee != null ? String(row.base_fee) : target.grundavgift;

      target.tim_vardag =
        row.hour_weekday_day != null
          ? String(row.hour_weekday_day)
          : target.tim_vardag;

      target.tim_kvall =
        row.hour_weekday_evening != null
          ? String(row.hour_weekday_evening)
          : target.tim_kvall;

      target.tim_helg =
        row.hour_weekend != null ? String(row.hour_weekend) : target.tim_helg;

      target.km_0_25 =
        row.km_0_25 != null ? String(row.km_0_25) : target.km_0_25;

      target.km_26_100 =
        row.km_26_100 != null ? String(row.km_26_100) : target.km_26_100;

      target.km_101_250 =
        row.km_101_250 != null
          ? String(row.km_101_250)
          : target.km_101_250;

      target.km_251_plus =
        row.km_251_plus != null
          ? String(row.km_251_plus)
          : target.km_251_plus;
    });

    return res.status(200).json({ ok: true, prices });
  } catch (e: any) {
    console.error("[prislistor/index] Fatal error:", e?.message || e);

    return res.status(500).json({
      ok: false,
      error: "Internt fel vid hämtning av prislistor.",
      supabaseError: e?.message || String(e),
    });
  }
}

export default withCors(handler);
