import type { NextApiRequest, NextApiResponse } from "next";
import supabase from "@/lib/supabaseAdmin";

type OfferRegisterRow = {
  id: string;
  synergy_id: string | null;
  customer_name: string | null;
  departure_at: string | null;
  departure_from: string | null;
  destination: string | null;
  created_at: string | null;
  expires_at: string | null;
  total_price: number | null;
  commission_percent: number | null;
  trip_type: string | null;
};

type ListResponse = {
  items: OfferRegisterRow[];
  totalCount: number;
  totals: {
    totalPrice: number;
    commission: number;
  };
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ListResponse | { error: string }>
) {
  if (req.method === "GET") {
    try {
      const page = parseInt((req.query.page as string) ?? "1", 10) || 1;
      const perPage = parseInt((req.query.perPage as string) ?? "10", 10) || 10;
      const from = (page - 1) * perPage;
      const to = from + perPage - 1;

      const { data, error, count } = await supabase
        .from("offer_register")
        .select("*", { count: "exact" })
        .order("departure_at", { ascending: true })
        .range(from, to);

      if (error) {
        console.error("offer_register GET error", error);
        return res.status(500).json({ error: error.message });
      }

      const rows = (data ?? []) as OfferRegisterRow[];

      // Hämta alla rader för summering (totalpris + provision)
      const { data: allRows, error: allErr } = await supabase
        .from("offer_register")
        .select("total_price, commission_percent");

      if (allErr) {
        console.error("offer_register totals error", allErr);
        return res.status(500).json({ error: allErr.message });
      }

      let totalPrice = 0;
      let commission = 0;

      (allRows ?? []).forEach((r: any) => {
        const price = Number(r.total_price ?? 0);
        const pct = Number(r.commission_percent ?? 0);
        totalPrice += price;
        commission += price * (pct / 100);
      });

      return res.status(200).json({
        items: rows,
        totalCount: count ?? rows.length,
        totals: {
          totalPrice,
          commission,
        },
      });
    } catch (e: any) {
      console.error("offer_register GET exception", e);
      return res.status(500).json({ error: e.message ?? "Unknown error" });
    }
  }

  if (req.method === "POST") {
    // Skapa ny rad
    const body = req.body ?? {};
    try {
      const { data, error } = await supabase
        .from("offer_register")
        .insert({
          synergy_id: body.synergy_id ?? null,
          customer_name: body.customer_name ?? null,
          departure_at: body.departure_at ?? null,
          departure_from: body.departure_from ?? null,
          destination: body.destination ?? null,
          created_at: body.created_at ?? null,
          expires_at: body.expires_at ?? null,
          total_price: body.total_price ?? null,
          commission_percent: body.commission_percent ?? null,
          trip_type: body.trip_type ?? null,
        })
        .select("*")
        .single();

      if (error) {
        console.error("offer_register POST error", error);
        return res.status(500).json({ error: error.message });
      }

      // Efter POST kan klienten bara kalla GET igen, så vi behöver inte returnera allt
      return res.status(200).json({
        items: [data as OfferRegisterRow],
        totalCount: 1,
        totals: { totalPrice: 0, commission: 0 },
      });
    } catch (e: any) {
      console.error("offer_register POST exception", e);
      return res.status(500).json({ error: e.message ?? "Unknown error" });
    }
  }

  if (req.method === "PUT") {
    // Uppdatera rad
    const body = req.body ?? {};
    const id = body.id as string | undefined;
    if (!id) {
      return res.status(400).json({ error: "Missing id" });
    }

    try {
      const { error } = await supabase
        .from("offer_register")
        .update({
          synergy_id: body.synergy_id ?? null,
          customer_name: body.customer_name ?? null,
          departure_at: body.departure_at ?? null,
          departure_from: body.departure_from ?? null,
          destination: body.destination ?? null,
          created_at: body.created_at ?? null,
          expires_at: body.expires_at ?? null,
          total_price: body.total_price ?? null,
          commission_percent: body.commission_percent ?? null,
          trip_type: body.trip_type ?? null,
        })
        .eq("id", id);

      if (error) {
        console.error("offer_register PUT error", error);
        return res.status(500).json({ error: error.message });
      }

      return res.status(200).json({
        items: [],
        totalCount: 0,
        totals: { totalPrice: 0, commission: 0 },
      });
    } catch (e: any) {
      console.error("offer_register PUT exception", e);
      return res.status(500).json({ error: e.message ?? "Unknown error" });
    }
  }

  if (req.method === "DELETE") {
    const body = req.body ?? {};
    const id = body.id as string | undefined;
    if (!id) {
      return res.status(400).json({ error: "Missing id" });
    }

    try {
      const { error } = await supabase
        .from("offer_register")
        .delete()
        .eq("id", id);

      if (error) {
        console.error("offer_register DELETE error", error);
        return res.status(500).json({ error: error.message });
      }

      return res.status(200).json({
        items: [],
        totalCount: 0,
        totals: { totalPrice: 0, commission: 0 },
      });
    } catch (e: any) {
      console.error("offer_register DELETE exception", e);
      return res.status(500).json({ error: e.message ?? "Unknown error" });
    }
  }

  res.setHeader("Allow", "GET, POST, PUT, DELETE");
  return res.status(405).json({ error: "Method not allowed" });
}
