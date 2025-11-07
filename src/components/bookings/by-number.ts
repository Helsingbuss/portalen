// src/pages/api/bookings/by-number.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@/lib/supabaseClient";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const num = String(req.query.num || "").trim();
  if (!num) return res.status(400).json({ error: "Saknar bokningsnummer" });

  const { data, error } = await supabase
    .from("bookings")
    .select(
      [
        "id",
        "booking_number",
        "status",
        "contact_person",
        "customer_email",
        "contact_phone",
        "customer_address",

        "departure_place",
        "destination",
        "departure_date",
        "departure_time",
        "end_time",
        "on_site_minutes",
        "stopover_places",

        "return_departure",
        "return_destination",
        "return_date",
        "return_time",
        "return_end_time",
        "return_on_site_minutes",

        "passengers",
        "notes",

        "amount_ex_vat",
        "vat_amount",
        "total_amount",
      ].join(",")
    )
    .eq("booking_number", num)
    .single();

  if (error) return res.status(404).json({ error: "Bokningen hittades inte" });
  return res.status(200).json({ booking: data });
}

