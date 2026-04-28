import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import { sendPaymentEmail } from "@/lib/email";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const data = req.body;

    console.log("📥 Incoming:", data);

    // ✅ VALIDATION
    if (!data.customerEmail || !data.customerName) {
      return res.status(400).json({ error: "Missing customer info" });
    }

    if (!data.productName || !data.total) {
      return res.status(400).json({ error: "Missing product info" });
    }

    // 🔥 STANDARD
    let ridesLeft = 1;
    let validUntil: Date | null = null;

    const ticketType = (data.ticketType || "").toLowerCase();

    // 🎟️ KLIPPKORT
    if (ticketType.includes("10")) ridesLeft = 10;
    if (ticketType.includes("20")) ridesLeft = 20;
    if (ticketType.includes("40")) ridesLeft = 40;

    // 📅 PERIODKORT
    if (ticketType.includes("7")) {
      validUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    }

    if (ticketType.includes("30")) {
      validUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    }

    if (ticketType.includes("90")) {
      validUntil = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
    }

    // 📅 DATUM FIX
    const parsedDate = data.date ? new Date(data.date) : null;

    // 🔐 QR
    const qrCode = Math.random().toString(36).substring(2, 12);

    // 🔥 SKAPA TICKET
    const ticket = await prisma.ticket.create({
      data: {
        id: data.id,
        customerName: data.customerName,
        customerEmail: data.customerEmail,
        customerPhone: data.customerPhone || null,

        productName: data.productName,
        type: data.type || "resa",

        // ❌ route BORTTAGEN (fanns inte i DB)

        date: parsedDate,
        stop: data.stop || null,

        price: data.price,
        qty: data.qty,
        total: data.total,

        ticketType: data.ticketType || "enkel",

        status: "PENDING",

        ridesLeft,
        validUntil,

        qrCode,
      },
    });

    console.log("✅ Saved ticket:", ticket.id);

    // 🌍 BASE URL
    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      "http://localhost:3000";

    const paymentLink = `${baseUrl}/pay/${ticket.id}`;

    // 💾 SPARA LÄNK
    await prisma.ticket.update({
      where: { id: ticket.id },
      data: { paymentLink },
    });

    // 📧 MAIL
    try {
      await sendPaymentEmail({
        email: data.customerEmail,
        name: data.customerName,
        link: paymentLink,
        product: data.productName,
        date: data.date,
        type: data.type,
      });

      console.log("📧 Mail skickat");
    } catch (mailError) {
      console.error("⚠ Mail error (skickas ändå vidare):", mailError);
    }

    return res.status(200).json({
      success: true,
      paymentLink,
      id: ticket.id,
    });

  } catch (error) {
    console.error("❌ CREATE PAYMENT ERROR:", error);

    return res.status(500).json({
      error: "Internal server error",
    });
  }
}
