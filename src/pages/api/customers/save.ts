import { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@/lib/supabase";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { email, name, phone, company, discount, notes } = req.body;

  const { error } = await supabase
    .from("customers")
    .upsert({
      email,
      name,
      phone,
      company,
      discount,
      notes,
    });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json({ ok: true });
}
