// src/pages/api/trips/upload-media.ts
import type { NextApiRequest, NextApiResponse } from "next";
import formidable, { Files, Fields, File as FormidableFile } from "formidable";
import { createClient } from "@supabase/supabase-js";
import { readFile } from "fs/promises";
import { randomUUID } from "crypto";

// why: multipart kräver avstängd bodyParser i Next.js Pages API
export const config = { api: { bodyParser: false } };

type UploadOk = {
  url: string;
  bucket: string;
  path: string;
  mimetype: string | undefined;
  size: number | undefined;
};
type UploadErr = { error: string };

function getEnvUrl(): string {
  const url =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL || // why: återanvänd redan ifyllda klientvärden
    "";
  if (!url) throw new Error("Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL)");
  return url;
}

function getEnvKey(): { key: string; usingServiceRole: boolean } {
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY; // rekommenderad (server-only)
  if (service) return { key: service, usingServiceRole: true };

  // Fallback om du inte har service key konfigurerad lokalt
  const anon = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  if (!anon)
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY and ANON key. Provide one of them in .env.local"
    );
  return { key: anon, usingServiceRole: false }; // why: funkar om bucket tillåter write för anon/authed
}

function parseForm(req: NextApiRequest): Promise<{ fields: Fields; files: Files }> {
  return new Promise((resolve, reject) => {
    const form = formidable({
      multiples: false,
      maxFileSize: 10 * 1024 * 1024, // 10MB
      keepExtensions: true,
    });
    form.parse(req, (err, fields, files) => (err ? reject(err) : resolve({ fields, files })));
  });
}

function pickFirstFile(files: Files): FormidableFile | null {
  const preferred = ["file", "image", "media", "upload", "hero"];
  for (const key of preferred) {
    const v = files[key];
    if (!v) continue;
    return Array.isArray(v) ? (v[0] as FormidableFile) : (v as FormidableFile);
  }
  for (const k of Object.keys(files)) {
    const v = files[k];
    if (!v) continue;
    return Array.isArray(v) ? (v[0] as FormidableFile) : (v as FormidableFile);
  }
  return null;
}

function sanitizeFilename(name: string | undefined): string {
  const base = (name ?? "upload").toLowerCase();
  return base.replace(/\s+/g, "-").replace(/[^a-z0-9._-]/g, "").replace(/^-+/, "");
}

function slugFromField(fields: Fields): string {
  const raw = Array.isArray(fields.slug) ? fields.slug[0] : (fields.slug as string | undefined);
  const s = (raw ?? randomUUID()).toString().toLowerCase();
  return s
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<UploadOk | UploadErr>
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const SUPABASE_URL = getEnvUrl();
    const { key: SUPABASE_KEY, usingServiceRole } = getEnvKey();
    const BUCKET = process.env.SUPABASE_BUCKET_TRIPS || "trips";

    const { fields, files } = await parseForm(req);
    const file = pickFirstFile(files);
    if (!file) return res.status(400).json({ error: "No file found in form-data" });

    const mimetype = (file.mimetype || "").toLowerCase();
    if (!mimetype.startsWith("image/")) {
      return res.status(415).json({ error: `Unsupported media type: ${mimetype || "unknown"}` });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: false },
    });

    const buf = await readFile(file.filepath);
    const slug = slugFromField(fields);
    const original = sanitizeFilename(file.originalFilename);
    const timestamp = Date.now();
    const objectPath = `${slug}/hero-${timestamp}-${original}`;

    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(objectPath, buf, { contentType: mimetype, upsert: false });
    if (upErr) {
      // why: ofta pga otillräckliga policies när endast ANON används
      const hint = usingServiceRole
        ? ""
        : " (hint: bucket måste tillåta writes för anon/authed eller använd SUPABASE_SERVICE_ROLE_KEY server-side)";
      return res.status(500).json({ error: `Upload failed: ${upErr.message}${hint}` });
    }

    // Public bucket: return public URL; annars byt till signed URL
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(objectPath);
    const url = data?.publicUrl;
    if (!url) return res.status(500).json({ error: "Failed to obtain public URL" });

    return res.status(200).json({
      url,
      bucket: BUCKET,
      path: objectPath,
      mimetype: file.mimetype,
      size: file.size,
    });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Unexpected server error" });
  }
}
