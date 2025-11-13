import type { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@/lib/supabaseAdmin";
import { sendOfferMail } from "@/lib/sendOfferMail";
import { Resend } from "resend";

const env = (v?: string | null) => (v ?? "").toString().trim();

const RESEND_KEY   = env(process.env.RESEND_API_KEY);
const FROM_PRIMARY = env(process.env.MAIL_FROM) || env(process.env.EMAIL_FROM) || "Helsingbuss <onboarding@resend.dev>";
const ADMIN_TO     = env(process.env.OFFERS_INBOX) || env(process.env.ADMIN_ALERT_EMAIL) || "offert@helsingbuss.se";

function adminStartUrl() {
  const base =
    env(process.env.NEXT_PUBLIC_LOGIN_BASE_URL) ||
    env(process.env.NEXT_PUBLIC_BASE_URL) ||
    "https://login.helsingbuss.se";
  return base.replace(/\/+$/, "") + "/start";
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const {
      offerId,        // UUID i tabellen offers
      offerNumber,    // t.ex. HB25007
      customerEmail,  // mottagare (kund)
      totals,         // (valfritt) summering från kalkylen
      pricing,        // (valfritt) radrader
      input,          // (valfritt) inmatade fält
    } = req.body ?? {};

    if (!offerId || !offerNumber || !customerEmail) {
      return res.status(400).json({ error: "offerId, offerNumber och customerEmail krävs" });
    }

    // Spara kalkyl och markera offerten som besvarad
    const { error: updErr } = await supabase
      .from("offers")
      .update({
        calc_totals: totals ?? null,
        calc_pricing: pricing ?? null,
        calc_input: input ?? null,
        status: "besvarad",
        sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", offerId);

    if (updErr) throw updErr;

    // 1) SKICKA KUNDMEJL (sendOfferMail sköter kund + admin-kopia internt korrekt)
    await sendOfferMail({
      offerId: String(offerId),
      offerNumber: String(offerNumber),
      customerEmail: String(customerEmail),

      // (valfritt) fyll på med inmatning om du vill
      customerName: input?.customer_name ?? input?.contact_person ?? null,
      customerPhone: input?.customer_phone ?? input?.contact_phone ?? null,

      from: input?.departure_place ?? null,
      to: input?.destination ?? null,
      date: input?.departure_date ?? null,
      time: input?.departure_time ?? null,
      passengers:
        typeof input?.passengers === "number"
          ? input.passengers
          : Number.isFinite(Number(input?.passengers))
          ? Number(input?.passengers)
          : null,
      via: input?.via ?? null,
      onboardContact: input?.onboard_contact ?? null,

      return_from: input?.return_departure ?? null,
      return_to: input?.return_destination ?? null,
      return_date: input?.return_date ?? null,
      return_time: input?.return_time ?? null,

      notes: input?.notes ?? null,
    });

    // 2) (VALFRITT) FRISTÅENDE ADMIN-NOTIS – länka ALLTID till /start
    //    OBS: INTE via sendOfferMail (annars risk för kundlayout till admin).
    if (RESEND_KEY && ADMIN_TO) {
      const resend = new Resend(RESEND_KEY);
      const href = adminStartUrl();
      await resend.emails.send({
        from: FROM_PRIMARY,
        to: ADMIN_TO,
        subject: `📤 Offert skickad (${String(offerNumber)})`,
        html: `
          <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#111">
            <p>Prisförslag har skickats till kund.</p>
            <p><strong>Offert:</strong> ${String(offerNumber)}</p>
            <table role="presentation" cellspacing="0" cellpadding="0" style="margin:18px 0 6px">
              <tr><td>
                <a href="${href}" style="display:inline-block;background:#1D2937;color:#fff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:700">
                  Öppna i portalen
                </a>
              </td></tr>
            </table>
          </div>
        `,
        text: `Prisförslag har skickats.\nOffert: ${String(offerNumber)}\nÖppna i portalen: ${href}`,
      } as any);
    }

    return res.status(200).json({ success: true });
  } catch (err: any) {
    console.error("send-proposal error:", err);
    return res.status(500).json({ error: err?.message || "Serverfel" });
  }
}
