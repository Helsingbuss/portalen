import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const TABLE = "synergybus_requests";

function emptyToNull(value: unknown) {
  if (value === "" || value === undefined) return null;
  return value;
}

function toNumber(value: unknown) {
  if (value === "" || value === null || value === undefined) return null;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function localSqlTimestamp(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const h = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");

  return `${y}-${m}-${d} ${h}:${min}:00`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === "GET") {
      const { data, error } = await supabaseAdmin
        .from(TABLE)
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      return res.status(200).json({ rows: data ?? [] });
    }

    if (req.method === "POST") {
      const body = req.body ?? {};

      const payload = {
        synergybus_reference: emptyToNull(body.synergybus_reference),
        submitted_at: emptyToNull(body.submitted_at),
        quote_deadline_at: emptyToNull(body.quote_deadline_at),

        customer_name: emptyToNull(body.customer_name),

        pickup_location: emptyToNull(body.pickup_location),
        destination: emptyToNull(body.destination),

        departure_date: emptyToNull(body.departure_date),
        departure_time: emptyToNull(body.departure_time),

        return_date: emptyToNull(body.return_date),
        return_time: emptyToNull(body.return_time),
        return_pickup_location: emptyToNull(body.return_pickup_location),

        passengers: toNumber(body.passengers),

        travel_details: emptyToNull(body.travel_details),
        vehicle_requirements: emptyToNull(body.vehicle_requirements),

        our_price_total: toNumber(body.our_price_total) ?? 0,
        supplier_cost: toNumber(body.supplier_cost) ?? 0,

        status: body.status || "new",
        internal_notes: emptyToNull(body.internal_notes),
        raw_request_text: emptyToNull(body.raw_request_text),
      };

      const { data, error } = await supabaseAdmin
        .from(TABLE)
        .insert(payload)
        .select("*")
        .single();

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      return res.status(201).json({ row: data });
    }

    if (req.method === "DELETE") {
      const now = localSqlTimestamp();

      const { data, error } = await supabaseAdmin
        .from(TABLE)
        .delete()
        .lt("quote_deadline_at", now)
        .in("status", ["new", "calculating"])
        .select("id");

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      return res.status(200).json({
        deleted_count: data?.length ?? 0,
      });
    }

    return res.status(405).json({ error: "Metoden stöds inte." });
  } catch (error: any) {
    return res.status(500).json({
      error: error?.message || "Något gick fel.",
    });
  }
}
