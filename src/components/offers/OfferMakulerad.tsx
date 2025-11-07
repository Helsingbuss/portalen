// src/components/offers/OfferMakulerad.tsx
import Image from "next/image";
import StatusBadge from "@/components/StatusBadge";

type Trip = {
  title: string;
  date?: string | null;
  time?: string | null;
  from?: string | null;
  to?: string | null;
  pax?: number | null;
  extra?: string | null;
};

export default function OfferMakulerad({ offer }: any) {
  const roundTrip = Boolean(offer?.round_trip);
  const withinSweden = (offer?.trip_type || "sverige") !== "utrikes";

  const trips: Trip[] = [
    {
      title: roundTrip ? "Utresa" : "Bussresa",
      date: offer?.departure_date,
      time: offer?.departure_time,
      from: offer?.departure_place,
      to: offer?.destination,
      pax: offer?.passengers,
      extra: offer?.notes,
    },
    ...(roundTrip
      ? [
          {
            title: "Ã…terresa",
            date: offer?.return_date,
            time: offer?.return_time,
            from: offer?.destination,
            to: offer?.departure_place,
            pax: offer?.passengers,
            extra: offer?.notes,
          },
        ]
      : []),
  ];

  return (
    <div className="min-h-screen bg-[#f5f4f0] py-6">
      <div className="mx-auto w-full max-w-4xl bg-white rounded-lg shadow px-6 py-6">
        {/* Header-rad: logga + status */}
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
            <StatusBadge status="makulerad" />
          </div>
        </div>

        {/* Titel */}
        <h1 className="mt-2 text-2xl font-semibold text-[#0f172a]">
          OffertfÃ¶rfrÃ¥gan Ã¤r makulerad â€“ vi hoppas fÃ¥ kÃ¶ra fÃ¶r dig vid ett annat tillfÃ¤lle.
        </h1>

        {/* FÃ¶rklarande text */}
        <div className="mt-4 text-[15px] leading-relaxed text-[#0f172a]/80">
          Den hÃ¤r offerten Ã¤r inte lÃ¤ngre giltig. Nedan ser du de tidigare
          uppgifterna (Ã¶verstrukna).
        </div>

        {/* Ã–vre kort â€“ Offertinfo & Kundinfo (Ã¶verstruket) */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border rounded-lg p-4 line-through opacity-60">
            <div className="flex items-baseline gap-2">
              <span className="text-sm text-[#0f172a]/70 font-semibold">Offertnummer</span>
              <span className="text-[#0f172a]">{offer?.offer_number || "â€”"}</span>
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-sm text-[#0f172a]/70 font-semibold">Offertdatum</span>
              <span className="text-[#0f172a]">{offer?.offer_date || "â€”"}</span>
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-sm text-[#0f172a]/70 font-semibold">Er referens</span>
              <span className="text-[#0f172a]">{offer?.customer_reference || "â€”"}</span>
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-sm text-[#0f172a]/70 font-semibold">VÃ¥r referens</span>
              <span className="text-[#0f172a]">{offer?.internal_reference || "â€”"}</span>
            </div>
          </div>

          <div className="border rounded-lg p-4 line-through opacity-60">
            <div className="grid grid-cols-[80px_1fr] gap-x-2 text-sm">
              <div className="text-[#0f172a]/70 font-semibold">Namn</div>
              <div className="text-[#0f172a]">{offer?.contact_person || "â€”"}</div>

              <div className="text-[#0f172a]/70 font-semibold">Adress</div>
              <div className="text-[#0f172a]">{offer?.customer_address || "â€”"}</div>

              <div className="text-[#0f172a]/70 font-semibold">Telefon</div>
              <div className="text-[#0f172a]">{offer?.contact_phone || "â€”"}</div>

              <div className="text-[#0f172a]/70 font-semibold">E-post</div>
              <div className="text-[#0f172a] break-all">{offer?.contact_email || "â€”"}</div>
            </div>
          </div>
        </div>

        {/* Reseinformation â€“ tvÃ¥ rutor, Ã¶verstruket */}
        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          {trips.map((t, i) => (
            <div key={i}>
              <div className="flex items-center gap-2 text-[#0f172a] mb-2">
                <Image src="/maps_pin.png" alt="Pin" width={18} height={18} />
                <span className="font-semibold">
                  {withinSweden ? "Bussresa inom Sverige" : "Bussresa utomlands"}
                </span>
                <span className="text-xs text-[#0f172a]/50 ml-2">
                  (tidigare uppgifter)
                </span>
              </div>

              <div className="border rounded-lg p-3 text-[14px] text-[#0f172a] leading-[1.5] line-through opacity-60">
                <div>
                  <span className="font-semibold">AvgÃ¥ng:</span> {t.date || "â€”"} kl {t.time || "â€”"}
                </div>
                <div>
                  <span className="font-semibold">FrÃ¥n:</span> {t.from || "â€”"}
                </div>
                <div>
                  <span className="font-semibold">Till:</span> {t.to || "â€”"}
                </div>
                <div>
                  <span className="font-semibold">Antal passagerare:</span> {t.pax ?? "â€”"}
                </div>
                {t.extra ? (
                  <div className="mt-1">
                    <span className="font-semibold">Ã–vrig information:</span>{" "}
                    <span className="whitespace-pre-wrap">{t.extra}</span>
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>

        {/* Info-rad / footer */}
        <div className="mt-7 text-[13px] text-[#0f172a]/70 leading-relaxed">
          Har du ny fÃ¶rfrÃ¥gan, frÃ¥gor eller vill boka vid ett annat datum?
          Kontakta oss sÃ¥ hjÃ¤lper vi gÃ¤rna till: <strong>010-405 38 38</strong> (vardagar 08:00â€“17:00) eller
          jour <strong>010-777 21 58</strong>.
        </div>
      </div>
    </div>
  );
}

