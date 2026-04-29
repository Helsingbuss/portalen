import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query;

  try {
    const ticket = await prisma.ticket.findUnique({
      where: { id: String(id) },
    });

    if (!ticket) {
      return res.status(404).json({ error: "Not found" });
    }

    res.status(200).json(ticket);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
}
