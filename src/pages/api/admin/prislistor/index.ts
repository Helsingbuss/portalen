// src/pages/api/admin/prislistor/index.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { withCors } from "@/lib/cors";

type PriceCategoryKey = "bestallning" | "brollop" | "forening";
type BusTypeKey = "sprinter" | "turistbuss" | "helturistbuss" | "dubbeldackare";

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

type PriceFormValues = Record<PriceCategoryKey, Record<BusTypeKey, PriceFields>>;

type DbRow = {
  category: string | null;
  segment: string | null;
  bus_type: string | null;

  base_price: number | null;
  hour_price_day: number | null;
  hour_price_evening: number | null;
  hour_price_weekend: number | null;
  km_price_0_25: number | null;
  km_price_26_100: number | null;
  km_price_101_250: number | null;
  km_price_251_plus: number | null;

  base_fee: number | null;
  hour_weekday_day: number | null;
  hour_weekday_evening: number | null;
  hour_weekend: number | null;
  km_0_25: number | null;
  km_26_100: number | null;
  km_101_250: number | null;
  km_251_plus: number | null;
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

function n(v: number | null | undefined) {
  return v == null ? "" : String(v);
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
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

  try {
    const { data, error } = await supabaseAdmin
      .from("bus_price_profiles")
      .select(`
        category,
        segment,
        bus_type,
        base_price,
        hour_price_day,
        hour_price_evening,
        hour_price_weekend,
        km_price_0_25,
        km_price_26_100,
        km_price_101_250,
        km_price_251_plus,
        base_fee,
        hour_weekday_day,
        hour_weekday_evening,
        hour_weekend,
        km_0_25,
        km_26_100,
        km_101_250,
        km_251_plus
      `);

    if (error) {
      return res.status(500).json({
        ok: false,
        error: "Kunde inte läsa prislistorna från databasen.",
        supabaseError: error.message,
      });
    }

    const validCategories: PriceCategoryKey[] = ["bestallning", "brollop", "forening"];
    const validBusTypes: BusTypeKey[] = [
      "sprinter",
      "turistbuss",
      "helturistbuss",
      "dubbeldackare",
    ];

    const rows = (data || []) as DbRow[];

    rows.forEach((row) => {
      const category = (row.category || row.segment) as PriceCategoryKey;
      const busType = row.bus_type as BusTypeKey;

      if (!validCategories.includes(category)) return;
      if (!validBusTypes.includes(busType)) return;

      prices[category][busType] = {
        grundavgift: n(row.base_price ?? row.base_fee),
        tim_vardag: n(row.hour_price_day ?? row.hour_weekday_day),
        tim_kvall: n(row.hour_price_evening ?? row.hour_weekday_evening),
        tim_helg: n(row.hour_price_weekend ?? row.hour_weekend),
        km_0_25: n(row.km_price_0_25 ?? row.km_0_25),
        km_26_100: n(row.km_price_26_100 ?? row.km_26_100),
        km_101_250: n(row.km_price_101_250 ?? row.km_101_250),
        km_251_plus: n(row.km_price_251_plus ?? row.km_251_plus),
      };
    });

    return res.status(200).json({ ok: true, prices });
  } catch (e: any) {
    return res.status(500).json({
      ok: false,
      error: "Internt fel vid hämtning av prislistor.",
      supabaseError: e?.message || String(e),
    });
  }
}

export default withCors(handler);
