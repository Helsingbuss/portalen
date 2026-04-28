import { prisma } from "@/lib/prisma";

export default async function handler(req, res) {
  const { id } = JSON.parse(req.body);

  const ticket = await prisma.ticket.findUnique({
    where: { id },
  });

  if (!ticket) return res.status(404).end();

  // enkel biljett
  if (!ticket.remaining && !ticket.validUntil) {
    await prisma.ticket.update({
      where: { id },
      data: { status: "used" },
    });
  }

  // klippkort
  if (ticket.remaining !== null) {
    await prisma.ticket.update({
      where: { id },
      data: {
        remaining: ticket.remaining - 1,
      },
    });
  }

  res.status(200).end();
}
