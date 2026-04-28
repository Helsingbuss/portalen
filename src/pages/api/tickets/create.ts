import { prisma } from "@/lib/prisma";

export default async function handler(req, res) {
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

        // 🔁 klippkort
        remaining:
          data.ticketType?.includes("resor")
            ? parseInt(data.ticketType)
            : null,

        // ⏱️ period
        validFrom:
          data.ticketType?.includes("dagar")
            ? new Date()
            : null,

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
