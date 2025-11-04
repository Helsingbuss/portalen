// src/pages/api/drivers/[id]/avatar.ts
import type { NextApiRequest, NextApiResponse } from "next";
import formidable from "formidable";

// Next ska INTE body-parse multipart/form-data
export const config = { api: { bodyParser: false } };

type Ok = { ok: true; info?: string };
type Fail = { error: string };

// Minimal, robust parser utan externa typer (undviker TS-konflikten)
function parseForm(req: NextApiRequest): Promise<{ fields: any; files: any }> {
  const form = formidable({ multiples: false, keepExtensions: true });
  return new Promise((resolve, reject) => {
    form.parse(req, (err: any, fields: any, files: any) => {
      if (err) return reject(err);
      resolve({ fields, files });
    });
  });
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Ok | Fail>
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { id } = req.query as { id?: string };
    if (!id) return res.status(400).json({ error: "Driver id saknas" });

    const { files, fields } = await parseForm(req);

    // TODO: Lägg in din faktiska uppladdning här (t.ex. Supabase Storage),
    // och spara URL i drivers-tabellen. Filen ligger i `files`.
    // Den här stubben svarar OK så bygget går igenom.
    return res.status(200).json({ ok: true, info: "Avatar mottagen (stub)" });
  } catch (e: any) {
    console.error("avatar upload error:", e?.message || e);
    return res.status(500).json({ error: "Uppladdning misslyckades" });
  }
}
