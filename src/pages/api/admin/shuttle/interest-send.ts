import type { NextApiRequest, NextApiResponse } from "next";
import { Resend } from "resend";

type SendRequest = {
  mode?: "test" | "selected";
  testEmail?: string;
  recipients?: string[];
  subject?: string;
  previewText?: string;
  emailTitle?: string;
  emailBody?: string;
  buttonText?: string;
  buttonLink?: string;
};

function isEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function buildHtml(input: {
  previewText: string;
  emailTitle: string;
  emailBody: string;
  buttonText: string;
  buttonLink: string;
}) {
  const previewText = escapeHtml(input.previewText);
  const emailTitle = escapeHtml(input.emailTitle);
  const buttonText = escapeHtml(input.buttonText);
  const buttonLink = escapeHtml(input.buttonLink);

  const bodyHtml = input.emailBody
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      return `<p style="margin:0 0 15px;color:#334155;font-size:15px;line-height:1.7;">${escapeHtml(line)}</p>`;
    })
    .join("");

  return `
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${emailTitle}</title>
  </head>

  <body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
      ${previewText}
    </div>

    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 12px;">
      <tr>
        <td align="center">
          <table width="100%" cellpadding="0" cellspacing="0" style="max-width:660px;background:#ffffff;border-radius:24px;overflow:hidden;border:1px solid #e2e8f0;">
            <tr>
              <td style="background:#06292f;padding:34px 32px;color:#ffffff;">
                <div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#a7f3d0;font-weight:bold;">
                  Helsingbuss Airport Shuttle
                </div>

                <h1 style="margin:14px 0 0;font-size:28px;line-height:1.25;color:#ffffff;">
                  ${emailTitle}
                </h1>

                <p style="margin:12px 0 0;color:#d1fae5;font-size:15px;line-height:1.6;">
                  ${previewText}
                </p>
              </td>
            </tr>

            <tr>
              <td style="padding:34px 32px;">
                ${bodyHtml}

                <div style="margin-top:28px;">
                  <a href="${buttonLink}" style="display:inline-block;background:#007764;color:#ffffff;text-decoration:none;padding:14px 24px;border-radius:14px;font-size:15px;font-weight:bold;">
                    ${buttonText}
                  </a>
                </div>

                <p style="margin:32px 0 0;color:#64748b;font-size:12px;line-height:1.6;">
                  Du får detta mail eftersom du har anmält intresse för Helsingbuss Airport Shuttle.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.RESEND_API_KEY || "";

  if (!apiKey) {
    return res.status(500).json({ error: "RESEND_API_KEY saknas." });
  }

  const from =
    process.env.RESEND_FROM_FALLBACK ||
    process.env.RESEND_FROM_ADMIN ||
    process.env.RESEND_FROM_INFO ||
    "Helsingbuss <info@helsingbuss.se>";

  const body = req.body as SendRequest;

  const subject = String(body.subject || "").trim();
  const previewText = String(body.previewText || "").trim();
  const emailTitle = String(body.emailTitle || "").trim();
  const emailBody = String(body.emailBody || "").trim();
  const buttonText = String(body.buttonText || "Boka nu").trim();
  const buttonLink = String(body.buttonLink || "https://hbshuttle.se/start").trim();

  if (!subject || !emailTitle || !emailBody) {
    return res.status(400).json({
      error: "Ämne, rubrik och meddelande krävs.",
    });
  }

  const recipients =
    body.mode === "test"
      ? [String(body.testEmail || "").trim().toLowerCase()]
      : Array.isArray(body.recipients)
        ? body.recipients.map((email) => String(email).trim().toLowerCase())
        : [];

  const validRecipients = Array.from(new Set(recipients.filter(isEmail)));

  if (validRecipients.length === 0) {
    return res.status(400).json({
      error: "Välj minst en giltig mottagare.",
    });
  }

  const resend = new Resend(apiKey);

  const html = buildHtml({
    previewText,
    emailTitle,
    emailBody,
    buttonText,
    buttonLink,
  });

  let sent = 0;

  for (const to of validRecipients) {
    const result = await resend.emails.send({
      from,
      to,
      subject,
      html,
    });

    if ((result as any)?.error) {
      return res.status(500).json({
        error: `Kunde inte skicka till ${to}`,
        details: (result as any).error,
      });
    }

    sent += 1;
  }

  return res.status(200).json({
    ok: true,
    sent,
  });
}
