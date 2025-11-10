// src/pages/bokning/[number].tsx
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import Image from "next/image";

type Booking = {
  id: string;
  booking_number: string;     // t.ex. "BK259153"
  passengers: number | null;

  // kund
  contact_person: string | null;
  customer_email: string | null;
  customer_phone: string | null;

  // utresa
  departure_place: string | null;
  destination: string | null;
  departure_date: string | null; // YYYY-MM-DD
  departure_time: string | null; // HH:MM
  end_time?: string | null;
  on_site_minutes?: number | null;
  stopover_places?: string | null;

  // retur (om finns i API)
  return_departure?: string | null;
  return_destination?: string | null;
  return_date?: string | null;
  return_time?: string | null;
  return_end_time?: string | null;
  return_on_site_minutes?: number | null;

  // övrigt
  notes: string | null;
};

function v(x: any, fallback = "—") {
  if (x === null || x === undefined || x === "") return fallback;
  return String(x);
}

function fmtDate(d?: string | null) {
  if (!d) return "—";
  const dt = new Date(`${d}T00:00:00`);
  if (isNaN(dt.getTime())) return v(d);
  return new Intl.DateTimeFormat("sv-SE", { dateStyle: "long" }).format(dt);
}

function fmtTime(t?: string | null) {
  if (!t) return "—";
  const base = (t.length >= 5 ? t.slice(0, 5) : t);
  const dt = new Date(`1970-01-01T${base}:00`);
  if (isNaN(dt.getTime())) return v(t);
  return new Intl.DateTimeFormat("sv-SE", { timeStyle: "short" }).format(dt);
}

