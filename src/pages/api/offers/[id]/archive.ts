import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).end();
  }

  const { id } = req.query;

  // 🔒 Säkerställ att id är en string
  const offerId = Array.isArray(id) ? id[0] : id;

  if (!offerId) {
    return res.status(400).json({ error: "Saknar id" });
  }

  try {
    await db.offer.update({
      where: { id: offerId },
      data: { status: "arkiverad" },
    });

    res.status(200).json({ success: true });
  } catch (e) {
    res.status(500).json({ error: "Kunde inte arkivera" });
  }
}
