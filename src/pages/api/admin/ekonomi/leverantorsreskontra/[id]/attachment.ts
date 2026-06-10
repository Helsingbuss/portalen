import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "12mb",
    },
  },
};

const supabaseUrl =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;

const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY;

const bucketName =
  process.env.SUPPLIER_INVOICE_BUCKET ||
  "supplier-invoices";

function getSupabase() {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase env saknas.");
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function safeFilename(value: any) {
  const filename = String(value || "leverantorsfaktura.pdf")
    .replace(/[^a-zA-Z0-9åäöÅÄÖ._ -]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 120);

  return filename || "leverantorsfaktura.pdf";
}

function extFromFilename(filename: string) {
  const parts = filename.split(".");
  if (parts.length < 2) return "pdf";
  return parts[parts.length - 1].toLowerCase() || "pdf";
}

function base64ToBuffer(dataUrlOrBase64: string) {
  const raw = String(dataUrlOrBase64 || "");
  const base64 = raw.includes(",") ? raw.split(",").pop() || "" : raw;

  return Buffer.from(base64, "base64");
}

async function ensureBucket(supabase: any) {
  const { data: buckets } = await supabase.storage.listBuckets();
  const exists = (buckets || []).some((bucket: any) => bucket.name === bucketName);

  if (!exists) {
    await supabase.storage.createBucket(bucketName, {
      public: false,
      fileSizeLimit: 1024 * 1024 * 10,
      allowedMimeTypes: [
        "application/pdf",
        "image/png",
        "image/jpeg",
        "image/webp",
      ],
    });
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const id = String(req.query.id || "").trim();

  if (!id) {
    return res.status(400).json({
      ok: false,
      error: "Leverantörsfaktura-ID saknas.",
    });
  }

  try {
    const supabase = getSupabase();

    const { data: invoice, error: invoiceError } = await supabase
      .from("supplier_invoices")
      .select("*")
      .eq("id", id)
      .single();

    if (invoiceError) throw invoiceError;

    if (req.method === "GET") {
      if (!invoice.attachment_path) {
        return res.status(404).json({
          ok: false,
          error: "Ingen bilaga finns på leverantörsfakturan.",
        });
      }

      const { data: signed, error: signedError } = await supabase.storage
        .from(bucketName)
        .createSignedUrl(invoice.attachment_path, 60 * 10);

      if (signedError) throw signedError;

      return res.status(200).json({
        ok: true,
        url: signed.signedUrl,
        filename: invoice.attachment_filename,
      });
    }

    if (req.method === "POST") {
      const filename = safeFilename(req.body?.filename);
      const mimeType = String(req.body?.mime_type || req.body?.mimeType || "application/pdf");
      const base64 = String(req.body?.base64 || "");

      if (!base64) {
        return res.status(400).json({
          ok: false,
          error: "Fil saknas.",
        });
      }

      if (!["application/pdf", "image/png", "image/jpeg", "image/webp"].includes(mimeType)) {
        return res.status(400).json({
          ok: false,
          error: "Endast PDF, PNG, JPG och WEBP stöds.",
        });
      }

      await ensureBucket(supabase);

      if (invoice.attachment_path) {
        await supabase.storage
          .from(bucketName)
          .remove([invoice.attachment_path]);
      }

      const buffer = base64ToBuffer(base64);
      const ext = extFromFilename(filename);
      const storagePath =
        "supplier-invoices/" +
        id +
        "/" +
        Date.now() +
        "-" +
        Math.random().toString(16).slice(2) +
        "." +
        ext;

      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(storagePath, buffer, {
          contentType: mimeType,
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: updated, error: updateError } = await supabase
        .from("supplier_invoices")
        .update({
          attachment_path: storagePath,
          attachment_filename: filename,
          attachment_mime_type: mimeType,
          attachment_size_bytes: buffer.length,
          attachment_uploaded_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select("*")
        .single();

      if (updateError) throw updateError;

      return res.status(200).json({
        ok: true,
        invoice: updated,
      });
    }

    if (req.method === "DELETE") {
      if (invoice.attachment_path) {
        await supabase.storage
          .from(bucketName)
          .remove([invoice.attachment_path]);
      }

      const { data: updated, error: updateError } = await supabase
        .from("supplier_invoices")
        .update({
          attachment_path: null,
          attachment_filename: null,
          attachment_mime_type: null,
          attachment_size_bytes: null,
          attachment_uploaded_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select("*")
        .single();

      if (updateError) throw updateError;

      return res.status(200).json({
        ok: true,
        invoice: updated,
      });
    }

    return res.status(405).json({
      ok: false,
      error: "Method not allowed",
    });
  } catch (error: any) {
    console.error("/api/admin/ekonomi/leverantorsreskontra/[id]/attachment error", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte hantera bilagan.",
    });
  }
}
