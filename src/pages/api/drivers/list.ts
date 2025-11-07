// src/pages/api/drivers/list.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin"; // service_role-klienten

type DriverRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  email: string | null;
  private_email: string | null;       // NYTT
  license_classes: string[] | null;
  active: boolean | null;
  updated_at: string | null;
};

type DocRow = { driver_id: string; expires_at: string | null };

function daysUntil(d?: string | null) {
  if (!d) return Infinity;
  const now = new Date();
  const tgt = new Date(d);
  return Math.ceil((tgt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const search = (req.query.search as string | undefined)?.trim() || "";
    const status = (req.query.status as string | undefined)?.toLowerCase() || "";
    const cls = (req.query.cls as string | undefined)?.trim().toUpperCase() || "";
    const expSoon = Number(req.query.expSoon ?? 0);
    const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10) || 1);
    const pageSize = Math.min(50, Math.max(5, parseInt(String(req.query.pageSize ?? "10"), 10) || 10));
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let q = supabaseAdmin
      .from("drivers")
      .select(
        "id, first_name, last_name, phone, email, private_email, license_classes, active, updated_at",
        { count: "exact" }
      )
      .order("updated_at", { ascending: false });

    if (search) {
      q = q.or(
        [
          `first_name.ilike.%${search}%`,
          `last_name.ilike.%${search}%`,
          `email.ilike.%${search}%`,
          `private_email.ilike.%${search}%`, // NYTT
          `phone.ilike.%${search}%`,
        ].join(",")
      );
    }

    if (status === "aktiv") q = q.eq("active", true);
    else if (status === "inaktiv") q = q.eq("active", false);

    if (cls) q = q.contains("license_classes", [cls]);

    const { data: drivers, error, count } = await q.range(from, to);
    if (error) throw error;

    const drv = (drivers || []) as DriverRow[];
    const ids = drv.map((d) => d.id);

    // Dokument (minsta utgångsdatum per driver)
    let minExpByDriver: Record<string, string | null> = {};
    if (ids.length) {
      const { data: docs } = await supabaseAdmin
        .from("driver_documents")
        .select("driver_id, expires_at")
        .in("driver_id", ids);

      const map = new Map<string, string | null>();
      (docs as DocRow[] | null)?.forEach((r) => {
        const cur = map.get(r.driver_id);
        if (!cur) map.set(r.driver_id, r.expires_at);
        else if (r.expires_at && (!cur || r.expires_at < cur)) map.set(r.driver_id, r.expires_at);
      });
      minExpByDriver = Object.fromEntries(map.entries());
    }

    const rows = drv.map((d) => {
      const minExpires = minExpByDriver[d.id] || null;
      const dd = daysUntil(minExpires);
      const docStatus =
        !minExpires
          ? { tag: "saknas", days: Infinity }
          : dd < 0
          ? { tag: "utgånget", days: dd }
          : dd <= 30
          ? { tag: "snart (<=30d)", days: dd }
          : dd <= 60
          ? { tag: "snart (<=60d)", days: dd }
          : dd <= 90
          ? { tag: "snart (<=90d)", days: dd }
          : { tag: "ok", days: dd };

      const first = d.first_name ?? null;
      const last  = d.last_name ?? null;
      const full  = [first, last].filter(Boolean).join(" ");

      return {
        id: d.id,
        first_name: first,
        last_name: last,
        name: full || "—",
        phone: d.phone ?? "—",
        email: d.email ?? "—",
        license_classes: Array.isArray(d.license_classes) ? d.license_classes : [],
        active: Boolean(d.active),
        updated_at: d.updated_at,
        docStatus,
      };
    });

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

