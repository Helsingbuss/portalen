// src/pages/api/drivers/upload-doc.ts
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
    await ensureBucket("driver-docs");

    const { fields, files } = await parseForm(req);

    const driverId = String((fields as any).driver_id || "");
    if (!driverId) return res.status(400).json({ error: "Saknar driver_id" });

    const type = String((fields as any).type || "övrigt");
    const expiresAt = (fields as any).expires_at ? String((fields as any).expires_at) : null;

    const cand = files.doc || files.file || files.document;
    const doc: File | undefined = Array.isArray(cand) ? cand[0] : cand;
    if (!doc) return res.status(400).json({ error: "Saknar doc" });

    const filepath = (doc as any).filepath ?? (doc as any).path;
    if (!filepath) return res.status(400).json({ error: "Uppladdad fil saknar filepath" });

    const buf = await fs.readFile(filepath);
    const filename = (doc as any).originalFilename || "dokument";
    const safeName = filename.replace(/[^a-zA-Z0-9._-]+/g, "_");
    const storagePath = `driver_${driverId}/${Date.now()}_${safeName}`;

    const up = await supabaseAdmin.storage.from("driver-docs").upload(storagePath, buf, {
      contentType: (doc as any).mimetype || "application/octet-stream", // <-- cast för TS
      upsert: false,
    });
    if (up.error) throw up.error;

    const { data: pub } = supabaseAdmin.storage.from("driver-docs").getPublicUrl(storagePath);
    const fileUrl = pub?.publicUrl ?? null;

    // Spara rad i driver_documents (tolerant)
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
