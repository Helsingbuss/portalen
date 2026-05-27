// src/pages/api/offers/[id]/change-request.ts
import type { NextApiRequest, NextApiResponse } from "next";
import * as admin from "@/lib/supabaseAdmin";
import { Resend } from "resend";
import { sendOfferMail } from "@/lib/sendMail";

const supabase =
  (admin as any).supabaseAdmin ||
  (admin as any).supabase ||
  (admin as any).default;

const BASE =
  (process.env.NEXT_PUBLIC_BASE_URL || "").replace(/\/$/, "") ||
  "https://login.helsingbuss.se";

const ADMIN_TO = process.env.MAIL_ADMIN || "offert@helsingbuss.se";
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { id } = req.query as { id: string };
    const { message } = req.body as { message?: string };

    const idOrNumber = String(id);

    // Hämta offert på id ELLER offer_number
    const { data: offer, error } = await supabase
      .from("offers")
      .select("*")
      .or(`id.eq.${idOrNumber},offer_number.eq.${idOrNumber}`)
      .maybeSingle();

    if (error) {
      console.error("/api/offers/[id]/change-request fetch error:", error);
      return res.status(500).json({ error: error.message });
    }
    if (!offer) {
      return res.status(404).json({ error: "Offer not found" });
    }

    // Logga ändringsförfrågan på offerten
    await supabase
      .from("offers")
      .update({
        change_request_at: new Date().toISOString(),
        change_note: message || null,
      })
      .eq("id", offer.id);

    // 1) Mail till admin (Resend)
    if (resend) {
      await resend.emails.send({
        from: process.env.MAIL_FROM || "Helsingbuss <info@helsingbuss.se>",
        to: ADMIN_TO,
        subject: `✏️ Ändringsförfrågan på offert ${
          offer.offer_number || offer.id
        }`,
        html: `
          <p>Kunden har begärt ändringar på en offert.</p>
          <p><strong>Offert:</strong> ${offer.offer_number || offer.id}</p>
          ${
            message
              ? `<p><strong>Meddelande:</strong> ${message}</p>`
              : "<p>(Inget meddelande angivet.)</p>"
          }
          <p><a href="${BASE}/admin/offers/${offer.id}">Öppna i Admin</a></p>
        `,
      });
    }

    // 2) Bekräftelse till kund (om mail finns) – via din vanliga offert-layout
    const customerEmail: string | undefined =
      (offer.contact_email as string | undefined) ||
      (offer.customer_email as string | undefined) ||
      undefined;

    if (customerEmail) {
      await sendOfferMail({
        offerId: String(offer.id),
        offerNumber: offer.offer_number ?? String(offer.id),
        customerEmail,
        customerName:
          (offer.contact_person as string | undefined) ||
          (offer.customer_name as string | undefined) ||
          undefined,
        from: (offer.departure_place as string | undefined) ?? undefined,
        to: (offer.destination as string | undefined) ?? undefined,
        date: (offer.departure_date as string | undefined) ?? undefined,
        time: (offer.departure_time as string | undefined) ?? undefined,
        subject: `Vi har mottagit din ändringsförfrågan för offert ${
          offer.offer_number ?? ""
        }`,
        notes:
          message ??
          "Kunden har skickat en ändringsförfrågan. Vårt team återkommer med en uppdaterad offert.",
      });
    }

    return res.status(200).json({ ok: true });
  } catch (e: any) {
    console.error("/api/offers/[id]/change-request error:", e);
    return res.status(500).json({ error: e?.message || "Server error" });
  }
}
