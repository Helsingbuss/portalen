import type { NextApiRequest, NextApiResponse } from "next";
import formidable from "formidable";
import fs from "fs/promises";

export const config = {
  api: {
    bodyParser: false,
  },
};

function sanitizeFileName(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9.-]/g, "-")
    .replace(/-+/g, "-");
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({
        error: "Method not allowed",
      });
    }

    const form = formidable({
      multiples: false,
      keepExtensions: true,
      maxFileSize: 15 * 1024 * 1024,
    });

    const [, files] = await form.parse(req);

    const uploaded: any = files.file;

    if (!uploaded) {
      return res.status(400).json({
        error: "Ingen fil vald.",
      });
    }

    const file = Array.isArray(uploaded)
      ? uploaded[0]
      : uploaded;

    const buffer = await fs.readFile(file.filepath);

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
      return res.status(500).json({
        error:
          "Cloudinary saknas i env. Lägg till CLOUDINARY_CLOUD_NAME och CLOUDINARY_UPLOAD_PRESET.",
      });
    }

    const formData = new FormData();

    const blob = new Blob([buffer], {
      type: file.mimetype || "image/jpeg",
    });

    formData.append(
      "file",
      blob,
      sanitizeFileName(file.originalFilename || "image.jpg")
    );

    formData.append("upload_preset", uploadPreset);
    formData.append("folder", "sundra/trips");

    const cloudinaryRes = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      {
        method: "POST",
        body: formData,
      }
    );

    const json = await cloudinaryRes.json();

    if (!cloudinaryRes.ok) {
      console.error("Cloudinary upload error:", json);

      return res.status(500).json({
        error: json?.error?.message || "Cloudinary upload misslyckades.",
      });
    }

    return res.status(200).json({
      ok: true,
      url: json.secure_url,
      public_id: json.public_id,
      width: json.width,
      height: json.height,
    });
  } catch (e: any) {
    console.error("/api/admin/sundra/upload-image error:", e);

    return res.status(500).json({
      error: e?.message || "Kunde inte ladda upp bilden.",
    });
  }
}
