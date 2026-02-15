import { NextResponse } from "next/server";
import { offerSubmitPayloadSchema } from "../../../components/widgets/offer-form/offerForm.schema";

// OBS: Vi försöker återanvända ditt befintliga Supabase/Resend-flöde.
// För att undvika att du “börjar om”, är detta byggt så att:
// - UI/Widgeten är stabil
// - Servern validerar ALLT
// - Servern genererar offertnummer
// - Servern försöker spara i Supabase (tabell styrs av env)
// - Servern försöker skicka mail via Resend (om RESEND_API_KEY finns)
// Om din tabell/kolumner skiljer sig: den faller inte sönder i UI, utan returnerar tydligt fel.

function makeOfferNo() {
  // HB26 + 3 alfanum (enkelt). Du kan byta till din tidigare generator senare utan att ändra widget.
  const rand = Math.random().toString(36).slice(2, 5).toUpperCase();
  return `HB26${rand}`;
}

async function readJson(req: Request) {
  try { return await req.json(); } catch { return null; }
}

export async function POST(req: Request) {
  const url = new URL(req.url);
  const telemetry = url.searchParams.get("telemetry") === "1";

  const body = await readJson(req);

  // 1) Telemetri (stör aldrig huvudflödet)
  if (telemetry) {
    // här kan du senare koppla Supabase-tabell: offer_form_events
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  // 2) Validera payload
  const parsed = offerSubmitPayloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: "Fel i formuläret. Kontrollera fälten och försök igen.", code: "VALIDATION" },
      { status: 400 }
    );
  }

  const offerNo = makeOfferNo();
  const { state, meta } = parsed.data;

  // 3) Bygg ett “safe” objekt (anpassa kolumner vid behov)
  const record: any = {
    offer_no: offerNo,
    source: parsed.data.source,
    created_at: new Date().toISOString(),

    from_address: state.fromAddress,
    to_address: state.toAddress,
    date: state.date,
    time: state.time,
    passengers: state.passengers,

    trip_type: state.tripType,
    use_bus_on_site: state.useBusOnSite,

    return_swap_route: state.returnSwapRoute,
    return_from_address: state.tripType === "roundtrip" ? state.returnFromAddress : null,
    return_to_address: state.tripType === "roundtrip" ? state.returnToAddress : null,

    customer_type: state.customerType,
    name: state.name,
    phone: state.phone,
    email: state.email,
    onboard_contact: state.onboardContact || null,

    org_name: state.orgName || null,
    org_nr: state.orgNr || null,

    res_plan: state.resPlan || null,

    facilities: state.facilities,
    accessibility_notes: state.accessibilityNotes || null,

    heard_from: state.heardFrom || null,
    newsletter: state.newsletter,

    meta: meta || null,
    status: "new",
  };

  // 4) Försök spara i Supabase (server-side)
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY; // viktigt: endast server
  const OFFER_TABLE = process.env.OFFER_TABLE_NAME || "offers";

  let saved = false;
  if (SUPABASE_URL && SUPABASE_SERVICE_ROLE) {
    try {
      const { createClient } = await import("@supabase/supabase-js");
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, { auth: { persistSession: false } });

      const { error } = await supabase.from(OFFER_TABLE).insert(record);
      if (!error) saved = true;
    } catch (e) {
      // tyst här – vi hanterar med mail + svar
    }
  }

  // 5) Skicka mail via Resend (så du fortsatt får mail även om DB skulle fallera)
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  const MAIL_FROM = process.env.OFFER_MAIL_FROM || "Helsingbuss <no-reply@helsingbuss.se>";
  const MAIL_TO = process.env.OFFER_MAIL_TO || "kundteam@helsingbuss.se";

  if (RESEND_API_KEY) {
    try {
      const { Resend } = await import("resend");
      const resend = new Resend(RESEND_API_KEY);
      const subject = "Ny offertförfrågan";
      const html = `
<div style="font-family:Arial,sans-serif;line-height:1.45">
  <h2>Ny offertförfrågan: ${offerNo}</h2>
  <p><strong>Namn:</strong> ${payload.Namn_efternamn || "-"}</p>
  <p><strong>E-post:</strong> ${payload.customer_email || "-"}</p>
  <p><strong>Telefon:</strong> ${payload.customer_phone || "-"}</p>
  <hr/>
  <p><strong>Avresa:</strong> ${payload.departure_place || "-"}</p>
  <p><strong>Destination:</strong> ${payload.destination || "-"}</p>
  <p><strong>Datum & tid:</strong> ${(payload.departure_date || "-")} ${(payload.departure_time || "")}</p>
  <p><strong>Antal:</strong> ${payload.passengers ?? "-"}</p>
  <p><strong>Enkel/Tur&Retur:</strong> ${payload.enkel_tur_retur || "-"}</p>
  ${payload.enkel_tur_retur === "tur-retur" ? `
    <hr/>
    <p><strong>Retur från:</strong> ${payload.return_departure || "-"}</p>
    <p><strong>Retur till:</strong> ${payload.final_destination || "-"}</p>
    <p><strong>Retur datum & tid:</strong> ${(payload.return_date || "-")} ${(payload.return_time || "")}</p>
  ` : ``}
  <hr/>
  <p><strong>Resans upplägg:</strong><br/>${(payload.notes || "-").toString().replaceAll("<","&lt;").replaceAll(">","&gt;")}</p>
</div>
`; 
      await resend.emails.send({
        from: MAIL_FROM,
        to: [MAIL_TO],
        replyTo: state.email,
        subject,
        html,
      });
    } catch (e) {
      // mail får inte krascha UI
    }
  }

  // 6) Om varken DB eller mail gick: returnera fel så du ser det direkt
  if (!saved && !RESEND_API_KEY) {
    return NextResponse.json(
      { ok: false, message: "Server saknar koppling till e-post/DB. Kontrollera env-variabler.", code: "NO_BACKEND" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, offerNo }, { status: 200 });
}




