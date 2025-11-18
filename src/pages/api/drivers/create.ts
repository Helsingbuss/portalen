// src/pages/api/drivers/create.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";




function toYmd(s?: string | null) {
  if (!s) return null;
  const m = String(s).match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : null;
}

function parseClasses(v: unknown): string[] {
  if (Array.isArray(v)) return v.filter(Boolean).map(String);
  if (typeof v === "string") {
    return v
      .split(/[,\s]+/)
      .map((x) => x.trim().toUpperCase())
      .filter(Boolean);
  }
  return [];
}

/** FÃ¶rsÃ¶k att inserta, och om PostgREST sÃ¤ger "kolumn X finns inte" tar vi bort den och provar igen. */
async function insertWithFallback(initialRow: Record<string, any>) {
  let row = { ...initialRow };
  for (let attempt = 0; attempt < 6; attempt++) {
    const ins = await supabaseAdmin.from("drivers").insert(row).select("id").single();

    if (!ins.error) return { ok: true, id: ins.data!.id };

    const msg = ins.error.message || "";
    // fÃ¥nga "Could not find the 'notes' column..." eller "column notes does not exist"
    const m1 = msg.match(/Could not find the '([a-z0-9_]+)'\s+column/i);
    const m2 = msg.match(/column\s+"?([a-z0-9_]+)"?\s+does not exist/i);
    const missingCol = (m1?.[1] || m2?.[1]) as string | undefined;

    // special: employment_type kan heta employment_form i vissa scheman
    if (/employment_type/i.test(msg) && row.employment_type !== undefined) {
      row = { ...row };
      row.employment_form = row.employment_type;
      delete row.employment_type;
      continue;
    }

    if (missingCol && row.hasOwnProperty(missingCol)) {
      row = { ...row };
      delete row[missingCol]; // ta bort okÃ¤nd kolumn och prova igen
      continue;
    }

    // inget vi kan autosanera
    return { ok: false, error: msg };
  }
  return { ok: false, error: "Too many attempts when inserting driver." };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const b = req.body ?? {};

    const first_name = (b.first_name ?? b.firstname ?? "").toString().trim();
    const last_name  = (b.last_name  ?? b.lastname  ?? "").toString().trim();
    if (!first_name || !last_name) {
      return res.status(400).json({ error: "Fyll i fÃ¶rnamn och efternamn." });
    }

    const row: Record<string, any> = {
      first_name,
      last_name,
      phone: (b.phone ?? "").toString().trim() || null,
      email: (b.email ?? "").toString().trim() || null,

      // Dessa kan saknas i din databas; fallback-logiken hanterar det
      notes: (b.notes ?? "").toString().trim() || null,
      national_id:
        (b.national_id ?? b.personal_number ?? b.personnummer ?? "").toString().trim() || null,

      active: Boolean(b.active ?? true),
      hired_at: toYmd(b.hired_at),

      // vissa scheman: employment_type, andra: employment_form (fallback i insertWithFallback)
      employment_type: (b.employment_type ?? b.employment_form ?? "").toString().trim() || null,

      license_classes: parseClasses(b.license_classes),
    };

    const result = await insertWithFallback(row);
    if (!result.ok) return res.status(500).json({ error: result.error });

    return res.status(200).json({ ok: true, id: result.id });
  } catch (e: any) {
    console.error("/api/drivers/create error:", e?.message || e);
    return res.status(500).json({ error: e?.message || "Internt fel." });
  }
}

