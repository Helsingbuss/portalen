import { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@/lib/supabase";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { email } = req.query;

  if (!email) {
    return res.status(400).json({ error: "Missing email" });
  }

  const { data, error } = await supabase
    .from("offers")
    .select("*")
    .eq("contact_email", email);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  if (!data || data.length === 0) {
    return res.json({ customer: null });
  }

  const first = data[0];

  const customer = {
    email: first.contact_email,
    name: first.contact_person,
    phone: first.contact_phone,
    bookings: data.length,
    total_spent: data.reduce(
      (sum, o) => sum + Number(o.total_price || 0),
      0
    ),
  };

  return res.json({ customer });
}
