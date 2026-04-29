import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const data = req.body;

    const ticket = await prisma.ticket.create({
      data: {
        id: data.id,

        customerName: data.customerName,
        customerEmail: data.customerEmail,

        productName: data.productName,
        type: data.type,

        date: data.date,
        stop: data.stop,

        price: data.price,
        qty: data.qty,
        total: data.total,

        ticketType: data.ticketType,

        // 🔁 klippkort (FIXAD)
        ridesLeft:
          data.ticketType?.includes("resor")
            ? parseInt(data.ticketType)
            : 1,

        // ⏱️ period (FIXAD)
        validUntil:
          data.ticketType?.includes("7 dagar")
            ? new Date(Date.now() + 7 * 86400000)
            : data.ticketType?.includes("30 dagar")
            ? new Date(Date.now() + 30 * 86400000)
            : data.ticketType?.includes("90 dagar")
            ? new Date(Date.now() + 90 * 86400000)
            : null,
      },
    });

    res.status(200).json(ticket);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "DB error" });
  }
}
