// src/pages/api/trips/upload-media.ts
import type { NextApiRequest, NextApiResponse } from "next";
import formidable, { type Fields, type Files, type File } from "formidable";
import { createReadStream } from "fs";
import path from "path";
import crypto from "crypto";
import supabase from "@/lib/supabaseAdmin"; // din client med service/anon fallback

export const config = {
  api: { bodyParser: false }, // viktigt för formidable
};

type ApiOk = { ok: true; file: { url: string; path: string } };
type ApiErr = { ok: false; error: string };
type ApiResp = ApiOk | ApiErr;

function parseForm(req: NextApiRequest): Promise<{ fields: Fields; files: Files }> {
  const form = formidable({ multiples: false, maxFileSize: 10 * 1024 * 1024, keepExtensions: true });
  return new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => (err ? reject(err) : resolve({ fields, files })));
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

    // Filer kan ligga under olika keys — prova standard "file" först
    const f: File | undefined =
      (files.file as File[] | undefined)?.[0] ||
      (Object.values(files)[0] as File[] | undefined)?.[0];

    if (!f || !f.filepath) {
      return res.status(400).json({ ok: false, error: "Ingen fil mottagen" });
    }

    // Valfri "kind" (cover/gallery) från fields
    const kind = Array.isArray(fields.kind) ? fields.kind[0] : (fields.kind as string | undefined) || "cover";

    // Bestäm mål-sökväg i bucket
    const ext = extFromFilename((f.originalFilename as string) || "");
    const key = `${kind}/${ymd()}/${crypto.randomUUID()}${ext}`;

    // Ladda upp till Supabase Storage
    const bucket = "trip-media"; // ändra om ditt bucket-namn är annorlunda
    const stream = createReadStream(f.filepath);

    const { error: upErr } = await supabase.storage.from(bucket).upload(key, stream, {
      upsert: false,
      contentType: f.mimetype || undefined,
    });
    if (upErr) {
      return res.status(500).json({ ok: false, error: `Upload failed: ${upErr.message}` });
    }

    // Hämta publik URL
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
