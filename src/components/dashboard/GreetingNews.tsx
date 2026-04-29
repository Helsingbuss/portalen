// src/components/dashboard/GreetingNews.tsx
import React, { useEffect, useState } from "react";
import { Plane } from "lucide-react";

type Props = {
  name?: string;
  role?: string;
  items?: {
    title: string;
    href: string;
  }[];
  heightClass?: string;
};

export default function AirportShuttleCard({
  name,
  role,
  items,
  heightClass = "h-[320px]",
}: Props) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const i = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(i);
  }, []);

  const departures = ["08:00", "09:30", "11:00", "13:30", "15:00", "17:30"];

  function getNextDeparture() {
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    for (let t of departures) {
      const [h, m] = t.split(":").map(Number);
      const depMinutes = h * 60 + m;

      if (depMinutes >= currentMinutes) {
        return depMinutes - currentMinutes;
      }
    }

    return null;
  }

  const minutesLeft = getNextDeparture();

  function getStatus(mins: number | null) {
    if (mins === null) return null;

    if (mins <= 5) {
      return {
        label: "Avgår nu",
        class: "bg-red-500 text-white",
      };
    }

    if (mins <= 15) {
      return {
        label: "Snart",
        class: "bg-amber-400 text-white",
      };
    }

    return {
      label: "I tid",
      class: "bg-green-500 text-white",
    };
  }

  const status = getStatus(minutesLeft);

  return (
    <div className={`bg-white rounded-2xl shadow p-5 flex flex-col ${heightClass}`}>
      
      {/* HEADER */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-[#111827]">
            Helsingbuss Airport Shuttle
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Tidtabeller och avgångar
          </p>
        </div>

        <div className="w-12 h-12 flex items-center justify-center rounded-xl bg-[#F3F4F6]">
          <Plane className="text-[#194C66]" size={20} />
        </div>
      </div>

      {/* LIVE INFO */}
      <div className="mb-4 space-y-2">

        <div className="flex items-center justify-between">
          <p className="text-sm text-[#374151]">
            Nästa avgång från{" "}
            <span className="font-medium">Helsingborg C</span>
          </p>

          {status && (
            <span className={`px-2 py-1 rounded-full text-xs ${status.class}`}>
              {status.label}
            </span>
          )}
        </div>

        <p className="text-sm">
          {minutesLeft !== null ? (
            <>
              <span className="font-semibold text-[#111827]">
                {minutesLeft} min
              </span>{" "}
              kvar
            </>
          ) : (
            "Inga fler avgångar idag"
          )}
        </p>
      </div>

      {/* LISTA */}
      <div className="flex-1 overflow-y-auto divide-y divide-gray-100 text-sm">

        {departures.map((t, i) => (
          <div key={i} className="py-2 flex justify-between items-center">
            <span className="text-[#111827]">Avgång</span>
            <span className="font-medium">{t}</span>
          </div>
        ))}

      </div>
    </div>
  );
}
