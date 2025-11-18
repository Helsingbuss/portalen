// src/components/bookings/BookingBekraftelse.tsx
import Image from "next/image";
import StatusBadge from "@/components/StatusBadge";

type TripLeg = {
  date?: string | null;
  time?: string | null;
  from?: string | null;
  to?: string | null;
  pax?: number | null;
  onSite?: number | null;
  endTime?: string | null;
  extra?: string | null;
  driver?: string | null;
  driverPhone?: string | null;
  vehicleReg?: string | null;
  vehicleModel?: string | null;
};

function v(x: any, fallback = "â€”") {
  if (x === null || x === undefined || x === "") return fallback;
  return String(x);
}

export default function BookingBekraftelse({ booking }: { booking: any }) {
  // rubriker
  const bookingNo = v(booking?.booking_number ?? booking?.booking_id, "BK25XXXX");

  // fÃ¶rsta benet
  const out: TripLeg = {
    date: v(booking?.departure_date),
    time: v(booking?.departure_time),
    from: v(booking?.departure_place),
    to: v(booking?.destination),
    pax: booking?.passengers ?? null,
    onSite: booking?.on_site_minutes ?? null,
    endTime: v(booking?.end_time, "â€”"),
    extra: v(booking?.notes, "Ingen information."),
    driver: v(booking?.driver_name, ""),
    driverPhone: v(booking?.driver_phone, ""),
    vehicleReg: v(booking?.vehicle_reg, ""),
    vehicleModel: v(booking?.vehicle_model, ""),
  };

  // retur vid behov
  const hasReturn =
    booking?.return_date ||
    booking?.return_time ||
    booking?.return_departure ||
    booking?.return_destination;

  const ret: TripLeg | null = hasReturn
    ? {
        date: v(booking?.return_date),
        time: v(booking?.return_time),
        from: v(booking?.return_departure || booking?.destination),
        to: v(booking?.return_destination || booking?.departure_place),
        pax: booking?.passengers ?? null,
        onSite: booking?.return_on_site_minutes ?? booking?.on_site_minutes ?? null,
        endTime: v(booking?.return_end_time || booking?.end_time, "â€”"),
        extra: v(booking?.notes, "Ingen information."),
        driver: v(booking?.return_driver_name || booking?.driver_name, ""),
        driverPhone: v(booking?.return_driver_phone || booking?.driver_phone, ""),
        vehicleReg: v(booking?.return_vehicle_reg || booking?.vehicle_reg, ""),
        vehicleModel: v(booking?.return_vehicle_model || booking?.vehicle_model, ""),
      }
    : null;

  const trips = ret ? [out, ret] : [out];

  return (
    <div className="min-h-screen bg-[#f5f4f0] py-6">
      <div className="mx-auto w-full max-w-4xl bg-white rounded-lg shadow px-6 py-6">
        {/* Header-rad */}
        <div className="flex items-start justify-between">
          <div className="flex items-center">
            <Image
              src="/mork_logo.png"
              alt="Helsingbuss"
              width={360}
              height={64}
              priority
            />
          </div>
          <div className="pt-1 text-right">
            {/* anvÃ¤nd en status som StatusBadge accepterar */}
            <StatusBadge status="godkand" />
          </div>
        </div>

        {/* Titel */}
        <h1 className="mt-2 text-2xl font-semibold text-[#0f172a]">
          BokningsbekrÃ¤ftelse
        </h1>

        {/* Ã–vre kort â€“ order och kund */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border rounded-lg p-4">
            <div className="text-sm text-[#0f172a]/70 mb-1">Order</div>
            <div className="text-[#0f172a]">
              <div>
                <span className="font-semibold">Ordernummer (Boknings ID):</span> {bookingNo}
              </div>
              <div>
                <span className="font-semibold">Passagerare:</span>{" "}
                {booking?.passengers ?? "â€”"}
              </div>
            </div>
          </div>

          <div className="border rounded-lg p-4">
            <div className="text-sm text-[#0f172a]/70 mb-1">Kund</div>
            <div className="text-[#0f172a]">
              <div>
                <span className="font-semibold">Kontakt:</span>{" "}
                {v(booking?.contact_person)}
              </div>
              <div>
                <span className="font-semibold">E-post:</span>{" "}
                {v(booking?.customer_email)}
              </div>
              <div>
                <span className="font-semibold">Telefon:</span>{" "}
                {v(booking?.customer_phone)}
              </div>
            </div>
          </div>
        </div>

        {/* Reseavsnitt */}
        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          {trips.map((t, idx) => (
            <div key={idx}>
              <div className="flex items-center gap-2 text-[#0f172a] mb-2">
                <Image src="/maps_pin.png" alt="Pin" width={18} height={18} />
                <span className="font-semibold">
                  {idx === 0 ? "Utresa" : "Retur"}
                </span>
                <span className="text-xs text-[#0f172a]/50 ml-2">
                  AvstÃ¥nd och tider baseras preliminÃ¤rt
                </span>
              </div>

              <div className="border rounded-lg p-3 text-[14px] text-[#0f172a] leading-[1.5]">
                <div>
                  <span className="font-semibold">AvgÃ¥ng:</span> {t.date} kl {t.time}
                </div>
                <div>
                  <span className="font-semibold">FrÃ¥n:</span> {t.from}
                </div>
                <div>
                  <span className="font-semibold">Till:</span> {t.to}
                </div>
                <div>
                  <span className="font-semibold">Antal passagerare:</span>{" "}
                  {t.pax ?? "â€”"}
                </div>

                <div className="mt-2">
                  <span className="font-semibold">PÃ¥ plats:</span>{" "}
                  {t.onSite != null ? `${t.onSite} min fÃ¶re` : "â€”"}
                </div>
                <div>
                  <span className="font-semibold">Sluttid:</span> {t.endTime}
                </div>

                {(t.driver || t.driverPhone) && (
                  <div className="mt-2">
                    <span className="font-semibold">ChauffÃ¶r:</span>{" "}
                    {[t.driver, t.driverPhone].filter(Boolean).join(", ") || "â€”"}
                  </div>
                )}
                {(t.vehicleReg || t.vehicleModel) && (
                  <div>
                    <span className="font-semibold">Fordon:</span>{" "}
                    {[t.vehicleReg, t.vehicleModel].filter(Boolean).join(" â€“ ") || "â€”"}
                  </div>
                )}

                <div className="mt-2">
                  <span className="font-semibold">Ã–vrig information:</span>{" "}
                  <span className="whitespace-pre-wrap">{t.extra}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer-info/kontakt */}
        <div className="mt-5 border rounded-lg p-4 bg-[#f8fafc]">
          <div className="text-[#0f172a]/90">
            FrÃ¥gor om din resa? Ring vÃ¥rt Kundteam under vardagar 8â€“17:
            <strong> 010-405 38 38</strong>, eller besvara detta mail.
            <br />
            Vid akuta trafikÃ¤renden efter kontorstid nÃ¥r du vÃ¥r jour pÃ¥
            <strong> 010-777 21 58</strong>.
          </div>
        </div>
      </div>
    </div>
  );
}

