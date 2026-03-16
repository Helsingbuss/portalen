// src/pages/api/offers/[id].ts
import type { NextApiRequest, NextApiResponse } from "next";
import * as admin from "@/lib/supabaseAdmin";

type ApiOk = { ok: true; offer: Record<string, any> };
type ApiErr = { ok?: false; error: string };

const supabase =
  (admin as any).supabaseAdmin ||
  (admin as any).supabase ||
  (admin as any).default;

function isUUID(s: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    s || ""
  );
}

function looksLikeOfferNo(s: string) {
  return /^HB\d{3,}$/i.test(s);
}

function looksLikeNumericNo(s: string) {
  return /^\d{3,}$/.test(s);
}

async function getSingle(q: any) {
  if (q?.maybeSingle) {
    const r = await q.maybeSingle();
    return { data: r.data, error: r.error };
  }
  const r = await q.single();
  return { data: r.data, error: r.error };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiOk | ApiErr>
) {
  try {
    if (req.method !== "GET") {
      res.setHeader("Allow", "GET");
      return res.status(405).json({ error: "Method not allowed" });
    }

    if (!supabase) {
      return res.status(500).json({
        error:
          "Supabase-admin är inte korrekt initierad. Kontrollera export i lib/supabaseAdmin och env-nycklar.",
      });
    }

    const raw = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
    const idOrNo = String(raw ?? "").trim();

    if (!idOrNo) {
      return res.status(400).json({ error: "Missing id" });
    }

    const reserved = new Set(["calendar", "calender", "list", "stats", "series"]);
    if (reserved.has(idOrNo.toLowerCase())) {
      return res.status(404).json({ error: "Not found" });
    }

    const byUUID = isUUID(idOrNo);
    const byOfferNo = looksLikeOfferNo(idOrNo) || looksLikeNumericNo(idOrNo);

    if (!byUUID && !byOfferNo) {
      return res.status(404).json({ error: "Not found" });
    }

    let data: any = null;
    let error: any = null;

    if (byUUID) {
      const firstTry = await getSingle(
        supabase.from("offers").select("*").eq("id", idOrNo).limit(1)
      );

      data = firstTry.data;
      error = firstTry.error;

      if (!data && !error) {
        const secondTry = await getSingle(
          supabase.from("offers").select("*").eq("offer_number", idOrNo).limit(1)
        );
        data = secondTry.data;
        error = secondTry.error;
      }
    } else {
      const firstTry = await getSingle(
        supabase.from("offers").select("*").eq("offer_number", idOrNo).limit(1)
      );

      data = firstTry.data;
      error = firstTry.error;
    }

    if (error) {
      const msg = String(error.message || "");
      if (/0 rows|Results contain 0 rows|No rows/i.test(msg)) {
        return res.status(404).json({ error: "Not found" });
      }
      return res.status(500).json({ error: msg || "Serverfel" });
    }

    if (!data) {
      return res.status(404).json({ error: "Not found" });
    }

    return res.status(200).json({ ok: true, offer: data });
  } catch (e: any) {
    console.error("/api/offers/[id] error:", e?.message || e);
    return res.status(500).json({ error: e?.message || "Serverfel" });
  }
}
