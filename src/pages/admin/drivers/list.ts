// src/pages/api/drivers/list.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@/lib/supabaseClient";

type DriverRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  email: string | null;
  license_classes: string[] | null; // text[]
  active: boolean | null;
  updated_at: string | null;
  driver_documents: { expires_at: string | null }[] | null;
};

function daysUntil(d?: string | null) {
  if (!d) return Infinity;
  const now = new Date();
  const tgt = new Date(d);
  const diff = Math.ceil((tgt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Query params
    const search = (req.query.search as string | undefined)?.trim() || "";
    const status = (req.query.status as string | undefined)?.toLowerCase() || ""; // "aktiv" | "inaktiv" | ""
    const cls = (req.query.cls as string | undefined)?.trim().toUpperCase() || ""; // t.ex. "D" eller "DE"
    const expSoon = Number(req.query.expSoon ?? 0); // 0|30|60|90
    const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10) || 1);
    const pageSize = Math.min(50, Math.max(5, parseInt(String(req.query.pageSize ?? "10"), 10) || 10));
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    // Basfråga
    let query = supabase
      .from("drivers")
      .select(
        "id, first_name, last_name, phone, email, license_classes, active, updated_at, driver_documents (expires_at)",
        { count: "exact" }
      )
      .order("updated_at", { ascending: false });

    // Sök (namn/e-post/telefon)
    if (search) {
      // Kör tre ilike-filter genom or()
      query = query.or(
        [
          `first_name.ilike.%${search}%`,
          `last_name.ilike.%${search}%`,
          `email.ilike.%${search}%`,
          `phone.ilike.%${search}%`,
        ].join(",")
      );
    }

    // Statusfilter
    if (status === "aktiv") query = query.eq("active", true);
    if (status === "inaktiv") query = query.eq("active", false);

    // Körkortsklass (license_classes text[] — använd contains)
    if (cls) {
      // Matcha t.ex. {"D"} i text[]
      query = query.contains("license_classes", [cls]);
    }

    // Paginering
    const { data, error, count } = await query.range(from, to);
    if (error) throw error;

    // Dokumentstatus + "går ut inom X dagar"
    const rows = (data as DriverRow[]).map((d) => {
      const minExpires = (d.driver_documents ?? [])
        .map((x) => x?.expires_at)
        .filter(Boolean)
        .sort()[0] || null;

      const days = daysUntil(minExpires);
      const docStatus =
        !minExpires
          ? { tag: "saknas", days: Infinity }
          : days < 0
          ? { tag: "utgånget", days }
          : days <= 30
          ? { tag: "snart (≤30d)", days }
          : days <= 60
          ? { tag: "snart (≤60d)", days }
          : days <= 90
          ? { tag: "snart (≤90d)", days }
          : { tag: "ok", days };

      return {
        id: d.id,
        name: [d.first_name, d.last_name].filter(Boolean).join(" ") || "—",
        phone: d.phone ?? "—",
        email: d.email ?? "—",
        license_classes: d.license_classes ?? [],
        active: Boolean(d.active),
        updated_at: d.updated_at,
        docStatus,
      };
    });

    // expSoon-filter i API (om valt)
    const filtered = expSoon
      ? rows.filter((r) => r.docStatus.days <= expSoon && r.docStatus.days !== Infinity)
      : rows;

    return res.status(200).json({
      rows: filtered,
      page,
      pageSize,
      total: count ?? filtered.length,
    });
  } catch (e: any) {
    console.error("/api/drivers/list error:", e?.message || e);
    return res.status(500).json({ error: "Kunde inte hämta chaufförer" });
  }
}
