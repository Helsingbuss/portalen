import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { id } = req.body;

const realId = id.split("-").slice(0, 2).join("-");

    if (!id) {
      return res.status(400).json({ error: "Ingen QR data" });
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id },
    });

    if (!ticket) {
      return res.status(404).json({ error: "Ogiltig biljett" });
    }

    // ❌ periodkort utgånget
    if (ticket.validUntil && new Date() > ticket.validUntil) {
      return res.status(400).json({ error: "Biljett har gått ut" });
    }

    // ❌ inga resor kvar
    if (ticket.ridesLeft <= 0) {
      return res.status(400).json({ error: "Inga resor kvar" });
    }

    const updated = await prisma.ticket.update({
      where: { id },
      data: {
        ridesLeft: ticket.ridesLeft - 1,
        isUsed: ticket.ridesLeft - 1 === 0,
        usedAt: new Date(),
      },
    });

    return res.status(200).json({
      success: true,
      ridesLeft: updated.ridesLeft,
    });

  } catch (error) {
    console.error("❌ SCAN ERROR:", error);
    return res.status(500).json({ error: "Serverfel" });
  }
}
