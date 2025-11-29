// src/pages/api/public/trips/upload-hero.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";

export const config = { api: { bodyParser: false } };

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_KEY;
const BUCKET = "trip-media";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  if (!url || !serviceKey) {
    return res
      .status(500)
      .json({ ok: false, error: "Saknas Supabase-inställningar." });
  }

  try {
    const formidableModule = await import("formidable");
    const formidable: any =
      (formidableModule as any).default || (formidableModule as any);
    const form = formidable({ multiples: false, keepExtensions: true });

    const { files } = await new Promise<any>((resolve, reject) => {
      form.parse(req, (err: any, _fields: any, fls: any) =>
        err ? reject(err) : resolve({ files: fls })
      );
    });

    let file: any = files?.file;
    if (Array.isArray(file)) file = file[0];

    if (!file) {
      return res
        .status(400)
        .json({ ok: false, error: "Ingen fil mottagen." });
    }

    const supabase = createClient(url, serviceKey);

    try {
      await supabase.storage.createBucket(BUCKET, { public: true });
    } catch {
      // ignore om den redan finns
    }

    const filepath = file.filepath || file.path;
    if (!filepath) {
      return res
        .status(500)
        .json({ ok: false, error: "Ingen filväg från uppladdningen." });
    }

    const buffer = fs.readFileSync(filepath);
    const ext =
      path.extname(file.originalFilename || file.newFilename || "") || ".jpg";
    const key = `hero/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}${ext}`;

    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(key, buffer, {
        contentType: file.mimetype || "image/jpeg",
        upsert: false,
      });

    if (upErr) throw upErr;

    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(key);
    return res
      .status(200)
      .json({ ok: true, url: pub?.publicUrl ?? null, path: key });
  } catch (e: any) {
    console.error("/api/public/trips/upload-hero error:", e);
    return res.status(500).json({
      ok: false,
      error: e?.message || "Uppladdningen misslyckades.",
    });
  }
}
