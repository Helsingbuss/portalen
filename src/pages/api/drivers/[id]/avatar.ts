// src/pages/api/drivers/[id]/avatar.ts
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
    // ignorera "already exists"
  }
}

function extFromMime(mime?: string | null) {
  if (!mime) return "bin";
  if (mime.includes("png")) return "png";
  if (mime.includes("jpeg") || mime.includes("jpg")) return "jpg";
  if (mime.includes("webp")) return "webp";
  return "bin";
}

// Promisify: parse multipart/form-data (typad så TS inte klagar i strict-läge)
function parseForm(
  req: NextApiRequest
): Promise<{
  fields: Record<string, string | string[]>;
  files: Record<string, File | File[]>;
}> {
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
    const { id } = req.query as { id?: string };
    if (!id) return res.status(400).json({ error: "Saknar driver-id" });

    await ensureBucket("drivers");

    const { files } = await parseForm(req);

    const cand = files.avatar || files.photo || files.file;
    const avatar: File | undefined = Array.isArray(cand) ? cand[0] : cand;
    if (!avatar) return res.status(400).json({ error: "Saknar fil (avatar/photo/file)" });

    const filepath = (avatar as any).filepath ?? (avatar as any).path;
    if (!filepath) return res.status(400).json({ error: "Uppladdad fil saknar filepath" });

    const buf = await fs.readFile(filepath);
    const mime = (avatar as any).mimetype || "application/octet-stream"; // <-- cast för TS
    const ext = extFromMime(mime);
    const storagePath = `avatars/${id}.${ext}`;

    const up = await supabaseAdmin.storage.from("drivers").upload(storagePath, buf, {
      contentType: mime,
      upsert: true,
    });
    if (up.error) throw up.error;

    const { data: pub } = supabaseAdmin.storage.from("drivers").getPublicUrl(storagePath);
    const publicUrl = pub?.publicUrl ?? null;

    try {
      await supabaseAdmin
        .from("drivers")
        .update({ photo_url: publicUrl, updated_at: new Date().toISOString() })
        .eq("id", id);
    } catch {
      /* tolerera om kolumn saknas */
    }

    return res.status(200).json({ ok: true, path: storagePath, url: publicUrl });
  } catch (e: any) {
    console.error("/api/drivers/[id]/avatar error:", e?.message || e);
    return res.status(500).json({ error: e?.message || "Serverfel" });
  }
}
