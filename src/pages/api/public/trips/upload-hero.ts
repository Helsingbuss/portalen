// src/pages/api/public/trips/upload-hero.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";

export const config = { api: { bodyParser: false } };

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_KEY!;
const BUCKET = "trip-media";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!url || !serviceKey) return res.status(500).json({ error: "Saknas Supabase-inställningar." });

  // använd dynamic require för att slippa TS-strul
  const formidable: any = require("formidable");
  const form = formidable({ multiples: false, keepExtensions: true });

  try {
    const { files } = await new Promise<any>((resolve, reject) => {
      form.parse(req, (err: any, _fields: any, fls: any) => (err ? reject(err) : resolve({ files: fls })));
    });

    const file: any = files?.file;
    if (!file) return res.status(400).json({ error: "Ingen fil mottagen." });

    const supabase = createClient(url, serviceKey);

    // säkerställ bucket (ignorera om den redan finns)
    try { await supabase.storage.createBucket(BUCKET, { public: true }); } catch {}

    const buffer = fs.readFileSync(file.filepath ?? file.path);
    const ext = path.extname(file.originalFilename || file.newFilename || "") || ".jpg";
    const key = `hero/${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;

    const { error: upErr } = await supabase.storage.from(BUCKET).upload(key, buffer, {
      contentType: file.mimetype || "image/jpeg",
      upsert: false,
    });
    if (upErr) throw upErr;

    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(key);
    return res.status(200).json({ url: pub?.publicUrl ?? null, path: key });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Uppladdningen misslyckades." });
  }
}
