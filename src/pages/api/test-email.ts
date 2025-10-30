// src/pages/api/test-email.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const { error } = await resend.emails.send({
      from: process.env.RESEND_FROM || "onboarding@resend.dev",
      to: "offert@helsingbuss.se", // <-- Ã¤ndra till din egen mailadress fÃ¶r test
      subject: "ðŸš Testmail frÃ¥n Helsingbuss Portal",
      html: `<p>Hej! ðŸŽ‰<br/>Detta Ã¤r ett testmail frÃ¥n ditt system.<br/><br/>
      LÃ¤nken till offertsystemet:<br/>
      <a href="${process.env.NEXT_PUBLIC_BASE_URL}/offert/HB25007">
        Visa offert HB25007
      </a></p>`,
    });

    if (error) {
      return res.status(400).json({ error });
    }

    return res.status(200).json({ success: true, message: "Mail skickat!" });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}


