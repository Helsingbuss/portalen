import type { NextApiRequest, NextApiResponse } from "next";
import formidable from "formidable";
import fs from "fs";

export const config = {
  api: {
    bodyParser: false,
  },
};

async function uploadToCloudinary(filePath: string) {
  const cloudName =
    process.env.CLOUDINARY_CLOUD_NAME;

  const uploadPreset =
    process.env.CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !uploadPreset) {
    throw new Error(
      "Cloudinary saknas i env. Lägg till CLOUDINARY_CLOUD_NAME och CLOUDINARY_UPLOAD_PRESET."
    );
  }

  const formData = new FormData();

  formData.append(
    "file",
    new Blob([fs.readFileSync(filePath)])
  );

  formData.append(
    "upload_preset",
    uploadPreset
  );

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    {
      method: "POST",
      body: formData,
    }
  );

  const json = await response.json();

  if (!response.ok) {
    throw new Error(
      json?.error?.message ||
        "Cloudinary upload misslyckades."
    );
  }

  return json;
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
    });

    const [fields, files] =
      await form.parse(req);

    const file =
      (files.file as any)?.[0] ||
      files.file;

    if (!file?.filepath) {
      return res.status(400).json({
        error: "Ingen fil skickades.",
      });
    }

    const uploaded =
      await uploadToCloudinary(
        file.filepath
      );

    return res.status(200).json({
      ok: true,
      url: uploaded.secure_url,
      public_id: uploaded.public_id,
    });
  } catch (e: any) {
    console.error(
      "/api/admin/sundra/upload-image error:",
      e
    );

    return res.status(500).json({
      error:
        e?.message ||
        "Kunde inte ladda upp bild.",
    });
  }
}
