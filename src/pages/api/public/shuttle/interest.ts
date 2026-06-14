import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdmin } from "@/lib/supabaseAdmin";

const db = requireAdmin();

function setCors(res: NextApiResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  setCors(res);

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const email = String(req.body?.email || "").trim().toLowerCase();

    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ error: "Ogiltig e-postadress" });
    }

    const { error } = await db
      .from("shuttle_interest_signups")
      .upsert(
        {
          email,
          source: "hbshuttle.se",
          consent: true,
          status: "new",
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "email",
        }
      );

    if (error) {
      console.error("Interest signup error:", error);
      return res.status(500).json({ error: "Kunde inte spara anmälan" });
    }

    return res.status(200).json({
      ok: true,
      message: "Tack! Vi meddelar dig när biljetterna släpps.",
    });
  } catch (error) {
    console.error("Interest signup failed:", error);
    return res.status(500).json({ error: "Något gick fel" });
  }
}
