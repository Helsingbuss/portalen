// src/pages/api/trips/upload-media.ts
import type { NextApiRequest, NextApiResponse } from "next";
import formidable from "formidable";
import { createReadStream } from "fs";
import path from "path";
import crypto from "crypto";
import supabase from "@/lib/supabaseAdmin";

export const config = {
  api: { bodyParser: false }, // viktigt för formidable
};

type ApiOk = { ok: true; file: { url: string; path: string } };
type ApiErr = { ok: false; error: string };
type ApiResp = ApiOk | ApiErr;

// undvik "Fields"/"Files"-typerna från formidable v2/v3 – använd egna
type FormFields = Record<string, any>;
type FormFiles = Record<string, any>;

function parseForm(req: NextApiRequest): Promise<{ fields: FormFields; files: FormFiles }> {
  const form = formidable({ multiples: false, maxFileSize: 10 * 1024 * 1024, keepExtensions: true });
  return new Promise((resolve, reject) => {
    form.parse(req, (err: any, fields: FormFields, files: FormFiles) =>
      err ? reject(err) : resolve({ fields, files })
    );
  });
}

function extFromFilename(filename?: string) {
  if (!filename) return "";
  const e = path.extname(filename).toLowerCase();
  return e || "";
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

    // plocka ut första filen oavsett key
    let firstFile: any | undefined;
    for (const key of Object.keys(files || {})) {
      const val = (files as any)[key];
      if (Array.isArray(val) && val.length > 0) { firstFile = val[0]; break; }
      if (val && typeof val === "object" && val.filepath) { firstFile = val; break; }
    }

    if (!firstFile || !firstFile.filepath) {
      return res.status(400).json({ ok: false, error: "Ingen fil mottagen" });
    }

    const kindRaw = Array.isArray(fields?.kind) ? fields.kind[0] : fields?.kind;
    const kind = (kindRaw || "cover") as string;

    const ext = extFromFilename(firstFile.originalFilename as string | undefined);
    const key = `${kind}/${ymd()}/${crypto.randomUUID()}${ext}`;

    const bucket = "trip-media"; // justera om ditt bucket-namn skiljer
    const stream = createReadStream(firstFile.filepath);

    const { error: upErr } = await supabase.storage.from(bucket).upload(key, stream, {
      upsert: false,
      contentType: firstFile.mimetype || undefined,
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
