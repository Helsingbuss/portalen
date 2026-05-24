import type { NextApiRequest, NextApiResponse } from "next";
import { sendDriverNotification } from "@/lib/driverNotifications";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      error: "Method not allowed",
    });
  }

  try {
    const {
      driverUserId,
      driverEmail,
      type = "new_drive_request",
      params = {},
      relatedOrderId = null,
      relatedBookingId = null,
      data = {},
    } = req.body || {};

    const result = await sendDriverNotification({
      driverUserId: driverUserId || null,
      driverEmail: driverEmail || params?.driverEmail || null,
      type,
      params,
      relatedOrderId,
      relatedBookingId,
      data,
    });

    return res.status(200).json(result);
  } catch (error: any) {
    console.error("/api/driver/notifications/test error:", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte skicka förarnotis.",
    });
  }
}
