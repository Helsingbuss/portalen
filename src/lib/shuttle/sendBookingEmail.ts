import { Resend } from "resend";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const resend = new Resend(
  process.env.RESEND_API_KEY
);

function money(value: any) {
  return Number(value || 0).toLocaleString(
    "sv-SE",
    {
      style: "currency",
      currency: "SEK",
      maximumFractionDigits: 0,
    }
  );
}

function time(value?: string | null) {
  if (!value) return "—";

  return String(value).slice(0, 5);
}

export async function sendShuttleBookingEmail(
  bookingId: string
) {
  const { data: booking, error } =
    await supabaseAdmin
      .from("shuttle_bookings")
      .select(`
        *,
        shuttle_routes (
          id,
          name,
          route_code
        ),
        shuttle_departures (
          id,
          departure_date,
          departure_time
        )
      `)
      .eq("id", bookingId)
      .single();

  if (error) throw error;

  if (!booking) {
    throw new Error(
      "Bokningen hittades inte."
    );
  }

  const { data: ticket } =
    await supabaseAdmin
      .from("shuttle_tickets")
      .select("*")
      .eq("booking_id", booking.id)
      .maybeSingle();

  const route: any =
    Array.isArray(
      booking.shuttle_routes
    )
      ? booking.shuttle_routes[0]
      : booking.shuttle_routes;

  const departure: any =
    Array.isArray(
      booking.shuttle_departures
    )
      ? booking
          .shuttle_departures[0]
      : booking.shuttle_departures;

  const from =
    process.env
      .SHUTTLE_MAIL_FROM ||
    "Helsingbuss Airport Shuttle <booking@hbshuttle.se>";

  const replyTo =
    process.env
      .SHUTTLE_REPLY_TO ||
    "support@hbshuttle.se";

  const adminEmail =
    process.env
      .SHUTTLE_ADMIN_EMAIL ||
    "info@hbshuttle.se";

  const customerEmail =
    booking.customer_email;

  if (!customerEmail) {
    throw new Error(
      "Kundmail saknas."
    );
  }

  const html = `
  <div style="font-family:Arial,sans-serif;background:#f5f4f0;padding:30px;">
    <div style="max-width:700px;margin:0 auto;background:#ffffff;border-radius:24px;padding:40px;">

      <div style="text-align:center;">
        <h1 style="margin:0;color:#194C66;">
          Helsingbuss Airport Shuttle
        </h1>

        <p style="color:#666;margin-top:10px;">
          Tack för din bokning!
        </p>
      </div>

      <div style="margin-top:35px;padding:20px;background:#f8fafc;border-radius:18px;">
        <h2 style="margin-top:0;color:#194C66;">
          Bokningsinformation
        </h2>

        <p>
          <strong>Bokningsnummer:</strong><br />
          ${booking.booking_number}
        </p>

        <p>
          <strong>Biljettnummer:</strong><br />
          ${ticket?.ticket_number || "—"}
        </p>

        <p>
          <strong>Rutt:</strong><br />
          ${route?.name || "—"}
        </p>

        <p>
          <strong>Datum:</strong><br />
          ${departure?.departure_date || "—"}
        </p>

        <p>
          <strong>Avgångstid:</strong><br />
          ${time(
            departure?.departure_time
          )}
        </p>

        <p>
          <strong>Påstigning:</strong><br />
          ${
            booking.pickup_stop_name ||
            "—"
          }
        </p>

        <p>
          <strong>Antal resenärer:</strong><br />
          ${
            booking.passengers_count ||
            1
          }
        </p>

        <p>
          <strong>Totalt:</strong><br />
          ${money(
            booking.total_amount
          )}
        </p>
      </div>

      <div style="margin-top:30px;padding:20px;background:#ecfdf5;border-radius:18px;color:#166534;">
        Din betalning har registrerats och biljetten är aktiv.
      </div>

      <div style="margin-top:30px;">
        <a
          href="https://hbshuttle.se/shuttle/bekraftelse/${booking.id}"
          style="
            display:inline-block;
            background:#194C66;
            color:#ffffff;
            text-decoration:none;
            padding:14px 24px;
            border-radius:14px;
            font-weight:bold;
          "
        >
          Visa bokning
        </a>
      </div>

      <div style="margin-top:40px;font-size:13px;color:#666;">
        Helsingbuss Airport Shuttle<br />
        hbshuttle.se
      </div>
    </div>
  </div>
  `;

  await resend.emails.send({
    from,
    to: customerEmail,
    reply_to: replyTo,
    subject: `Bokningsbekräftelse ${booking.booking_number}`,
    html,
  });

  await resend.emails.send({
    from,
    to: adminEmail,
    reply_to: replyTo,
    subject: `Ny Airport Shuttle-bokning ${booking.booking_number}`,
    html: `
      <div style="font-family:Arial,sans-serif;">
        <h2>Ny bokning</h2>

        <p>
          <strong>Bokningsnummer:</strong>
          ${booking.booking_number}
        </p>

        <p>
          <strong>Kund:</strong>
          ${booking.customer_name}
        </p>

        <p>
          <strong>E-post:</strong>
          ${booking.customer_email}
        </p>

        <p>
          <strong>Telefon:</strong>
          ${booking.customer_phone}
        </p>

        <p>
          <strong>Belopp:</strong>
          ${money(
            booking.total_amount
          )}
        </p>
      </div>
    `,
  });

  return true;
}
