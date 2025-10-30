// src/pages/api/drivers/upload-doc.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import formidable from "formidable";
import fs from "node:fs/promises";

export const config = {
  api: { bodyParser: false },
};

async function ensureBucket(name: string) {
  try {
    await supabaseAdmin.storage.createBucket(name, { public: true });
  } catch (e: any) {
    // ignore "already exists"
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    await ensureBucket("driver-docs");

    const form = formidable({ multiples: false, keepExtensions: true });
    const { fields, files } = await new Promise<{ fields: formidable.Fields; files: formidable.Files }>((resolve, reject) => {
      form.parse(req, (err, flds, fls) => (err ? reject(err) : resolve({ fields: flds, files: fls })));
    });

    const driverId = String(fields.driver_id || "");
    if (!driverId) return res.status(400).json({ error: "Saknar driver_id" });

    const type = String(fields.type || "Ã¶vrigt");
    const expiresAt = fields.expires_at ? String(fields.expires_at) : null;

    const fileAny: any = (files as any).doc;
    if (!fileAny) return res.status(400).json({ error: "Saknar doc" });

    const buf = await fs.readFile(fileAny.filepath);
    const filename = fileAny.originalFilename || "dokument";
    const safeName = filename.replace(/[^a-zA-Z0-9._-]+/g, "_");
    const storagePath = `driver_${driverId}/${Date.now()}_${safeName}`;

    const up = await supabaseAdmin.storage.from("driver-docs").upload(storagePath, buf, {
      contentType: fileAny.mimetype || "application/octet-stream",
      upsert: false,
    });
    if (up.error) throw up.error;

    const { data: pub } = supabaseAdmin.storage.from("driver-docs").getPublicUrl(storagePath);
    const fileUrl = pub?.publicUrl ?? null;

    // Spara rad i driver_documents (tolerant om tabellen/kolumner saknas)
    try {
      const ins = await supabaseAdmin
        .from("driver_documents")
        .insert({
          driver_id: driverId,
          type,
          file_url: fileUrl,
          expires_at: expiresAt,
        })
        .select("id")
        .single();

      if (ins.error) {
        // Om kolumnnamn avviker â€“ returnera Ã¤ndÃ¥ OK fÃ¶r att inte stoppa flÃ¶det
        console.warn("driver_documents insert warning:", ins.error.message);
      }
    } catch (e: any) {
      console.warn("driver_documents insert skipped:", e?.message || e);
    }

    return res.status(200).json({ ok: true, url: fileUrl, path: storagePath });
  } catch (e: any) {
    console.error("/api/drivers/upload-doc error:", e?.message || e);
    return res.status(500).json({ error: e?.message || "Serverfel" });
  }
}