function buildICS(b: Booking) {
  // Skapar en enkel .ics med 1–2 VEVENT (utresa + ev. retur)
  const esc = (s: string) => s.replace(/([,;])/g, "\\$1").replace(/\n/g, "\\n");
  const asDT = (d?: string | null, t?: string | null) => {
    if (!d) return "";
    const dd = d.replace(/-/g, "");
    const tt = (t || "00:00").slice(0, 5).replace(":", "") + "00";
    return `${dd}T${tt}`;
  };

  const uid = (suffix: string) => `${b.booking_number || "HB"}-${suffix}@helsingbuss.se`;
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Helsingbuss//Bokning//SV",
  ];

  // Utresa
  const dtStart1 = asDT(b.departure_date, b.departure_time);
  const dtEnd1 = asDT(b.departure_date, b.end_time || b.departure_time);
  lines.push(
    "BEGIN:VEVENT",
    `UID:${uid("out")}`,
    `SUMMARY:${esc("Helsingbuss – Utresa")}`,
    `DTSTART:${dtStart1}`,
    dtEnd1 ? `DTEND:${dtEnd1}` : `DTEND:${dtStart1}`,
    `LOCATION:${esc(`${v(b.departure_place, "-")} → ${v(b.destination, "-")}`)}`,
    `DESCRIPTION:${esc(
      `Bokning: ${v(b.booking_number)}\\nPassagerare: ${v(b.passengers)}\\nKontakt: ${v(b.contact_person)} (${v(b.customer_phone)})`
    )}`,
    "END:VEVENT"
  );

  // Retur (om finns)
  if (b.return_date || b.return_time || b.return_departure || b.return_destination) {
    const dtStart2 = asDT(b.return_date || b.departure_date, b.return_time || b.departure_time);
    const dtEnd2 = asDT(b.return_date || b.departure_date, b.return_end_time || b.return_time || b.departure_time);
    lines.push(
      "BEGIN:VEVENT",
      `UID:${uid("ret")}`,
      `SUMMARY:${esc("Helsingbuss – Retur")}`,
      `DTSTART:${dtStart2}`,
      dtEnd2 ? `DTEND:${dtEnd2}` : `DTEND:${dtStart2}`,
      `LOCATION:${esc(`${v(b.return_departure, "-")} → ${v(b.return_destination, "-")}`)}`,
      `DESCRIPTION:${esc(`Bokning: ${v(b.booking_number)}`)}`,
      "END:VEVENT"
    );
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

export default function BookingPublicPage() {
  const router = useRouter();
  const { number } = router.query as { number?: string };

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [booking, setBooking] = useState<Booking | null>(null);

  useEffect(() => {
    if (!number) return;
    (async () => {
      try {
        setLoading(true);
        setErr(null);
        const u = new URL("/api/bookings/by-number", window.location.origin);
        u.searchParams.set("no", String(number));
        const res = await fetch(u.toString());
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const j = await res.json();
        setBooking(j?.booking ?? null);
        if (!j?.booking) setErr("Kunde inte läsa bokningen.");
      } catch (e: any) {
        setErr(e?.message || "Kunde inte läsa bokningen.");
        setBooking(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [number]);

  // Memoiserad ICS-länk
  const icsHref = useMemo(() => {
    if (!booking) return null;
    const ics = buildICS(booking);
    return `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`;
  }, [booking]);

  const hasReturn =
    !!(booking?.return_departure ||
       booking?.return_destination ||
       booking?.return_date ||
       booking?.return_time);

  return (
    <div className="min-h-screen bg-[#f5f4f0] py-8">
      <div className="mx-auto w-full max-w-3xl bg-white rounded-lg shadow px-6 py-6">
        {/* Logga + actions */}
        <div className="flex items-center justify-between mb-3">
          <Image src="/mork_logo.png" alt="Helsingbuss" width={260} height={46} priority />
          <div className="flex gap-2">
            {icsHref && (
              <a
                href={icsHref}
                download={`Helsingbuss-${booking?.booking_number || "bokning"}.ics`}
                className="px-3 py-2 text-sm border rounded"
              >
                Lägg till i kalendern
              </a>
            )}
            <button
              onClick={() => window.print()}
              className="px-3 py-2 text-sm border rounded"
            >
              Skriv ut
            </button>
          </div>
        </div>

        <h1 className="text-2xl font-semibold text-[#0f172a] mb-3">Bokningsbekräftelse</h1>

        {loading && (
          <div
            className="rounded bg-[#f8fafc] border border-[#e5e7eb] p-3 text-[#194C66]/70"
            role="status"
            aria-live="polite"
          >
            Laddar…
          </div>
        )}

        {!loading && err && (
          <div
            className="rounded bg-red-50 border border-red-200 p-3 text-red-700"
            role="alert"
            aria-live="assertive"
          >
            {err}
          </div>
        )}

        {!loading && !err && booking && (
          <>
            {/* Övre kort – order + kund */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Order */}
              <div className="border rounded-lg p-4">
                <div className="text-sm text-[#0f172a]/60 mb-1">Order</div>
                <div className="text-[#0f172a] space-y-1">
                  <div>
                    <span className="font-semibold">Ordernummer (Boknings-ID):</span>{" "}
                    {v(booking.booking_number)}
                  </div>
                  <div>
                    <span className="font-semibold">Passagerare:</span>{" "}
                    {v(booking.passengers)}
                  </div>
                </div>
              </div>

              {/* Kund */}
              <div className="border rounded-lg p-4">
                <div className="text-sm text-[#0f172a]/60 mb-1">Kund</div>
                <div className="text-[#0f172a] space-y-1">
                  <div>
                    <span className="font-semibold">Kontakt:</span>{" "}
                    {v(booking.contact_person)}
                  </div>
                  <div>
                    <span className="font-semibold">E-post:</span>{" "}
                    {v(booking.customer_email)}
                  </div>
                  <div>
                    <span className="font-semibold">Telefon:</span>{" "}
                    {booking.customer_phone ? (
                      <a className="underline" href={`tel:${booking.customer_phone}`}>
                        {booking.customer_phone}
                      </a>
                    ) : (
                      "—"
                    )}
                  </div>
                </div>
              </div>

              {/* Utresa */}
              <div className="border rounded-lg p-4">
                <div className="text-sm text-[#0f172a]/60 mb-1">Utresa</div>
                <div className="text-[#0f172a] space-y-1">
                  <div>
                    <span className="font-semibold">Datum:</span>{" "}
                    {fmtDate(booking.departure_date)}
                  </div>
                  <div>
                    <span className="font-semibold">Tid:</span>{" "}
                    {fmtTime(booking.departure_time)}
                  </div>
                  {typeof booking.on_site_minutes === "number" && (
                    <div>
                      <span className="font-semibold">På plats:</span>{" "}
                      {booking.on_site_minutes} min före
                    </div>
                  )}
                  <div>
                    <span className="font-semibold">Från:</span>{" "}
                    {v(booking.departure_place)}
                  </div>
                  {booking.stopover_places && (
                    <div>
                      <span className="font-semibold">Via:</span>{" "}
                      {v(booking.stopover_places)}
                    </div>
                  )}
                  <div>
                    <span className="font-semibold">Till:</span>{" "}
                    {v(booking.destination)}
                  </div>
                </div>
              </div>

              {/* Retur (visas om uppgifter finns) */}
              {hasReturn && (
                <div className="border rounded-lg p-4">
                  <div className="text-sm text-[#0f172a]/60 mb-1">Retur</div>
                  <div className="text-[#0f172a] space-y-1">
                    <div>
                      <span className="font-semibold">Datum:</span>{" "}
                      {fmtDate(booking.return_date || booking.departure_date)}
                    </div>
                    <div>
                      <span className="font-semibold">Tid:</span>{" "}
                      {fmtTime(booking.return_time || booking.departure_time)}
                    </div>
                    {typeof booking.return_on_site_minutes === "number" && (
                      <div>
                        <span className="font-semibold">På plats:</span>{" "}
                        {booking.return_on_site_minutes} min före
                      </div>
                    )}
                    <div>
                      <span className="font-semibold">Från:</span>{" "}
                      {v(booking.return_departure || "")}
                    </div>
                    <div>
                      <span className="font-semibold">Till:</span>{" "}
                      {v(booking.return_destination || "")}
                    </div>
                  </div>
                </div>
              )}

              {/* Övrigt */}
              {booking.notes && (
                <div className="border rounded-lg p-4 md:col-span-2">
                  <div className="text-sm text-[#0f172a]/60 mb-1">Övrig information</div>
                  <div className="text-[#0f172a] whitespace-pre-wrap">
                    {booking.notes}
                  </div>
                </div>
              )}
            </div>

            {/* Footer-info / kontakt */}
            <div className="mt-6 text-[14px] text-[#0f172a]/80">
              <p>
                Bekräftelsen avser ovanstående uppgifter. Ändringar bekräftas skriftligt
                av oss. Frågor inför resan? Vardagar kl. 08:00–17:00 på{" "}
                <a className="underline" href="mailto:kundteam@helsingbuss.se">
                  kundteam@helsingbuss.se
                </a>{" "}
                eller jour <strong>010–777 21 58</strong>.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
