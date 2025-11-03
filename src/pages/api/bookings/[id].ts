// src/pages/api/bookings/[id].ts
import type { NextApiRequest, NextApiResponse } from "next";
import * as admin from "@/lib/supabaseAdmin";

const supabase =
  (admin as any).supabaseAdmin ||
  (admin as any).supabase ||
  (admin as any).default;

type ApiOk = {
  ok: true;
  booking: any;
};

type ApiErr = {
  ok: false;
  error: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiOk | ApiErr>
) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const id = (req.query.id as string)?.trim();
  if (!id) {
    return res.status(400).json({ ok: false, error: "Missing booking id" });
  }

  try {
    const { data, error } = await supabase
      .from("bookings")
      .select(
        [
          "id",
          "passengers",
          "departure_place",
          "destination",
          "departure_date",
          "departure_time",
          "end_time",
          "on_site_minutes",
          "return_departure",
          "return_destination",
          "return_date",
          "return_time",
          "return_end_time",
          "notes",
          "created_at",
          "assigned_driver_id",
          "assigned_vehicle_id",
          "contact_person",
          "customer_email",
          "customer_phone",
          "driver_name",
          "driver_phone",
          "vehicle_reg",
          "vehicle_model",
          "booking_number",
        ].join(",")
      )
      .eq("id", id)
      .single();

    if (error) throw error;
    return res.status(200).json({ ok: true, booking: data });
  } catch (e: any) {
    return res
      .status(500)
      .json({ ok: false, error: e?.message || "Server error" });
  }
}
