import { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@/lib/supabase";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { data, error } = await supabase
    .from("offers")
    .select("*");

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  const map = new Map();

  for (const o of data) {
    const key = o.contact_email;

    if (!map.has(key)) {
      map.set(key, {
        email: o.contact_email,
        name: o.contact_person,
        phone: o.contact_phone,
        bookings: 0,
        total_spent: 0,
        last_activity: o.created_at,
      });
    }

    const c = map.get(key);
    c.bookings += 1;
    c.total_spent += Number(o.total_price || 0);
  }

  return res.json({
    rows: Array.from(map.values()),
  });
}
