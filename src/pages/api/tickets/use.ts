import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } =
    typeof req.body === "string" ? JSON.parse(req.body) : req.body;

  const ticket = await prisma.ticket.findUnique({
    where: { id },
  });

  if (!ticket) return res.status(404).end();

  // enkel biljett
  if (!ticket.ridesLeft && !ticket.validUntil) {
    await prisma.ticket.update({
      where: { id },
      data: { status: "used" },
    });
  }

  // klippkort
  if (ticket.ridesLeft !== null) {
    await prisma.ticket.update({
      where: { id },
      data: {
        ridesLeft: ticket.ridesLeft - 1,
      },
    });
  }

  res.status(200).end();
}
