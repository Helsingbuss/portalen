import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).end();
  }

  const { id } = req.query;
  const offerId = Array.isArray(id) ? id[0] : id;

  if (!offerId) {
    return res.status(400).json({ error: "Saknar id" });
  }

  try {
    await prisma.offer.update({
      where: { id: offerId },
      data: { status: "arkiverad" },
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("[ARCHIVE_ERROR]", error);
    return res.status(500).json({ error: "Kunde inte arkivera" });
  }
}
