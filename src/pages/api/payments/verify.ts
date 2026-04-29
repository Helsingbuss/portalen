import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { bookingId } = req.body;

  try {
    await prisma.ticket.update({
      where: { id: bookingId },
      data: {
        status: "paid",
      },
    });

    res.status(200).json({ success: true });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Update failed" });
  }
}
