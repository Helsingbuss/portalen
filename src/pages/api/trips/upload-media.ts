// src/pages/api/trips/upload-media.ts
import type { NextApiRequest, NextApiResponse } from "next";
import formidable from "formidable";
import path from "path";
import crypto from "crypto";
import { promises as fsp } from "fs";
import supabase from "@/lib/supabaseAdmin";

export const config = {
  api: { bodyParser: false }, // nödvändigt för formidable
};

type ApiOk = { ok: true; file: { url: string; path: string } };
type ApiErr = { ok: false; error: string };
type ApiResp = ApiOk | ApiErr;

type FormFields = Record<string, any>;
type FormFiles = Record<string, any>;

function parseForm(req: NextApiRequest): Promise<{ fields: FormFields; files: FormFiles }> {
  const form = formidable({ multiples: false, maxFileSize: 10 * 1024 * 1024, keepExtensions: true });
  return new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => (err ? reject(err) : resolve({ fields, files })));
  });
}

function extFromFilename(filename?: string) {
  if (!filename) return "";
  return path.extname(filename).toLowerCase() || "";
}

function ymd() {
  const d = new Date();
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const { fields, files } = await parseForm(req);

    // plocka ut första filen (oavsett fältnamn)
    let firstFile: any | undefined;
    for (const key of Object.keys(files || {})) {
      const v: any = (files as any)[key];
      if (Array.isArray(v) && v.length > 0) { firstFile = v[0]; break; }
      if (v && typeof v === "object" && v.filepath) { firstFile = v; break; }
    }
    if (!firstFile?.filepath) {
      return res.status(400).json({ ok: false, error: "Ingen fil mottagen" });
    }

    const kindRaw = Array.isArray(fields?.kind) ? fields.kind[0] : fields?.kind;
    const kind = (kindRaw || "cover") as string;

    const ext = extFromFilename(firstFile.originalFilename);
    const key = `${kind}/${ymd()}/${crypto.randomUUID()}${ext}`;
    const bucket = "trip-media"; // ändra om du använder annat bucket-namn

    // 🔧 Viktigt: läs filen som Buffer (inte stream) → inga duplex-problem i Node 18+
    const fileBuf = await fsp.readFile(firstFile.filepath);
    const contentType = firstFile.mimetype || undefined;

    const { error: upErr } = await supabase.storage.from(bucket).upload(key, fileBuf, {
      upsert: false,
      contentType,
    });
    if (upErr) {
      return res.status(500).json({ ok: false, error: `Upload failed: ${upErr.message}` });
    }

    const { data: pub } = supabase.storage.from(bucket).getPublicUrl(key);
    const publicUrl = pub?.publicUrl;
    if (!publicUrl) {
      return res.status(500).json({ ok: false, error: "Kunde inte generera publik URL" });
    }

    return res.status(200).json({ ok: true, file: { url: publicUrl, path: key } });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message || "Tekniskt fel" });
  }
}
