// src/pages/api/drivers/upload-photo.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import formidable from "formidable";
import fs from "node:fs/promises";
import path from "node:path";

export const config = {
  api: { bodyParser: false },
};

async function ensureBucket(name: string) {
  try {
    // Skapa om saknas (public)
    await supabaseAdmin.storage.createBucket(name, { public: true });
  } catch (e: any) {
    // Ignorera "Bucket already exists"
  }
}

function extFromMime(mime?: string | null) {
  if (!mime) return "bin";
  if (mime.includes("png")) return "png";
  if (mime.includes("jpeg") || mime.includes("jpg")) return "jpg";
  if (mime.includes("webp")) return "webp";
  return "bin";
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    await ensureBucket("drivers");

    const form = formidable({ multiples: false, keepExtensions: true });
    const { fields, files } = await new Promise<{ fields: formidable.Fields; files: formidable.Files }>((resolve, reject) => {
      form.parse(req, (err, flds, fls) => (err ? reject(err) : resolve({ fields: flds, files: fls })));
    });

    const driverId = String(fields.driver_id || "");
    if (!driverId) return res.status(400).json({ error: "Saknar driver_id" });

    const photo: any = (files as any).photo;
    if (!photo) return res.status(400).json({ error: "Saknar photo" });

    const fileBuf = await fs.readFile(photo.filepath);
    const mime = photo.mimetype || "application/octet-stream";
    const ext = extFromMime(mime);
    const filePath = `profiles/${driverId}.${ext}`;

    const up = await supabaseAdmin.storage.from("drivers").upload(filePath, fileBuf, {
      contentType: mime,
      upsert: true,
    });

    if (up.error) throw up.error;

    // (Valfritt) spara absolut URL i drivers.photo_url om du har kolumnen
    try {
      const { data: pub } = supabaseAdmin.storage.from("drivers").getPublicUrl(filePath);
      await supabaseAdmin
        .from("drivers")
        .update({ photo_url: pub?.publicUrl ?? null, updated_at: new Date().toISOString() })
        .eq("id", driverId);
    } catch {
      // tolerera om kolumnen photo_url inte finns
    }

    return res.status(200).json({ ok: true, path: filePath });
  } catch (e: any) {
    console.error("/api/drivers/upload-photo error:", e?.message || e);
    return res.status(500).json({ error: e?.message || "Serverfel" });
  }
}


