// src/pages/api/drivers/upload-photo.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import formidable, { File } from "formidable";
import fs from "node:fs/promises";

export const config = {
  api: { bodyParser: false },
};

async function ensureBucket(name: string) {
  try {
    await supabaseAdmin.storage.createBucket(name, { public: true });
  } catch {
    // ignore "already exists"
  }
}

function extFromMime(mime?: string | null) {
  if (!mime) return "bin";
  if (mime.includes("png")) return "png";
  if (mime.includes("jpeg") || mime.includes("jpg")) return "jpg";
  if (mime.includes("webp")) return "webp";
  return "bin";
}

function parseForm(
  req: NextApiRequest
): Promise<{ fields: Record<string, string | string[]>; files: Record<string, File | File[]> }> {
  const form = formidable({ multiples: false, keepExtensions: true });
  return new Promise((resolve, reject) => {
    form.parse(
      req,
      (err: any, flds: any, fls: any) => {
        if (err) return reject(err);
        resolve({
          fields: flds as Record<string, string | string[]>,
          files: fls as Record<string, File | File[]>,
        });
      }
    );
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    await ensureBucket("drivers");

    const { fields, files } = await parseForm(req);

    const driverId = String((fields as any).driver_id || "");
    if (!driverId) return res.status(400).json({ error: "Saknar driver_id" });

    const cand = files.photo || files.file || files.avatar;
    const photo: File | undefined = Array.isArray(cand) ? cand[0] : cand;
    if (!photo) return res.status(400).json({ error: "Saknar photo" });

    const filepath = (photo as any).filepath ?? (photo as any).path;
    if (!filepath) return res.status(400).json({ error: "Uppladdad fil saknar filepath" });

    const fileBuf = await fs.readFile(filepath);
    const mime = photo.mimetype || "application/octet-stream";
    const ext = extFromMime(mime);
    const filePath = `profiles/${driverId}.${ext}`;

    const up = await supabaseAdmin.storage.from("drivers").upload(filePath, fileBuf, {
      contentType: mime,
      upsert: true,
    });
    if (up.error) throw up.error;

    try {
      const { data: pub } = supabaseAdmin.storage.from("drivers").getPublicUrl(filePath);
      await supabaseAdmin
        .from("drivers")
        .update({ photo_url: pub?.publicUrl ?? null, updated_at: new Date().toISOString() })
        .eq("id", driverId);
    } catch {
      /* tolerera om kolumn saknas */
    }

    return res.status(200).json({ ok: true, path: filePath });
  } catch (e: any) {
    console.error("/api/drivers/upload-photo error:", e?.message || e);
    return res.status(500).json({ error: e?.message || "Serverfel" });
  }
}
