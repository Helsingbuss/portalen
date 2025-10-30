// src/pages/api/drivers/[id]/avatar.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import formidable from "formidable";
import fs from "fs";

// ⬇️ Next.js ska inte försöka parsa multipart
export const config = { api: { bodyParser: false } };


const BUCKET = "driver-avatars";

// Hjälp: promisify formidable
function parseForm(req: NextApiRequest): Promise<{ fields: formidable.Fields; files: formidable.Files }> {
  const form = formidable({ multiples: false });
  return new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => (err ? reject(err) : resolve({ fields, files })));
  });
}

// Om bucketen saknas i projektet: skapa den (idempotent)
async function ensureBucket() {
  try {
    // Försök hämta en lista för att trigga 404 om den inte finns
    await supabaseAdmin.storage.from(BUCKET).list("", { limit: 1 });
  } catch {
    // @ts-ignore: createBucket finns i admin SDK
    // (service role krävs – du har den i supabaseAdmin)
    // Public=true så publik URL fungerar
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    await supabaseAdmin.storage.createBucket(BUCKET, { public: true });
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query as { id?: string };
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!id) return res.status(400).json({ error: "Missing driver id" });

  try {
    await ensureBucket();

    const { files } = await parseForm(req);
    const file = files?.file as formidable.File | undefined;
    if (!file) return res.status(400).json({ error: "No file" });

    const buf = await fs.promises.readFile(file.filepath);
    const ext = (file.originalFilename || "image").split(".").pop() || "jpg";
    const path = `${id}/${Date.now()}.${ext}`;

    const { error: upErr } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(path, buf, {
        upsert: true,
        contentType: file.mimetype || "image/jpeg",
        cacheControl: "3600",
      });

    if (upErr) {
      // Ge ett tydligt fel om bucketen verkligen saknas
      const msg = String(upErr.message || "");
      if (msg.toLowerCase().includes("bucket") && msg.toLowerCase().includes("not found")) {
        return res.status(500).json({ error: "Bucket not found (skapa 'driver-avatars' som Public i Storage)" });
      }
      throw upErr;
    }

    const { data: urlData } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path);
    const publicUrl = urlData.publicUrl;

    // Spara URL på föraren
    await supabaseAdmin.from("drivers").update({ avatar_url: publicUrl }).eq("id", id);

    return res.status(200).json({ ok: true, url: publicUrl });
  } catch (e: any) {
    console.error("/api/drivers/[id]/avatar error:", e?.message || e);
    return res.status(500).json({ error: e?.message || "Upload failed" });
  }
}
