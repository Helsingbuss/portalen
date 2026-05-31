import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "25mb",
    },
  },
};

const supabaseUrl =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;

const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY;

const bucketName = "vehicle-documents";

function getSupabase() {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "Supabase env saknas. Admin kräver SUPABASE_SERVICE_ROLE_KEY eller SUPABASE_SERVICE_KEY i .env.local."
    );
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function safeFileName(name: string) {
  const cleaned = String(name || "fil")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return cleaned || "fil";
}

async function ensureBucket(supabase: any) {
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();

  if (listError) throw listError;

  const exists = (buckets || []).some((bucket: any) => bucket.name === bucketName);

  if (!exists) {
    const { error: createError } = await supabase.storage.createBucket(bucketName, {
      public: true,
      fileSizeLimit: 52428800,
    });

    if (createError && !String(createError.message || "").toLowerCase().includes("already exists")) {
      throw createError;
    }
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ ok: false, error: "Method not allowed" });
    }

    const supabase = getSupabase();

    const fileName = safeFileName(req.body?.file_name || "dokument.pdf");
    const contentType = String(req.body?.content_type || "application/octet-stream");
    const vehicleId = safeFileName(req.body?.vehicle_id || "utan-fordon");
    const base64Raw = String(req.body?.base64 || "");

    if (!base64Raw) {
      return res.status(400).json({
        ok: false,
        error: "Ingen fil skickades.",
      });
    }

    const base64 = base64Raw.includes(",") ? base64Raw.split(",").pop() || "" : base64Raw;

    const buffer = Buffer.from(base64, "base64");

    if (!buffer.length) {
      return res.status(400).json({
        ok: false,
        error: "Filen var tom eller kunde inte läsas.",
      });
    }

    await ensureBucket(supabase);

    const filePath =
      vehicleId + "/" + Date.now() + "-" + fileName;

    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(filePath, buffer, {
        contentType,
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const { data: publicData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    return res.status(200).json({
      ok: true,
      file_url: publicData.publicUrl,
      file_path: filePath,
    });
  } catch (error: any) {
    console.error("/api/admin/fordon/dokument/upload error", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte ladda upp filen.",
    });
  }
}
