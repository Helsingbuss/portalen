import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

function getBearerToken(req: NextApiRequest) {
  const header = String(req.headers.authorization || "");
  return header.startsWith("Bearer ") ? header.slice(7) : "";
}

function createAuthedClient(req: NextApiRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Supabase URL eller anon key saknas.");
  }

  const token = getBearerToken(req);

  return createClient(url, anonKey, {
    global: {
      headers: token
        ? {
            Authorization: `Bearer ${token}`,
          }
        : {},
    },
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const { id } = req.body || {};

    if (!id) {
      return res.status(400).json({
        ok: false,
        error: "Notis-id saknas.",
      });
    }

    const supabase = createAuthedClient(req);

    const {
      data: userData,
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !userData?.user?.email) {
      return res.status(401).json({
        ok: false,
        error: "Du är inte inloggad.",
      });
    }

    const { data, error } = await supabase
      .from("driver_notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", id)
      .select("*")
      .single();

    if (error) throw error;

    return res.status(200).json({
      ok: true,
      notification: data,
    });
  } catch (error: any) {
    console.error("/api/driver/notifications/read error:", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte markera notisen som läst.",
    });
  }
}
