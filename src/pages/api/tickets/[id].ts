import { prisma } from "@/lib/prisma";

export default async function handler(req, res) {
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
    res.status(500).json({ error: "Server error" });
  }
}
