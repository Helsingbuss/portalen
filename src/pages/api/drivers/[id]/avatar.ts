// src/pages/api/drivers/[id]/avatar.ts
import type { NextApiRequest, NextApiResponse } from "next";
import formidable, { Fields, Files } from "formidable";

// Next ska INTE försöka body-parse multipart/form-data
export const config = {
  api: { bodyParser: false },
};

type Ok = { ok: true; info?: string };
type Fail = { error: string };

function parseForm(req: NextApiRequest): Promise<{ fields: Fields; files: Files }> {
  const form = formidable({ multiples: false, keepExtensions: true });
  return new Promise((resolve, reject) => {
    form.parse(req, (err: Error | undefined, fields: Fields, files: Files) => {
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
    const { id } = req.query as { id: string };
    if (!id) return res.status(400).json({ error: "Driver id saknas" });

    const { files, fields } = await parseForm(req);

    // TODO: Lägg tillbaka din faktiska uppladdningslogik här om du har bucket/Supabase etc.
    // Exempel:
    //  - plocka ut den enda filen från `files`
    //  - ladda upp till Storage
    //  - spara URL i drivers-tabellen
    // Den här stubben returnerar bara OK så bygget går igenom.
    return res.status(200).json({ ok: true, info: "Avatar mottagen (stub)." });
  } catch (e: any) {
    console.error("avatar upload error:", e?.message || e);
    return res.status(500).json({ error: "Uppladdning misslyckades" });
  }
}
