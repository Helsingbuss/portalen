import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendPaymentEmail({
  email,
  name,
  link,
  product,
  date,
  type,
}: {
  email: string;
  name: string;
  link: string;
  product: string;
  date?: string;
  type?: string;
}) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

    const logo =
      type === "flygbuss"
        ? `${baseUrl}/airport_shuttle-logo.png`
        : `${baseUrl}/mork_logo.png`;

    const brandName =
      type === "flygbuss"
        ? "Helsingbuss Airport Shuttle"
        : "Helsingbuss";

    await resend.emails.send({
      from: "Helsingbuss <info@helsingbuss.se>",
      to: email,
      subject: "Din bokning – slutför betalning",
      html: `
        <div style="font-family: Arial; background:#f5f4f0; padding:20px;">

          <div style="max-width:500px;margin:auto;background:#fff;border-radius:12px;overflow:hidden;">

            <!-- HEADER -->
            <div style="background:#194C66;color:white;padding:16px;text-align:center;">

              <img src="${logo}" style="height:40px;margin-bottom:10px;" />

              <h2 style="margin:0;">${brandName}</h2>
              <p style="margin:0;font-size:12px;opacity:0.8;">
                Din bokning
              </p>

            </div>

            <!-- CONTENT -->
            <div style="padding:20px;">

              <h3>Hej ${name}!</h3>

              <p>Tack för din bokning hos <strong>${brandName}</strong>.</p>

              <div style="background:#f9f9f9;padding:12px;border-radius:8px;margin:15px 0;">
                <strong>${product}</strong>
                ${
                  date
                    ? `<p style="margin:5px 0;color:#666;">Datum: ${date}</p>`
                    : ""
                }
              </div>

              <p>Slutför betalningen nedan:</p>

              <div style="text-align:center;margin:20px 0;">
                <a href="${link}" style="
                  padding:14px 24px;
                  background:#194C66;
                  color:white;
                  text-decoration:none;
                  border-radius:999px;
                  font-weight:600;
                ">
                  Betala nu
                </a>
              </div>

              <p style="font-size:13px;color:#666;">
                Efter betalning får du din biljett direkt via e-post.
              </p>

            </div>

            <!-- FOOTER -->
            <div style="background:#f5f5f5;padding:12px;text-align:center;font-size:12px;color:#888;">
              ${brandName}
            </div>

          </div>

        </div>
      `,
    });

    console.log("📧 Mail skickat:", email);

  } catch (error) {
    console.error("❌ Mail error:", error);
  }
}
